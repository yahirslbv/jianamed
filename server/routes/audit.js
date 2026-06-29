import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

/**
 * GET /admin/audit-logs
 *
 * Query params:
 *   limit    — max records per page, 1–200 (default 50)
 *   cursor   — id of the last record seen; use for keyset pagination
 *   action   — filter by exact action string
 *   entity   — filter by exact entity string
 *   entityId — filter by exact entityId string
 *   userId   — filter by userId
 */
router.get('/admin/audit-logs', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);

    const where = {};
    if (req.query.action)   where.action   = req.query.action;
    if (req.query.entity)   where.entity   = req.query.entity;
    if (req.query.entityId) where.entityId = req.query.entityId;
    if (req.query.userId)   where.userId   = req.query.userId;

    // Keyset pagination: skip the cursor record and return the next page
    const cursorClause = req.query.cursor
      ? { cursor: { id: req.query.cursor }, skip: 1 }
      : {};

    const logs = await prisma.auditLog.findMany({
      where,
      ...cursorClause,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

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
      nextCursor,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
