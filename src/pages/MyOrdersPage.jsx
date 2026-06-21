import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getOrdersByClient } from '../services/orderService.js';
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
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const orders = useMemo(() => getOrdersByClient(user.id), [user.id]);

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

      {orders.length === 0 ? (
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
              <button className={styles.secondarySmall} type="button" onClick={() => setSelectedOrder(order)}>
                Ver detalle
              </button>
            </article>
          ))}
        </div>
      )}

      <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
}
