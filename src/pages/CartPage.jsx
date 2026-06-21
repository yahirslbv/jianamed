import ProductVisual from '../components/ProductVisual.jsx';
import { useCart } from '../context/CartContext.jsx';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemCount } = useCart();
  const isEmpty = items.length === 0;

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Carrito</p>
          <h1>Productos seleccionados</h1>
          <p>Revisa cantidades y prepara la solicitud de pedido para la siguiente etapa.</p>
        </div>
        {!isEmpty && (
          <button className={styles.secondaryButton} type="button" onClick={clearCart}>
            Vaciar carrito
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos desde el catálogo privado para iniciar una solicitud.</p>
          <a className={styles.primaryButton} href="#/catalogo">
            Ir al catálogo
          </a>
        </div>
      ) : (
        <div className={styles.cartLayout}>
          <div className={styles.cartItems}>
            {items.map(({ product, quantity }) => (
              <article className={styles.cartItem} key={product.id}>
                <ProductVisual product={product} />
                <div>
                  <p className={styles.skuText}>{product.sku}</p>
                  <h2>{product.name}</h2>
                  <p>
                    {product.laboratoryName} - {product.presentation}
                  </p>
                  <p>{currency.format(product.price)} por unidad</p>
                </div>
                <label className={styles.quantityControl}>
                  Cantidad
                  <input
                    min="1"
                    type="number"
                    value={quantity}
                    onChange={(event) => updateQuantity(product.id, event.target.value)}
                  />
                </label>
                <strong>{currency.format(product.price * quantity)}</strong>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => removeFromCart(product.id)}
                >
                  Eliminar
                </button>
              </article>
            ))}
          </div>

          <aside className={styles.cartSummary}>
            <h2>Resumen</h2>
            <dl>
              <div>
                <dt>Productos</dt>
                <dd>{getCartItemCount()}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(getCartTotal())}</dd>
              </div>
              <div>
                <dt>Total estimado</dt>
                <dd>{currency.format(getCartTotal())}</dd>
              </div>
            </dl>
            <a className={styles.primaryButton} href="#/resumen">
              Solicitar pedido
            </a>
            <p>
              El total es estimado y podrá validarse por un agente cuando se habilite el flujo de
              pedido.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
