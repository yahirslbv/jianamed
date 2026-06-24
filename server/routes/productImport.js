import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { productCsvUpload } from '../uploads.js';
import { PRODUCT_IMPORT_HEADERS, confirmPreview, createPreview } from '../services/productImport.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();
const asBoolean = (value) => value === true || value === 'true';

router.get('/admin/products/import-template.csv', requireAuth, requireRole('admin'), (_req, res) => {
  const example = ['TTP-EJEMPLO-001', 'Producto de ejemplo', 'Genérico ejemplo', 'Principio activo', 'Laboratorio ejemplo', 'Categoría ejemplo', 'Tableta', '500 mg', 'Caja con 20 tabletas', 'REG-001', 'NOT_APPLICABLE', 'false', 'false', 'false', 'OTC', '125.50', '20', '', 'Descripción opcional', 'true'];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos-tic-toc-pharma.csv"');
  return res.send(`\uFEFF${PRODUCT_IMPORT_HEADERS.join(',')}\r\n${example.join(',')}\r\n`);
});

router.post('/admin/products/import/preview', requireAuth, requireRole('admin'), productCsvUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Selecciona un archivo CSV.' });
    const preview = await createPreview(prisma, req.file.buffer, req.user.id, {
      mode: req.body.mode,
      createLaboratories: asBoolean(req.body.createLaboratories),
      createCategories: asBoolean(req.body.createCategories),
    }, req.file.originalname);
    if (preview.error) return res.status(400).json({ message: preview.error });
    return res.json({ preview });
  } catch (error) { return next(error); }
});

router.post('/admin/products/import/confirm', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.body.importId) return res.status(400).json({ message: 'Falta el identificador de la vista previa.' });
    const result = await confirmPreview(prisma, req.body.importId, req.user.id);
    await writeAuditLog({ userId: req.user.id, action: 'BULK_IMPORT', entity: 'Product', entityId: req.body.importId, details: result });
    return res.json({ result });
  } catch (error) {
    if (error.message?.includes('vista previa')) return res.status(400).json({ message: error.message });
    return next(error);
  }
});

export default router;
