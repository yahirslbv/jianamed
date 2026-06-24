import { normalizeRole } from './constants.js';

function hasRole(user, role) {
  return normalizeRole(user?.role) === role;
}

// The current API remains admin-only for sensitive operations. These helpers
// are the single, explicit place to widen the future SALES/SUPERVISOR matrix.
export function canManageUsers(user) {
  return hasRole(user, 'admin');
}

export function canManageCustomers(user) {
  return hasRole(user, 'admin');
}

export function canManageProducts(user) {
  return hasRole(user, 'admin');
}

export function canManageOrders(user) {
  return hasRole(user, 'admin');
}

export function canViewReports(user) {
  return hasRole(user, 'admin');
}

export function canViewAudit(user) {
  return hasRole(user, 'admin');
}
