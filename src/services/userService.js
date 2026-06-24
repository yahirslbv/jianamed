import { apiClient } from './apiClient.js';

export async function getInternalUsers() {
  return (await apiClient('/admin/users')).users;
}

export async function getInternalUser(id) {
  return (await apiClient(`/admin/users/${id}`)).user;
}

export async function createInternalUser(data) {
  return (await apiClient('/admin/users', { method: 'POST', body: data })).user;
}

export async function updateInternalUser(id, data) {
  return (await apiClient(`/admin/users/${id}`, { method: 'PUT', body: data })).user;
}

export async function updateInternalUserStatus(id, isActive) {
  return (await apiClient(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } })).user;
}

export async function updateInternalUserRole(id, role) {
  return (await apiClient(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } })).user;
}

export async function resetInternalUserPassword(id, password) {
  return (await apiClient(`/admin/users/${id}/password`, { method: 'PATCH', body: { password } })).user;
}
