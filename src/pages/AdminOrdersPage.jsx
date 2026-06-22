import { useEffect, useMemo, useState } from 'react';
import { orderStatuses } from '../data/orderStatuses.js';
import { getAdminOrders, updateOrderStatus } from '../services/orderService.js';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
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

  useEffect(() => {
    loadOrders();
  }, []);

  const visibleOrders = useMemo(
    () => orders.filter((order) => !statusFilter || order.status === statusFilter),
    [orders, statusFilter],
  );

  const handleStatusChange = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Admin / vendedor</p>
          <h1>Solicitudes de pedido</h1>
          <p>Vista mock para revisar solicitudes y actualizar estado operativo.</p>
        </div>
        <label className={styles.adminFilter}>
          Filtrar por estado
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className={styles.emptyState}>
          <h2>No fue posible consultar los pedidos</h2>
          <p>{error}</p>
        </div>
      ) : isLoading ? (
        <div className={styles.emptyState}>
          <h2>Cargando solicitudes</h2>
          <p>Estamos consultando los pedidos registrados.</p>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No hay pedidos con ese estado</h2>
          <p>Cuando los clientes confirmen solicitudes aparecerán en esta vista.</p>
        </div>
      ) : (
        <div className={styles.adminOrderList}>
          {visibleOrders.map((order) => (
            <article className={styles.adminOrderCard} key={order.id}>
              <div>
                <span className={styles.statusPill}>{order.status}</span>
                <h2>{order.folio}</h2>
                <p>
                  {order.clientName} - {order.clientEmail}
                </p>
                <p>{dateFormatter.format(new Date(order.createdAt))}</p>
              </div>
              <div>
                <strong>{currency.format(order.total)}</strong>
                <p>{order.items.length} partidas</p>
              </div>
              <div className={styles.statusActions}>
                {orderStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={order.status === status ? styles.primarySmall : styles.secondarySmall}
                    onClick={() => handleStatusChange(order.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <details className={styles.orderDetailsDisclosure}>
                <summary>Ver detalle</summary>
                <div className={styles.orderTable}>
                  {order.items.map((item) => (
                    <div className={styles.orderTableRow} key={`${order.id}-${item.productId}`}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.sku}</small>
                      </span>
                      <span>{item.laboratoryName}</span>
                      <span>{item.presentation}</span>
                      <span>{item.quantity}</span>
                      <span>{currency.format(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <p>Observaciones: {order.observations || 'Sin observaciones'}</p>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
