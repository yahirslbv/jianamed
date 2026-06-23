import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import multer from 'multer';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
export const productUploadDirectory = path.join(serverDirectory, 'uploads', 'products');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

mkdirSync(productUploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, productUploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

function imageFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Solo se permiten imagenes JPG, PNG o WEBP.');
    error.code = 'INVALID_PRODUCT_IMAGE';
    return callback(error);
  }

  return callback(null, true);
}

export const productImageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

function csvFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']);
  if (extension !== '.csv' || !acceptedMimeTypes.has(file.mimetype)) {
    const error = new Error('Solo se permiten archivos CSV.');
    error.code = 'INVALID_PRODUCT_CSV';
    return callback(error);
  }
  return callback(null, true);
}

export const productCsvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

export function getProductImageUrl(file) {
  return file ? `/api/uploads/products/${file.filename}` : null;
}

export function isSafeProductImageFilename(filename) {
  return /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename);
}
