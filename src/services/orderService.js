import { apiClient } from './apiClient.js';

const LAST_ORDER_KEY = 'tic-toc-pharma-last-order-id';

const statusLabels = {
  PENDING_REVIEW: 'Pendiente de revisión',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUPPLIED: 'Surtido',
  CANCELLED: 'Cancelado',
};

const statusCodes = Object.fromEntries(
  Object.entries(statusLabels).map(([code, label]) => [label, code]),
);

function normalizeOrder(order) {
  return {
    ...order,
    status: order.statusLabel || statusLabels[order.status] || order.status,
  };
}

export async function getOrders() {
  const response = await apiClient('/orders');
  return response.orders.map(normalizeOrder);
}

export async function getOrderById(orderId) {
  if (!orderId) return null;
  const response = await apiClient(`/orders/${orderId}`);
  return normalizeOrder(response.order);
}

export function getLastOrderId() {
  try {
    return localStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
}

export async function createOrder({ items, observations, checkout }) {
  const response = await apiClient('/orders', {
    method: 'POST',
    body: {
      items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      observations,
      checkout,
    },
  });
  const order = normalizeOrder(response.order);
  try {
    localStorage.setItem(LAST_ORDER_KEY, order.id);
  } catch {
    // localStorage may be unavailable (private mode); the order is already persisted server-side.
  }
  return order;
}

export function canCancelOrder(order) {
  return order?.status === 'PENDING_REVIEW' || order?.status === statusLabels.PENDING_REVIEW;
}

export async function cancelOrder(orderId) {
  const response = await apiClient(`/orders/${orderId}/cancel`, { method: 'PATCH' });
  return normalizeOrder(response.order);
}

export async function getAdminOrders(status = '') {
  const query = status ? `?status=${encodeURIComponent(statusCodes[status] || status)}` : '';
  const response = await apiClient(`/admin/orders${query}`);
  return response.orders.map(normalizeOrder);
}

export async function updateOrderStatus(orderId, status) {
  const response = await apiClient(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status: statusCodes[status] || status },
  });
  return normalizeOrder(response.order);
}

/**
 * Adjusts the quantities of an order's lines (admin only).
 * @param {string} orderId
 * @param {Array<{ id: string, quantity: number }>} items — line id + new quantity (0 removes the line)
 */
export async function updateOrderItems(orderId, items) {
  const response = await apiClient(`/admin/orders/${orderId}/items`, {
    method: 'PATCH',
    body: { items: items.map(({ id, quantity }) => ({ id, quantity })) },
  });
  return normalizeOrder(response.order);
}
