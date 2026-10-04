import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, EXCLUDED_AREAS, YEARS } from './config.js';

const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const populationStd = (values) => {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
};

function minMax(values, invert = false) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value) => {
    const score = max === min ? 50 : ((value - min) / (max - min)) * 100;
    return invert ? 100 - score : score;
  });
}

export function normalizeWeights(weights = DEFAULT_WEIGHTS) {
  const values = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((key) => [key, Number(weights[key] ?? DEFAULT_WEIGHTS[key])]));
  if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Weights must be finite non-negative numbers');
  }
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (!total) throw new Error('At least one weight must be greater than zero');
  return { weights: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total])), total };
}

export function tierOf(score, avgVolumeTon, thresholds = DEFAULT_THRESHOLDS) {
  if (score >= thresholds.high) return avgVolumeTon >= thresholds.volumeMt * 1_000_000 ? 1 : 2;
  return score >= thresholds.mid ? 3 : 4;
}

export function rank(indicators, weights = DEFAULT_WEIGHTS, thresholds = DEFAULT_THRESHOLDS) {
  const normalized = normalizeWeights(weights);
  return indicators
    .map((row) => {
      const score = normalized.weights.V * row.V
        + normalized.weights.G * row.G
        + normalized.weights.D * row.D
        + normalized.weights.B * row.B
        + normalized.weights.S * row.S;
      return { ...row, score, tier: tierOf(score, row.avgVolumeTon, thresholds) };
    })
    .sort((a, b) => b.score - a.score || a.name_en.localeCompare(b.name_en))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildIndicators(yearly, categories) {
  const byProvince = new Map();
  for (const row of yearly) {
    if (!byProvince.has(row.province_id)) byProvince.set(row.province_id, { ...row, rows: [] });
    byProvince.get(row.province_id).rows.push({
      ...row,
      arrival: Number(row.arrival || 0),
      departure: Number(row.departure || 0),
      year_ad: Number(row.year_ad),
    });
  }

  const raw = [...byProvince.values()].flatMap((province) => {
    const rows = province.rows.sort((a, b) => a.year_ad - b.year_ad);
    const years = rows.map((row) => row.year_ad);
    if (province.is_ranked === false || EXCLUDED_AREAS.includes(province.name_en) || YEARS.some((year) => !years.includes(year))) return [];

    const totals = rows.map((row) => row.arrival + row.departure);
    const arrival = rows.reduce((sum, row) => sum + row.arrival, 0);
    const departure = rows.reduce((sum, row) => sum + row.departure, 0);
    const growth = [];
    for (let index = 1; index < rows.length; index += 1) {
      if (totals[index - 1] > 0) growth.push(totals[index] / totals[index - 1] - 1);
    }

    const provinceCategories = categories.filter((row) => Number(row.province_id) === Number(province.province_id));
    const categoryTotal = provinceCategories.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    const hhi = categoryTotal > 0
      ? provinceCategories.reduce((sum, row) => sum + (Number(row.weight) / categoryTotal) ** 2, 0)
      : 1;
    const avgVolumeTon = mean(totals);

    return [{
      province_id: Number(province.province_id),
      name_th: province.name_th,
      name_en: province.name_en,
      avgVolumeTon,
      growth: mean(growth),
      diversity: 1 - hhi,
      balance: arrival + departure > 0 ? 1 - Math.abs(arrival - departure) / (arrival + departure) : 0,
      cv: avgVolumeTon > 0 ? populationStd(totals) / avgVolumeTon : 0,
      totals,
    }];
  });

  const V = minMax(raw.map((row) => Math.log10(Math.max(row.avgVolumeTon, 1))));
  const G = minMax(raw.map((row) => row.growth));
  const D = minMax(raw.map((row) => row.diversity));
  const B = minMax(raw.map((row) => row.balance));
  const S = minMax(raw.map((row) => row.cv), true);
  return raw.map((row, index) => ({ ...row, V: V[index], G: G[index], D: D[index], B: B[index], S: S[index] }));
}
