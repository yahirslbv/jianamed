import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { createOrder } from '../services/orderService.js';
import { formatCurrencyMXN, multiplyMoney } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

function createCheckout(user) {
  const customer = user.customer || {};
  return {
    clientName: user.company || user.name || '',
    clientEmail: user.email || '',
    deliveryAddress: customer.address || '',
    deliveryCity: customer.city || '',
    deliveryState: customer.state || '',
    deliveryPostalCode: customer.postalCode || '',
    billingBusinessName: customer.businessName || user.company || '',
    billingRfc: customer.rfc || '',
    billingAddress: customer.address || '',
    responsibleName: customer.contactName || user.name || '',
    responsiblePhone: customer.phone || '',
  };
}

export default function OrderSummaryPage() {
  const { user } = useAuth();
  const { items, clearCart, getCartSubtotal, getCartDiscount, getCartTotal } = useCart();
  const [observations, setObservations] = useState('');
  const [checkout, setCheckout] = useState(() => createCheckout(user));
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
      const order = await createOrder({ user, items, observations, checkout });
      clearCart();
      window.location.hash = `/pedido-confirmado?id=${order.id}`;
    } catch (requestError) {
      setError(requestError.message || 'No fue posible crear la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCheckout = (field, value) => {
    setCheckout((current) => ({ ...current, [field]: value }));
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
                  <span>
                    {product.originalPrice > product.price && (
                      <small className={styles.originalPrice}>Base {formatCurrencyMXN(product.originalPrice)} </small>
                    )}
                    {formatCurrencyMXN(product.price)}
                  </span>
                  <span>{formatCurrencyMXN(multiplyMoney(product.price, quantity))}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>Subtotal</span>
              <strong>{formatCurrencyMXN(getCartSubtotal())}</strong>
              <span>Descuentos</span>
              <strong className={styles.discountValue}>-{formatCurrencyMXN(getCartDiscount())}</strong>
              <span>Total estimado</span>
              <strong>{formatCurrencyMXN(getCartTotal())}</strong>
            </div>
          </div>

          <aside className={styles.orderSidePanel}>
            <h2>Datos de solicitud</h2>
            <div className={styles.checkoutFormGrid}>
              <label>
                Cliente
                <input value={checkout.clientName} onChange={(event) => updateCheckout('clientName', event.target.value)} required />
              </label>
              <label>
                Correo de contacto
                <input type="email" value={checkout.clientEmail} onChange={(event) => updateCheckout('clientEmail', event.target.value)} required />
              </label>
              <label className={styles.checkoutFullWidth}>
                Direccion de entrega
                <input value={checkout.deliveryAddress} onChange={(event) => updateCheckout('deliveryAddress', event.target.value)} required />
              </label>
              <label>
                Ciudad
                <input value={checkout.deliveryCity} onChange={(event) => updateCheckout('deliveryCity', event.target.value)} required />
              </label>
              <label>
                Estado
                <input value={checkout.deliveryState} onChange={(event) => updateCheckout('deliveryState', event.target.value)} required />
              </label>
              <label>
                Codigo postal
                <input value={checkout.deliveryPostalCode} onChange={(event) => updateCheckout('deliveryPostalCode', event.target.value)} required />
              </label>
              <label>
                Responsable
                <input value={checkout.responsibleName} onChange={(event) => updateCheckout('responsibleName', event.target.value)} required />
              </label>
              <label>
                Telefono responsable
                <input type="tel" value={checkout.responsiblePhone} onChange={(event) => updateCheckout('responsiblePhone', event.target.value)} required />
              </label>
              <label className={styles.checkoutFullWidth}>
                Razon social
                <input value={checkout.billingBusinessName} onChange={(event) => updateCheckout('billingBusinessName', event.target.value)} />
              </label>
              <label>
                RFC
                <input value={checkout.billingRfc} onChange={(event) => updateCheckout('billingRfc', event.target.value)} />
              </label>
              <label>
                Direccion fiscal
                <input value={checkout.billingAddress} onChange={(event) => updateCheckout('billingAddress', event.target.value)} />
              </label>
            </div>
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
              La solicitud sera revisada por un agente antes de confirmar disponibilidad, condiciones comerciales y surtido.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
