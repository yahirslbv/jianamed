import { useEffect, useState } from 'react';
import { getLastOrderId, getOrderById } from '../services/orderService.js';
import { pollOrderBySessionId } from '../services/paymentService.js';
import styles from '../styles/App.module.css';

export default function OrderConfirmationPage({ orderId, sessionId }) {
  const resolvedOrderId = orderId || getLastOrderId();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedOrderId || sessionId));

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        let loadedOrder = null;

        if (sessionId) {
          // Stripe just redirected back — poll until the webhook has created the order
          loadedOrder = await pollOrderBySessionId(sessionId, { maxAttempts: 6, delayMs: 1500 });
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
  }, [resolvedOrderId, sessionId]);

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.confirmationPanel}>
        <p className={styles.eyebrow}>Pedido creado</p>
        <h1>Solicitud de pedido enviada correctamente</h1>
        {isLoading ? (
          <p>Consultando el pedido creado...</p>
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
              Tu pago fue procesado correctamente. Un agente de ventas validará el surtido y te notificará cuando tu pedido esté en camino.
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
