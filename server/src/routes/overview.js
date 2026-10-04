import { Router } from 'express';
import { getOverview, getYearlyByProvince } from '../repository.js';

const router = Router();
router.get('/overview', async (_req, res, next) => {
  try { res.json(await getOverview()); } catch (error) { next(error); }
});
router.get('/provinces/yearly', async (_req, res, next) => {
  try { res.json(await getYearlyByProvince()); } catch (error) { next(error); }
});
export default router;
