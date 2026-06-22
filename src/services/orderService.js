import { apiClient, shouldUseLocalFallback } from './apiClient.js';
import {
  createFallbackOrder,
  cancelFallbackOrder,
  getFallbackLastOrderId,
  getFallbackOrderById,
  getFallbackOrders,
  updateFallbackOrderStatus,
} from './orderFallbackService.js';

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
  try {
    const response = await apiClient('/orders');
    return response.orders.map(normalizeOrder);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return getFallbackOrders();
    throw error;
  }
}

export async function getOrderById(orderId) {
  if (!orderId) return null;

  try {
    const response = await apiClient(`/orders/${orderId}`);
    return normalizeOrder(response.order);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return getFallbackOrderById(orderId);
    throw error;
  }
}

export function getLastOrderId() {
  try {
    return localStorage.getItem(LAST_ORDER_KEY) || getFallbackLastOrderId();
  } catch {
    return null;
  }
}

export async function createOrder({ user, items, observations }) {
  try {
    const response = await apiClient('/orders', {
      method: 'POST',
      body: {
        items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        observations,
      },
    });
    const order = normalizeOrder(response.order);
    localStorage.setItem(LAST_ORDER_KEY, order.id);
    return order;
  } catch (error) {
    if (shouldUseLocalFallback(error)) return createFallbackOrder({ user, items, observations });
    throw error;
  }
}

export function canCancelOrder(order) {
  return order?.status === 'PENDING_REVIEW' || order?.status === statusLabels.PENDING_REVIEW;
}

export async function cancelOrder(orderId) {
  try {
    const response = await apiClient(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    });
    return normalizeOrder(response.order);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return cancelFallbackOrder(orderId);
    throw error;
  }
}

export async function getAdminOrders(status = '') {
  try {
    const query = status ? `?status=${encodeURIComponent(statusCodes[status] || status)}` : '';
    const response = await apiClient(`/admin/orders${query}`);
    return response.orders.map(normalizeOrder);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return getFallbackOrders();
    throw error;
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const response = await apiClient(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status: statusCodes[status] || status },
    });
    return normalizeOrder(response.order);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return updateFallbackOrderStatus(orderId, status);
    throw error;
  }
}
