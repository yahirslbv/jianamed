import { useEffect, useState } from 'react';
import { canCancelOrder, cancelOrder, getOrders } from '../services/orderService.js';
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

function OrderDetail({ order, onClose }) {
  if (!order) return null;

  return (
    <div className={styles.modalOverlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Cerrar detalle">
          Cerrar
        </button>
        <div className={styles.modalContent}>
          <p className={styles.eyebrow}>Detalle de pedido</p>
          <h2 id="order-detail-title">{order.folio}</h2>
          <dl className={styles.detailList}>
            <div>
              <dt>Fecha</dt>
              <dd>{dateFormatter.format(new Date(order.createdAt))}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{order.status}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{currency.format(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Observaciones</dt>
              <dd>{order.observations || 'Sin observaciones'}</dd>
            </div>
          </dl>
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
                <span>{currency.format(item.unitPrice)}</span>
                <span>{currency.format(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MyOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');

  useEffect(() => {
    let isMounted = true;

    getOrders()
      .then((loadedOrders) => {
        if (isMounted) setOrders(loadedOrders);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancelOrder = async (order) => {
    const confirmation = window.confirm(
      `Cancelar la solicitud ${order.folio}? Esta acci\u00f3n no se puede deshacer.`,
    );

    if (!confirmation) return;

    setActionError('');
    setCancellingOrderId(order.id);

    try {
      const cancelledOrder = await cancelOrder(order.id);
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === cancelledOrder.id ? cancelledOrder : currentOrder,
        ),
      );
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === cancelledOrder.id ? cancelledOrder : currentOrder,
      );
    } catch (requestError) {
      setActionError(requestError.message || 'No fue posible cancelar la solicitud.');
    } finally {
      setCancellingOrderId('');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Mis pedidos</p>
          <h1>Solicitudes enviadas</h1>
          <p>Consulta folio, fecha, total y estado de las solicitudes creadas.</p>
        </div>
        <a className={styles.secondaryButton} href="#/catalogo">
          Nuevo pedido
        </a>
      </div>

      {actionError && (
        <p className={styles.formError} role="alert">
          {actionError}
        </p>
      )}

      {error ? (
        <div className={styles.emptyState}>
          <h2>No fue posible consultar tus pedidos</h2>
          <p>{error}</p>
        </div>
      ) : isLoading ? (
        <div className={styles.emptyState}>
          <h2>Cargando pedidos</h2>
          <p>Estamos consultando tus solicitudes registradas.</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Aún no tienes pedidos</h2>
          <p>Agrega productos al carrito y confirma una solicitud.</p>
          <a className={styles.primaryButton} href="#/catalogo">
            Ir al catálogo
          </a>
        </div>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <article className={styles.orderListCard} key={order.id}>
              <div>
                <span className={styles.statusPill}>{order.status}</span>
                <h2>{order.folio}</h2>
                <p>{dateFormatter.format(new Date(order.createdAt))}</p>
              </div>
              <strong>{currency.format(order.total)}</strong>
              <div className={styles.orderCardActions}>
                <button className={styles.secondarySmall} type="button" onClick={() => setSelectedOrder(order)}>
                  Ver detalle
                </button>
                {canCancelOrder(order) && (
                  <button
                    className={styles.cancelOrderButton}
                    type="button"
                    disabled={cancellingOrderId === order.id}
                    onClick={() => handleCancelOrder(order)}
                  >
                    {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar solicitud'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
}
