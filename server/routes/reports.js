import { Router } from 'express';
import { requireAuth, requireRole } from '../auth.js';
import { REPORT_TYPES, createCsv, getReport, writePdf } from '../services/reports.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

function getFileDate() {
  return new Date().toISOString().slice(0, 10);
}

async function logExport(req, type, format, report) {
  await writeAuditLog({
    userId: req.user.id,
    action: format === 'csv' ? 'EXPORT_CSV' : 'EXPORT_PDF',
    entity: 'Report',
    entityId: type,
    details: {
      reportType: type,
      filters: report.filters,
      recordCount: report.rows.length,
      format,
      createdAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    },
  });
}

function validateType(type, res) {
  if (REPORT_TYPES.includes(type)) return true;
  res.status(404).json({ message: 'Tipo de reporte no encontrado.' });
  return false;
}

router.get('/admin/reports/:type/export.csv', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!validateType(req.params.type, res)) return;
    const report = await getReport(req.params.type, req.query, 'csv');
    await logExport(req, req.params.type, 'csv', report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${req.params.type}-${getFileDate()}.csv"`);
    return res.send(createCsv(report));
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/reports/:type/export.pdf', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!validateType(req.params.type, res)) return;
    const report = await getReport(req.params.type, req.query);
    await logExport(req, req.params.type, 'pdf', report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${req.params.type}-${getFileDate()}.pdf"`);
    writePdf(res, report, req.user.name);
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/reports/:type', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!validateType(req.params.type, res)) return;
    const report = await getReport(req.params.type, req.query);
    return res.json({ ...report, total: report.rows.length });
  } catch (error) {
    return next(error);
  }
});

export default router;
