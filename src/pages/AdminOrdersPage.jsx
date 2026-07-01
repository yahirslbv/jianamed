import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { orderStatuses } from '../data/orderStatuses.js';
import { getAdminOrders, updateOrderItems, updateOrderStatus } from '../services/orderService.js';
import { formatCurrencyMXN } from '../utils/formatters.js';
import { getOrderItemCount, getOrderStatusPresentation } from '../utils/orderPresentation.js';
import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// Orders can only be adjusted while still open (mirrors ORDER_EDITABLE_STATUSES on the server).
const EDITABLE_STATUSES = new Set(['Pendiente de revisión', 'En revisión', 'Aprobado']);

function OrderItemsEditor({ order, onSave }) {
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(order.items.map((item) => [item.id, item.quantity])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const setQuantity = (itemId, value, max) => {
    const parsed = Math.max(0, Math.min(max, Number.parseInt(value, 10) || 0));
    setQuantities((current) => ({ ...current, [itemId]: parsed }));
  };

  const hasChanges = order.items.some((item) => quantities[item.id] !== item.quantity);

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      const items = order.items
        .filter((item) => quantities[item.id] !== item.quantity)
        .map((item) => ({ id: item.id, quantity: quantities[item.id] }));
      await onSave(items);
    } catch (requestError) {
      setError(requestError.message || 'No fue posible ajustar el pedido.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.orderItemsEditor}>
      <h3>Ajustar cantidades</h3>
      <p className={styles.orderItemsEditorHint}>Reduce la cantidad de una partida cuando no haya existencias suficientes. Escribe 0 para quitarla del pedido. El total se recalcula automáticamente.</p>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.orderItemsEditorList}>
        {order.items.map((item) => (
          <label className={styles.orderItemsEditorRow} key={`edit-${item.id}`}>
            <span><strong>{item.name}</strong><small>{item.sku} · cantidad actual: {item.quantity}</small></span>
            <input
              type="number"
              min="0"
              max={item.quantity}
              value={quantities[item.id]}
              onChange={(event) => setQuantity(item.id, event.target.value, item.quantity)}
            />
          </label>
        ))}
      </div>
      <button className={styles.primaryButton} type="button" disabled={!hasChanges || isSaving} onClick={handleSave}>
        {isSaving ? 'Guardando...' : 'Guardar cantidades'}
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: '', query: '', date: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const loadedOrders = await getAdminOrders();
      setOrders(loadedOrders);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const visibleOrders = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return orders.filter((order) => (
      (!filters.status || order.status === filters.status)
      && (!query || [order.folio, order.clientName, order.clientEmail].some((value) => String(value || '').toLowerCase().includes(query)))
      && (!filters.date || new Date(order.createdAt).toISOString().slice(0, 10) === filters.date)
    ));
  }, [filters, orders]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const hasFilters = Object.values(filters).some(Boolean);

  const handleStatusChange = async (orderId, status) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  // Errors propagate to the editor so they appear next to the inputs being changed.
  const handleAdjustItems = async (orderId, items) => {
    const updatedOrder = await updateOrderItems(orderId, items);
    setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div><p className={styles.eyebrow}>Administración</p><h1>Solicitudes de pedido</h1><p>Revisa clientes, entregas, productos y condiciones comerciales de cada solicitud.</p></div>
        <button className={styles.secondaryButton} type="button" onClick={loadOrders}>Actualizar</button>
      </div>

      <div className={styles.orderAdminFilters}>
        <label>Estado<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">Todos los estados</option>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>Folio o cliente<input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Folio, cliente o correo" /></label>
        <label>Fecha<input type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} /></label>
        {hasFilters && <button className={styles.textButton} type="button" onClick={() => setFilters({ status: '', query: '', date: '' })}>Limpiar filtros</button>}
      </div>

      {error ? <div className={styles.emptyState}><h2>No fue posible consultar los pedidos</h2><p>{error}</p></div>
        : isLoading ? <div className={styles.emptyState}><h2>Cargando solicitudes</h2><p>Estamos consultando los pedidos registrados.</p></div>
          : visibleOrders.length === 0 ? <div className={styles.emptyState}><h2>No hay pedidos con esos filtros</h2><p>Prueba con otra combinación de estado, fecha o cliente.</p></div>
            : <div className={styles.adminOrderList}>
              {visibleOrders.map((order) => {
                const status = getOrderStatusPresentation(order.status);
                const checkout = order.checkout || {};
                const deliveryAddress = [checkout.deliveryAddress, checkout.deliveryCity, checkout.deliveryState, checkout.deliveryPostalCode].filter(Boolean).join(', ');
                return <article className={styles.adminOrderCard} key={order.id}>
                  <div className={styles.orderCardPrimary}>
                    <StatusBadge tone={status.tone}>{order.status}</StatusBadge>
                    <h2>{order.folio}</h2>
                    <p>{order.clientName} · {order.clientEmail}</p>
                    <p>{dateFormatter.format(new Date(order.createdAt))}</p>
                  </div>
                  <div className={styles.orderCardSummary}>
                    <span><small>Total</small><strong>{formatCurrencyMXN(order.total)}</strong></span>
                    <span><small>Productos</small><strong>{getOrderItemCount(order)}</strong></span>
                    <span><small>Partidas</small><strong>{order.items.length}</strong></span>
                  </div>
                  <label className={styles.orderStatusControl}>Actualizar estado
                    <select value={order.status} onChange={(event) => handleStatusChange(order.id, event.target.value)}>
                      {orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <details className={styles.orderDetailsDisclosure}>
                    <summary>Ver detalle de la solicitud</summary>
                    <div className={styles.adminOrderDetailGrid}>
                      <section><h3>Productos incluidos</h3><div className={styles.orderTable}>{order.items.map((item) => <div className={styles.orderTableRow} key={`${order.id}-${item.productId}`}><span><strong>{item.name}</strong><small>{item.sku}</small></span><span>{item.laboratoryName}</span><span>{item.presentation}</span><span>{item.quantity} uds.</span><span>{formatCurrencyMXN(item.unitPrice)}</span><span>{formatCurrencyMXN(item.subtotal)}</span></div>)}</div></section>
                      <section><h3>Entrega y contacto</h3><dl className={styles.detailList}><div><dt>Dirección</dt><dd>{deliveryAddress || 'No disponible'}</dd></div><div><dt>Responsable</dt><dd>{[checkout.responsibleName, checkout.responsiblePhone].filter(Boolean).join(' · ') || 'No disponible'}</dd></div><div><dt>Datos fiscales</dt><dd>{[checkout.billingBusinessName, checkout.billingRfc].filter(Boolean).join(' · ') || 'No disponible'}</dd></div></dl><h3>Observaciones</h3><p>{order.observations || 'Sin observaciones'}</p></section>
                    </div>
                    <dl className={styles.orderTotals}><div><dt>Subtotal</dt><dd>{formatCurrencyMXN(order.subtotal)}</dd></div><div><dt>Descuento</dt><dd className={styles.discountValue}>-{formatCurrencyMXN(order.discountTotal || 0)}</dd></div><div><dt>Total estimado</dt><dd>{formatCurrencyMXN(order.total)}</dd></div></dl>
                    {EDITABLE_STATUSES.has(order.status) && (
                      <OrderItemsEditor
                        key={order.items.map((item) => `${item.id}:${item.quantity}`).join('|')}
                        order={order}
                        onSave={(items) => handleAdjustItems(order.id, items)}
                      />
                    )}
                  </details>
                </article>;
              })}
            </div>}
    </section>
  );
}
