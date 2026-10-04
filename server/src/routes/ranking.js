import { Router } from 'express';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, WEIGHT_PROFILES } from '../config.js';
import { toCsv } from '../csv.js';
import { getRanking } from '../repository.js';

const router = Router();

function readOptions(query) {
  const profile = query.profile && WEIGHT_PROFILES[query.profile] ? query.profile : null;
  const base = profile ? WEIGHT_PROFILES[profile] : DEFAULT_WEIGHTS;
  const weights = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((key) => [key, query[key] === undefined ? base[key] : Number(query[key])]));
  const thresholds = {
    high: query.high === undefined ? DEFAULT_THRESHOLDS.high : Number(query.high),
    mid: query.mid === undefined ? DEFAULT_THRESHOLDS.mid : Number(query.mid),
    volumeMt: query.volumeMt === undefined ? DEFAULT_THRESHOLDS.volumeMt : Number(query.volumeMt),
  };
  if (Object.values(thresholds).some((value) => !Number.isFinite(value) || value < 0)
    || thresholds.high < thresholds.mid) {
    const error = new Error('Invalid tier thresholds');
    error.status = 400;
    throw error;
  }
  return { weights, thresholds };
}

router.get('/indicators', async (_req, res, next) => {
  try {
    res.json(await getRanking());
  } catch (error) { next(error); }
});

router.get('/ranking', async (req, res, next) => {
  try {
    const { weights, thresholds } = readOptions(req.query);
    const ranking = await getRanking(weights, thresholds);
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    res.json({ profile: req.query.profile ?? 'balanced', weights, weights_normalized: total !== 100, ranking });
  } catch (error) {
    if (error.message.startsWith('Weights') || error.message.startsWith('At least')) error.status = 400;
    next(error);
  }
});

router.get('/ranking/export.csv', async (req, res, next) => {
  try {
    const { weights, thresholds } = readOptions(req.query);
    const ranking = await getRanking(weights, thresholds);
    const columns = [
      { name: 'rank', label: 'อันดับ' }, { name: 'name_th', label: 'พื้นที่' },
      { name: 'name_en', label: 'Area' }, { name: 'score', label: 'คะแนนรวม' },
      { name: 'tier', label: 'ชั้น' }, { name: 'V', label: 'V' },
      { name: 'G', label: 'G' }, { name: 'D', label: 'D' },
      { name: 'B', label: 'B' }, { name: 'S', label: 'S' },
    ];
    res.type('text/csv; charset=utf-8').attachment('port-ranking.csv').send(Buffer.from(toCsv(columns, ranking), 'utf8'));
  } catch (error) { next(error); }
});

export default router;
