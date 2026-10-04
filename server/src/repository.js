import { pool } from './db.js';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, YEARS } from './config.js';
import { buildIndicators, rank } from './scoring.js';

export async function getYearlyData() {
  const { rows } = await pool.query(`
    SELECT p.province_id, p.name_th, p.name_en, p.is_ranked,
           v.year_ad, COALESCE(v.arrival, 0) AS arrival,
           COALESCE(v.departure, 0) AS departure, COALESCE(v.total, 0) AS total
    FROM province p
    LEFT JOIN v_province_year v USING (province_id)
    ORDER BY p.province_id, v.year_ad
  `);
  return rows;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export async function calculateIndicators() {
  const [yearly, categories] = await Promise.all([
    getYearlyData(),
    pool.query(`
      SELECT tr.province_id, tr.goods_category_id, SUM(tr.total_weight_ton) AS weight
      FROM trade_record tr
      JOIN province p USING (province_id)
      WHERE p.is_ranked = TRUE
      GROUP BY tr.province_id, tr.goods_category_id
    `).then((result) => result.rows),
  ]);
  const indicators = buildIndicators(yearly, categories);
  const growthValues = indicators.map((row) => row.growth);
  const lower = percentile(growthValues, 0.05);
  const upper = percentile(growthValues, 0.95);
  const winsorized = indicators.map((row) => ({ ...row, growth: Math.max(lower, Math.min(upper, row.growth)) }));
  const growthScores = winsorized.map((row) => row.growth);
  const min = Math.min(...growthScores);
  const max = Math.max(...growthScores);
  return winsorized.map((row) => ({ ...row, G: max === min ? 50 : ((row.growth - min) / (max - min)) * 100 }));
}

export async function getRanking(weights = DEFAULT_WEIGHTS, thresholds = DEFAULT_THRESHOLDS) {
  return rank(await calculateIndicators(), weights, thresholds);
}

export async function getOverview() {
  const { rows } = await pool.query(`
    SELECT year_ad,
           SUM(arrival) AS arrival,
           SUM(departure) AS departure,
           SUM(total) AS total,
           SUM(total) FILTER (WHERE name_en IN ('Chon Buri', 'Rayong')) AS chonburi_rayong
    FROM (
      SELECT p.name_en, v.year_ad,
             COALESCE(v.arrival, 0) AS arrival,
             COALESCE(v.departure, 0) AS departure,
             COALESCE(v.total, 0) AS total
      FROM province p JOIN v_province_year v USING (province_id)
    ) yearly
    GROUP BY year_ad ORDER BY year_ad
  `);
  const annual = rows.map((row) => ({
    year_ad: Number(row.year_ad),
    year_be: Number(row.year_ad) + 543,
    arrival: Number(row.arrival),
    departure: Number(row.departure),
    total: Number(row.total),
    chonburi_rayong: Number(row.chonburi_rayong || 0),
    chonburi_rayong_share: Number(row.total) ? Number(row.chonburi_rayong || 0) / Number(row.total) * 100 : 0,
  }));
  const first = annual[0];
  const latest = annual.at(-1);
  return {
    annual,
    latest_year: latest?.year_ad ?? null,
    latest_total: latest?.total ?? 0,
    change_from_first_pct: first?.total ? ((latest.total / first.total) - 1) * 100 : 0,
    chonburi_rayong_share: latest?.chonburi_rayong_share ?? 0,
  };
}

export async function getYearlyByProvince() {
  const rows = await getYearlyData();
  const lastByProvince = new Map();
  const result = rows.map((row) => {
    const previous = lastByProvince.get(row.province_id);
    const total = Number(row.total);
    const yoy = previous && previous.year_ad === Number(row.year_ad) - 1 && previous.total > 0
      ? ((total / previous.total) - 1) * 100
      : null;
    lastByProvince.set(row.province_id, { total, year_ad: Number(row.year_ad) });
    return {
      province_id: Number(row.province_id), name_th: row.name_th, name_en: row.name_en,
      is_ranked: row.is_ranked, year_ad: Number(row.year_ad), year_be: Number(row.year_ad) + 543,
      arrival: Number(row.arrival), departure: Number(row.departure), total, yoy_pct: yoy,
    };
  }).filter((row) => row.year_ad && YEARS.includes(row.year_ad));
  return result;
}

export async function persistBalancedSnapshot() {
  const ranked = await getRanking();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM priority_score WHERE year_ad = $1', [YEARS.at(-1)]);
    for (const row of ranked) {
      await client.query(`
        INSERT INTO priority_score (
          province_id, year_ad, volume_score, growth_score, diversity_score,
          balance_score, stability_score, final_priority_score, rank, tier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (province_id, year_ad) DO UPDATE SET
          volume_score = EXCLUDED.volume_score,
          growth_score = EXCLUDED.growth_score,
          diversity_score = EXCLUDED.diversity_score,
          balance_score = EXCLUDED.balance_score,
          stability_score = EXCLUDED.stability_score,
          final_priority_score = EXCLUDED.final_priority_score,
          rank = EXCLUDED.rank,
          tier = EXCLUDED.tier
      `, [row.province_id, YEARS.at(-1), row.V, row.G, row.D, row.B, row.S, row.score, row.rank, row.tier]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return ranked;
}
