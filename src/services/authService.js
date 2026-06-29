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

export function changePassword({ currentPassword, newPassword }) {
  return apiClient('/auth/change-password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  });
}

export function forgotPassword(email) {
  return apiClient('/auth/forgot-password', { method: 'POST', body: { email } });
}

export function resetPassword({ token, newPassword }) {
  return apiClient('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
}
