import { apiClient } from './apiClient.js';

export const productImportTemplateUrl = `${import.meta.env.VITE_API_URL || '/api'}/admin/products/import-template.csv`;
export async function previewProductImport(file, options) {
  const body = new FormData(); body.append('file', file); body.append('mode', options.mode); body.append('createLaboratories', String(options.createLaboratories)); body.append('createCategories', String(options.createCategories));
  return (await apiClient('/admin/products/import/preview', { method: 'POST', body })).preview;
}
export async function confirmProductImport(importId) { return (await apiClient('/admin/products/import/confirm', { method: 'POST', body: { importId } })).result; }
