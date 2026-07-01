import { useEffect, useState } from 'react';
import { getLastOrderId, getOrderById } from '../services/orderService.js';
import styles from '../styles/App.module.css';

export default function OrderConfirmationPage({ orderId }) {
  const resolvedOrderId = orderId || getLastOrderId();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(resolvedOrderId));

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const loadedOrder = await getOrderById(resolvedOrderId);
        if (isMounted) setOrder(loadedOrder);
      } catch {
        if (isMounted) setOrder(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (resolvedOrderId) {
      load();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [resolvedOrderId]);

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.confirmationPanel}>
        <p className={styles.eyebrow}>Solicitud enviada</p>
        <h1>Solicitud de pedido registrada</h1>
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
              {order.total !== undefined && (
                <div>
                  <dt>Total estimado</dt>
                  <dd>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.total)}
                  </dd>
                </div>
              )}
            </dl>
            <p>
              Tu solicitud fue registrada correctamente. Un agente de ventas la revisará y se pondrá en contacto contigo para coordinar el pago y la entrega.
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
