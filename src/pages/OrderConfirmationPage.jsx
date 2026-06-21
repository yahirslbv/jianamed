import { getLastOrderId, getOrderById } from '../services/orderService.js';
import styles from '../styles/App.module.css';

export default function OrderConfirmationPage({ orderId }) {
  const resolvedOrderId = orderId || getLastOrderId();
  const order = resolvedOrderId ? getOrderById(resolvedOrderId) : null;

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.confirmationPanel}>
        <p className={styles.eyebrow}>Pedido creado</p>
        <h1>Solicitud de pedido enviada correctamente</h1>
        {order ? (
          <>
            <dl className={styles.detailList}>
              <div>
                <dt>Folio</dt>
                <dd>{order.folio}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{order.status}</dd>
              </div>
            </dl>
            <p>
              Un agente de ventas revisará la solicitud antes de continuar con el proceso de compra.
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
