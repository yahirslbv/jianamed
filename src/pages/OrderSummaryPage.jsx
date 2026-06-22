import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { createOrder } from '../services/orderService.js';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function OrderSummaryPage() {
  const { user } = useAuth();
  const { items, clearCart, getCartTotal } = useCart();
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEmpty = items.length === 0;

  const handleConfirmOrder = async () => {
    if (isEmpty) {
      setError('Agrega productos al carrito antes de confirmar una solicitud.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const order = await createOrder({ user, items, observations });
      clearCart();
      window.location.hash = `/pedido-confirmado?id=${order.id}`;
    } catch (requestError) {
      setError(requestError.message || 'No fue posible crear la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Resumen de pedido</p>
          <h1>Confirmar solicitud</h1>
          <p>
            Revisa los productos seleccionados. Un agente de ventas validará la solicitud antes de
            continuar con el proceso de compra.
          </p>
        </div>
        <a className={styles.secondaryButton} href={isEmpty ? '#/catalogo' : '#/carrito'}>
          {isEmpty ? 'Volver al catálogo' : 'Volver al carrito'}
        </a>
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <h2>No hay productos para solicitar</h2>
          <p>Agrega productos desde el catálogo para preparar una solicitud de pedido.</p>
          <a className={styles.primaryButton} href="#/catalogo">
            Ir al catálogo
          </a>
        </div>
      ) : (
        <div className={styles.orderReviewLayout}>
          <div className={styles.summaryPanel}>
            <h2>Productos seleccionados</h2>
            <div className={styles.orderTable}>
              <div className={styles.orderTableHeader}>
                <span>Producto</span>
                <span>Laboratorio</span>
                <span>Presentación</span>
                <span>Cantidad</span>
                <span>Unitario</span>
                <span>Subtotal</span>
              </div>
              {items.map(({ product, quantity }) => (
                <div className={styles.orderTableRow} key={product.id}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku}</small>
                  </span>
                  <span>{product.laboratoryName}</span>
                  <span>{product.presentation}</span>
                  <span>{quantity}</span>
                  <span>{currency.format(product.price)}</span>
                  <span>{currency.format(product.price * quantity)}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>Subtotal general</span>
              <strong>{currency.format(getCartTotal())}</strong>
            </div>
          </div>

          <aside className={styles.orderSidePanel}>
            <h2>Cliente</h2>
            <dl className={styles.detailList}>
              <div>
                <dt>Cliente</dt>
                <dd>{user.company || user.name}</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Estado inicial</dt>
                <dd>Pendiente de revisión</dd>
              </div>
            </dl>
            <label>
              Observaciones del cliente
              <textarea
                rows="5"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Notas internas para el agente de ventas"
              />
            </label>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmOrder}
            >
              {isSubmitting ? 'Enviando solicitud...' : 'Confirmar solicitud de pedido'}
            </button>
            {error && (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            )}
            <p className={styles.catalogNotice}>
              No se procesará pago en esta etapa. La solicitud será revisada por un agente.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
