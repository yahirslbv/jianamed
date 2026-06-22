import { apiClient, shouldUseLocalFallback } from './apiClient.js';

export async function getActiveOffers() {
  try {
    const response = await apiClient('/offers/active');
    return response.offers;
  } catch (error) {
    if (shouldUseLocalFallback(error)) return [];
    throw error;
  }
}

export async function getOffers({ includeInactive = false } = {}) {
  const query = includeInactive ? '?includeInactive=true' : '';
  const response = await apiClient(`/offers${query}`);
  return response.offers;
}

export async function createOffer(offer) {
  const response = await apiClient('/offers', { method: 'POST', body: offer });
  return response.offer;
}

export async function updateOffer(id, offer) {
  const response = await apiClient(`/offers/${id}`, { method: 'PUT', body: offer });
  return response.offer;
}

export async function updateOfferStatus(id, isActive) {
  const response = await apiClient(`/offers/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  });
  return response.offer;
}
