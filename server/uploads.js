import { constants } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { config } from './env.js';

export const productUploadDirectory = config.uploadDir;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Creates the configured directory. In production this must be a mounted persistent path. */
export async function ensureProductUploadDirectory() {
  await mkdir(productUploadDirectory, { recursive: true });
  return productUploadDirectory;
}

/** Verifies the directory with a short write/delete probe without touching product files. */
export async function checkProductUploadDirectory() {
  const probe = path.join(productUploadDirectory, `.write-check-${randomUUID()}`);
  try {
    await ensureProductUploadDirectory();
    await access(productUploadDirectory, constants.R_OK | constants.W_OK);
    await writeFile(probe, '', { flag: 'wx' });
    await unlink(probe);
    return { ok: true };
  } catch (error) {
    try {
      await unlink(probe);
    } catch {
      // The original error is the useful one; cleanup is best effort.
    }
    return { ok: false, error };
  }
}

await ensureProductUploadDirectory();

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
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
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
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
});

export function getProductImageUrl(file) {
  return file ? `/api/uploads/products/${file.filename}` : null;
}

export function isSafeProductImageFilename(filename) {
  return /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename);
}
