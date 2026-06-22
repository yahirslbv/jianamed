import { laboratories as fallbackLaboratories } from '../data/laboratories.js';
import { apiClient, shouldUseLocalFallback } from './apiClient.js';

export async function getLaboratories({ includeInactive = false } = {}) {
  try {
    const response = await apiClient(`/laboratories${includeInactive ? '?includeInactive=true' : ''}`);
    return response.laboratories;
  } catch (error) {
    if (shouldUseLocalFallback(error)) return fallbackLaboratories;
    throw error;
  }
}

export async function createLaboratory(laboratory) {
  const response = await apiClient('/laboratories', { method: 'POST', body: laboratory });
  return response.laboratory;
}

export async function updateLaboratory(id, laboratory) {
  const response = await apiClient(`/laboratories/${id}`, { method: 'PUT', body: laboratory });
  return response.laboratory;
}
