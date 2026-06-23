import { apiClient } from './apiClient.js';

export async function getCustomers() { return (await apiClient('/admin/customers')).customers; }
export async function createCustomer(data) { return (await apiClient('/admin/customers', { method: 'POST', body: data })).customer; }
export async function updateCustomer(id, data) { return (await apiClient(`/admin/customers/${id}`, { method: 'PUT', body: data })).customer; }
export async function updateCustomerStatus(id, isActive) { return (await apiClient(`/admin/customers/${id}/status`, { method: 'PATCH', body: { isActive } })).customer; }
export async function updateCustomerAuthorization(id, isAuthorized) { return (await apiClient(`/admin/customers/${id}/authorization`, { method: 'PATCH', body: { isAuthorized } })).customer; }
export async function updateCustomerCredit(id, data) { return (await apiClient(`/admin/customers/${id}/credit`, { method: 'PATCH', body: data })).customer; }
