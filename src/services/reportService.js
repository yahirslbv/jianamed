import { ApiError } from './apiClient.js';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

function createQuery(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== false),
  );
  return params.size ? `?${params}` : '';
}

export async function getReportPreview(type, filters) {
  const response = await fetch(`${apiBaseUrl}/admin/reports/${type}${createQuery(filters)}`, {
    credentials: 'include',
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.message || 'No fue posible cargar el reporte.', { status: response.status });
  return payload;
}

async function exportReport(type, filters, format) {
  let response;
  try {
    response = await fetch(
      `${apiBaseUrl}/admin/reports/${type}/export.${format}${createQuery(filters)}`,
      { credentials: 'include' },
    );
  } catch {
    throw new ApiError('No fue posible conectar con la API.', { isNetworkError: true });
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.message || 'No fue posible exportar el reporte.', { status: response.status });
  }

  const contentDisposition = response.headers.get('content-disposition') || '';
  const filename = contentDisposition.match(/filename="?([^";]+)"?/)?.[1] || `reporte-${type}.${format}`;
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function exportReportCsv(type, filters) {
  return exportReport(type, filters, 'csv');
}

export function exportReportPdf(type, filters) {
  return exportReport(type, filters, 'pdf');
}

export async function getAuditLogs(filters = {}) {
  const response = await fetch(`${apiBaseUrl}/admin/audit-logs${createQuery(filters)}`, {
    credentials: 'include',
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.message || 'No fue posible cargar la auditoria.', { status: response.status });
  return payload.logs;
}
