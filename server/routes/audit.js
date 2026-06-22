import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

router.get('/admin/audit-logs', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return res.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt,
        user: log.user ? { name: log.user.name, email: log.user.email } : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
