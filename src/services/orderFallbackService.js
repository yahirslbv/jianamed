import { initialOrderStatus } from '../data/orderStatuses.js';

const ORDER_STORAGE_KEY = 'tic-toc-pharma-orders';
const LAST_ORDER_KEY = 'tic-toc-pharma-last-order-id';
const legacyStatusLabels = {
  'Pendiente de revision': 'Pendiente de revisión',
  'En revision': 'En revisión',
};

function normalizeOrder(order) {
  return {
    ...order,
    status: legacyStatusLabels[order.status] || order.status,
  };
}

function readOrders() {
  try {
    const storedOrders = localStorage.getItem(ORDER_STORAGE_KEY);
    const parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];
    return Array.isArray(parsedOrders) ? parsedOrders.map(normalizeOrder) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function createOrderId() {
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createFolio(orders) {
  const year = new Date().getFullYear();
  const yearPrefix = `PED-${year}-`;
  const sequence = orders.filter((order) => order.folio?.startsWith(yearPrefix)).length + 1;
  return `${yearPrefix}${sequence.toString().padStart(4, '0')}`;
}

export function getFallbackOrders() {
  return readOrders();
}

export function getFallbackOrderById(orderId) {
  return readOrders().find((order) => order.id === orderId) || null;
}

export function getFallbackLastOrderId() {
  return localStorage.getItem(LAST_ORDER_KEY);
}

export function createFallbackOrder({ user, items, observations }) {
  const orders = readOrders();
  const orderItems = items.map(({ product, quantity }) => ({
    productId: product.id,
    sku: product.sku,
    name: product.name,
    laboratoryName: product.laboratoryName,
    presentation: product.presentation,
    quantity,
    unitPrice: product.price || 0,
    subtotal: (product.price || 0) * quantity,
  }));
  const subtotal = orderItems.reduce((total, item) => total + item.subtotal, 0);
  const order = {
    id: createOrderId(),
    folio: createFolio(orders),
    clientId: user.id,
    clientName: user.company || user.name,
    clientEmail: user.email,
    items: orderItems,
    subtotal,
    total: subtotal,
    status: initialOrderStatus,
    observations: observations.trim(),
    createdAt: new Date().toISOString(),
  };

  writeOrders([order, ...orders]);
  localStorage.setItem(LAST_ORDER_KEY, order.id);
  return order;
}

export function updateFallbackOrderStatus(orderId, status) {
  const updatedOrders = readOrders().map((order) =>
    order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order,
  );
  writeOrders(updatedOrders);
  return updatedOrders.find((order) => order.id === orderId) || null;
}

export function cancelFallbackOrder(orderId) {
  const order = getFallbackOrderById(orderId);

  if (!order) {
    throw new Error('Pedido no encontrado.');
  }
  if (order.status !== initialOrderStatus) {
    throw new Error('Solo puedes cancelar solicitudes que siguen pendientes de revisi\u00f3n.');
  }

  return updateFallbackOrderStatus(orderId, 'Cancelado');
}
