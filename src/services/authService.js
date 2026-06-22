import { apiClient } from './apiClient.js';

export function login(credentials) {
  return apiClient('/auth/login', { method: 'POST', body: credentials });
}

export function logout() {
  return apiClient('/auth/logout', { method: 'POST' });
}

export function getCurrentUser() {
  return apiClient('/auth/me');
}
