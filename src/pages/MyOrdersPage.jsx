import { useEffect, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { canCancelOrder, cancelOrder, getOrders } from '../services/orderService.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatCurrencyMXN } from '../utils/formatters.js';
import { getOrderItemCount, getOrderStatusPresentation } from '../utils/orderPresentation.js';
import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function OrderDetail({ order, onClose }) {
  if (!order) return null;
  const checkout = order.checkout || {};
  const status = getOrderStatusPresentation(order.status);
  const deliveryAddress = [checkout.deliveryAddress, checkout.deliveryCity, checkout.deliveryState, checkout.deliveryPostalCode].filter(Boolean).join(', ');

  return (
    <div className={styles.modalOverlay} role="presentation" onMouseDown={onClose}>
      <section className={`${styles.modal} ${styles.orderDetailModal}`} role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Cerrar detalle">Cerrar</button>
        <div className={styles.modalContent}>
          <div className={styles.orderDetailHeading}>
            <div>
              <p className={styles.eyebrow}>Detalle de pedido</p>
              <h2 id="order-detail-title">{order.folio}</h2>
              <p>{dateFormatter.format(new Date(order.createdAt))}</p>
            </div>
            <StatusBadge tone={status.tone}>{order.status}</StatusBadge>
          </div>

          <div className={styles.orderOverviewGrid}>
            <div><span>Total estimado</span><strong>{formatCurrencyMXN(order.total)}</strong></div>
            <div><span>Productos</span><strong>{getOrderItemCount(order)}</strong></div>
            <div><span>Partidas</span><strong>{order.items.length}</strong></div>
            <div><span>Estado</span><strong>{order.status}</strong></div>
          </div>

          <section className={styles.orderDetailSection}>
            <div className={styles.orderDetailSectionHeader}><h3>Productos incluidos</h3><span>{getOrderItemCount(order)} unidades</span></div>
            <div className={styles.orderTable}>
              <div className={styles.orderTableHeader}><span>Producto</span><span>Laboratorio</span><span>Presentación</span><span>Cantidad</span><span>Unitario</span><span>Subtotal</span></div>
              {order.items.map((item) => (
                <div className={styles.orderTableRow} key={`${order.id}-${item.productId}`}>
                  <span><strong>{item.name}</strong><small>{item.sku}</small></span>
                  <span>{item.laboratoryName}</span><span>{item.presentation}</span><span>{item.quantity}</span>
                  <span>{item.originalUnitPrice > item.unitPrice && <small className={styles.originalPrice}>Base {formatCurrencyMXN(item.originalUnitPrice)}</small>}{formatCurrencyMXN(item.unitPrice)}</span>
                  <span>{formatCurrencyMXN(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <dl className={styles.orderTotals}>
              <div><dt>Subtotal</dt><dd>{formatCurrencyMXN(order.subtotal)}</dd></div>
              <div><dt>Descuento aplicado</dt><dd className={styles.discountValue}>-{formatCurrencyMXN(order.discountTotal || 0)}</dd></div>
              <div><dt>Total estimado</dt><dd>{formatCurrencyMXN(order.total)}</dd></div>
            </dl>
          </section>

          <div className={styles.orderDetailColumns}>
            <section className={styles.orderDetailSection}>
              <h3>Datos de entrega</h3>
              <dl className={styles.detailList}>
                <div><dt>Dirección</dt><dd>{deliveryAddress || 'No disponible'}</dd></div>
                <div><dt>Responsable</dt><dd>{[checkout.responsibleName, checkout.responsiblePhone].filter(Boolean).join(' · ') || 'No disponible'}</dd></div>
                <div><dt>Datos fiscales</dt><dd>{[checkout.billingBusinessName, checkout.billingRfc].filter(Boolean).join(' · ') || 'No disponible'}</dd></div>
              </dl>
            </section>
            <section className={styles.orderDetailSection}>
              <h3>Observaciones</h3>
              <p className={styles.orderDetailCopy}>{order.observations || 'Sin observaciones para esta solicitud.'}</p>
            </section>
          </div>

          <section className={styles.orderStatusTimeline}>
            <div><strong>Solicitud registrada</strong><span>{dateFormatter.format(new Date(order.createdAt))}</span></div>
            <div><strong>Estado actual · {order.status}</strong><span>{status.description}</span></div>
            {order.updatedAt && <div><strong>Última actualización</strong><span>{dateFormatter.format(new Date(order.updatedAt))}</span></div>}
          </section>
        </div>
      </section>
    </div>
  );
}

export default function MyOrdersPage() {
  const { t } = useLanguage();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const [cancelCandidate, setCancelCandidate] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getOrders()
      .then((loadedOrders) => { if (isMounted) setOrders(loadedOrders); })
      .catch((requestError) => { if (isMounted) setError(requestError.message); })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const handleCancelOrder = async () => {
    const order = cancelCandidate;
    if (!order) return;
    setCancelCandidate(null);
    setActionError('');
    setCancellingOrderId(order.id);
    try {
      const cancelledOrder = await cancelOrder(order.id);
      setOrders((currentOrders) => currentOrders.map((currentOrder) => currentOrder.id === cancelledOrder.id ? cancelledOrder : currentOrder));
      setSelectedOrder((currentOrder) => currentOrder?.id === cancelledOrder.id ? cancelledOrder : currentOrder);
    } catch (requestError) {
      setActionError(requestError.message || 'No fue posible cancelar la solicitud.');
    } finally {
      setCancellingOrderId('');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.privateHeader}>
        <div><p className={styles.eyebrow}>Mis pedidos</p><h1>{t('orders.title')}</h1><p>Consulta el estado, productos incluidos y total estimado de cada solicitud.</p></div>
        <a className={styles.secondaryButton} href="#/catalogo">Nuevo pedido</a>
      </div>
      <p className={styles.orderStatusExplainer}><strong>Pendiente de revisión:</strong> tu solicitud fue recibida; un agente validará disponibilidad y condiciones comerciales antes de aprobarla.</p>
      {actionError && <p className={styles.formError} role="alert">{actionError}</p>}
      {error ? <div className={styles.emptyState}><h2>No fue posible consultar tus pedidos</h2><p>{error}</p></div>
        : isLoading ? <div className={styles.emptyState}><h2>Cargando pedidos</h2><p>Estamos consultando tus solicitudes registradas.</p></div>
          : orders.length === 0 ? <div className={styles.emptyState}><h2>Aún no tienes pedidos</h2><p>Agrega productos al carrito y confirma una solicitud para darle seguimiento aquí.</p><a className={styles.primaryButton} href="#/catalogo">Ir al catálogo</a></div>
            : <div className={styles.orderList}>
              {orders.map((order) => {
                const status = getOrderStatusPresentation(order.status);
                return <article className={styles.orderListCard} key={order.id}>
                  <div className={styles.orderCardPrimary}>
                    <StatusBadge tone={status.tone}>{order.status}</StatusBadge>
                    <h2>{order.folio}</h2>
                    <p>{dateFormatter.format(new Date(order.createdAt))}</p>
                  </div>
                  <div className={styles.orderCardSummary}>
                    <span><small>Total estimado</small><strong>{formatCurrencyMXN(order.total)}</strong></span>
                    <span><small>Productos</small><strong>{getOrderItemCount(order)}</strong></span>
                    <span><small>Partidas</small><strong>{order.items.length}</strong></span>
                  </div>
                  <p className={styles.orderStatusCopy}>{status.description}</p>
                  <div className={styles.orderCardActions}>
                    <button className={styles.secondarySmall} type="button" onClick={() => setSelectedOrder(order)}>Ver detalle</button>
                    {canCancelOrder(order) && <button className={styles.cancelOrderButton} type="button" disabled={cancellingOrderId === order.id} onClick={() => setCancelCandidate(order)}>{cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar solicitud'}</button>}
                  </div>
                </article>;
              })}
            </div>}
      <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <ConfirmDialog
        open={Boolean(cancelCandidate)}
        title="Cancelar solicitud"
        description={cancelCandidate ? `¿Cancelar la solicitud ${cancelCandidate.folio}? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Sí, cancelar solicitud"
        onClose={() => setCancelCandidate(null)}
        onConfirm={handleCancelOrder}
      />
    </section>
  );
}
