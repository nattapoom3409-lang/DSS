export const FACTORS = ['V', 'G', 'D', 'B', 'S'];
export const DEFAULT_WEIGHTS = { V: 40, G: 25, D: 15, B: 10, S: 10 };
export const PROFILES = {
  balanced: { label: 'สมดุล', weights: { ...DEFAULT_WEIGHTS } },
  capacity: { label: 'ขยายกำลังรองรับ', weights: { V: 50, G: 20, D: 10, B: 10, S: 10 } },
  stability: { label: 'เสถียรภาพ', weights: { V: 20, G: 15, D: 10, B: 15, S: 40 } },
};

export function normalizeWeights(weights) {
  const total = FACTORS.reduce((sum, key) => sum + Number(weights[key] || 0), 0);
  if (total <= 0) return null;
  return Object.fromEntries(FACTORS.map((key) => [key, Number(weights[key] || 0) / total]));
}

export function tierOf(score, avgVolumeTon, thresholds = { high: 65, mid: 50, volumeMt: 5 }) {
  if (score >= thresholds.high) return avgVolumeTon >= thresholds.volumeMt * 1_000_000 ? 1 : 2;
  return score >= thresholds.mid ? 3 : 4;
}

export function rankLocal(indicators, weights) {
  const normalized = normalizeWeights(weights);
  if (!normalized) return [];
  return [...indicators]
    .map((row) => {
      const score = FACTORS.reduce((sum, key) => sum + normalized[key] * Number(row[key] || 0), 0);
      return { ...row, score, tier: tierOf(score, Number(row.avgVolumeTon || 0)) };
    })
    .sort((a, b) => b.score - a.score || a.name_en.localeCompare(b.name_en))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
