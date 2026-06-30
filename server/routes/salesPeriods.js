import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { getSalesPeriods, refreshSalesPeriods } from '../services/salesPeriods.js';

const router = Router();
const VALID_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'];

router.get('/admin/sales-periods', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const type = VALID_TYPES.includes(req.query.type) ? req.query.type : 'MONTHLY';
    const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 100);
    const periods = await getSalesPeriods(type, limit);
    return res.json({ periods, type });
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/sales-periods/refresh', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const results = await Promise.all(VALID_TYPES.map((t) => refreshSalesPeriods(t)));
    const total = results.reduce((s, r) => s + r.periodsComputed, 0);
    return res.json({ message: `Períodos actualizados. ${total} períodos calculados.` });
  } catch (error) {
    return next(error);
  }
});

export default router;
