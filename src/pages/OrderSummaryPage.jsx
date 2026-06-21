import { useCart } from '../context/CartContext.jsx';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function OrderSummaryPage() {
  const { items, getCartTotal } = useCart();

  return (
    <section className={styles.section}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Resumen de pedido</p>
          <h1>Solicitud preparada</h1>
          <p>El flujo de compra/pedido sera habilitado en una siguiente etapa.</p>
        </div>
        <a className={styles.secondaryButton} href="#/carrito">
          Volver al carrito
        </a>
      </div>

      <div className={styles.summaryPanel}>
        <h2>Productos seleccionados</h2>
        {items.length === 0 ? (
          <p>No hay productos seleccionados.</p>
        ) : (
          <ul>
            {items.map(({ product, quantity }) => (
              <li key={product.id}>
                <span>
                  {product.name} · {product.sku}
                </span>
                <strong>
                  {quantity} x {currency.format(product.price)}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.summaryTotal}>
          <span>Total estimado</span>
          <strong>{currency.format(getCartTotal())}</strong>
        </div>
        <p className={styles.catalogNotice}>
          Estructura preparada para integrar direccion, facturacion, validacion de cliente,
          comprobantes, metodo de pago y confirmacion por agente.
        </p>
      </div>
    </section>
  );
}
