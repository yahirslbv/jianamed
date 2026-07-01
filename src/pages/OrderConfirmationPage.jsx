import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { getLastOrderId, getOrderById } from '../services/orderService.js';
import { confirmCheckoutSession } from '../services/paymentService.js';
import styles from '../styles/App.module.css';

export default function OrderConfirmationPage({ orderId, sessionId }) {
  const { clearCart } = useCart();
  const resolvedOrderId = orderId || getLastOrderId();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedOrderId || sessionId));

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        let loadedOrder = null;

        if (sessionId) {
          // Stripe just redirected back — confirm the payment and fetch the created order.
          loadedOrder = await confirmCheckoutSession(sessionId);
          if (loadedOrder) clearCart();
        } else if (resolvedOrderId) {
          loadedOrder = await getOrderById(resolvedOrderId);
        }

        if (isMounted) setOrder(loadedOrder);
      } catch {
        if (isMounted) setOrder(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (sessionId || resolvedOrderId) {
      load();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
    // clearCart is stable from context; intentionally excluded to avoid re-running on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrderId, sessionId]);

  const isPaid = order?.paymentStatus === 'PAID';

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.confirmationPanel}>
        <p className={styles.eyebrow}>{isPaid ? 'Pago confirmado' : 'Pedido registrado'}</p>
        <h1>{isPaid ? '¡Gracias! Tu pago fue recibido' : 'Pedido registrado'}</h1>
        {isLoading ? (
          <p>{sessionId ? 'Confirmando tu pago...' : 'Consultando el pedido...'}</p>
        ) : order ? (
          <>
            <dl className={styles.detailList}>
              <div>
                <dt>Folio</dt>
                <dd>{order.folio}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{order.statusLabel || order.status}</dd>
              </div>
              {order.paymentStatus === 'PAID' && (
                <div>
                  <dt>Pago</dt>
                  <dd>✓ Pago recibido</dd>
                </div>
              )}
              {order.total !== undefined && (
                <div>
                  <dt>Total pagado</dt>
                  <dd>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.total)}
                  </dd>
                </div>
              )}
            </dl>
            <p>
              {isPaid
                ? 'Recibimos tu pago correctamente. Un agente de ventas validará el surtido y coordinará la entrega de tu pedido.'
                : 'Tu pedido fue registrado. Un agente de ventas lo revisará y se pondrá en contacto contigo para coordinar el pago y la entrega.'}
            </p>
          </>
        ) : (
          <p>No encontramos el pedido confirmado. Puedes revisar la sección Mis pedidos.</p>
        )}
        <div className={styles.heroActions}>
          <a className={styles.primaryButton} href="#/mis-pedidos">
            Ver mis pedidos
          </a>
          <a className={styles.secondaryButton} href="#/catalogo">
            Volver al catálogo
          </a>
        </div>
      </div>
    </section>
  );
}
