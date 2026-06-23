import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import { orderStatuses } from '../data/orderStatuses.js';
import { getAdminOrders, updateOrderStatus } from '../services/orderService.js';
import { formatCurrencyMXN } from '../utils/formatters.js';
import { getOrderItemCount, getOrderStatusPresentation } from '../utils/orderPresentation.js';
import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

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
                  </details>
                </article>;
              })}
            </div>}
    </section>
  );
}
