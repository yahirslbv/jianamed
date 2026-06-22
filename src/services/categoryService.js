import { categories as fallbackCategories } from '../data/categories.js';
import { apiClient, shouldUseLocalFallback } from './apiClient.js';

export async function getCategories({ includeInactive = false } = {}) {
  try {
    const response = await apiClient(`/categories${includeInactive ? '?includeInactive=true' : ''}`);
    return response.categories;
  } catch (error) {
    if (shouldUseLocalFallback(error)) return fallbackCategories;
    throw error;
  }
}

export async function createCategory(category) {
  const response = await apiClient('/categories', { method: 'POST', body: category });
  return response.category;
}

export async function updateCategory(id, category) {
  const response = await apiClient(`/categories/${id}`, { method: 'PUT', body: category });
  return response.category;
}
