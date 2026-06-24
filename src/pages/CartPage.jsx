import ProductVisual from '../components/ProductVisual.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatCurrencyMXN, multiplyMoney } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

export default function CartPage() {
  const { t } = useLanguage();
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSubtotal,
    getCartDiscount,
    getCartTotal,
    getCartItemCount,
  } = useCart();
  const isEmpty = items.length === 0;

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Carrito</p>
          <h1>{t('cart.title')}</h1>
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
          <h2>{t('cart.empty')}</h2>
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
                  <p>
                    {product.originalPrice > product.price && (
                      <span className={styles.originalPrice}>Precio base {formatCurrencyMXN(product.originalPrice)} </span>
                    )}
                    <span className={styles.appliedUnitPrice}>Precio unitario aplicado {formatCurrencyMXN(product.price)}</span>
                  </p>
                  {product.offer && <small className={styles.offerCopy}>{product.offer.title}</small>}
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
                <strong className={styles.cartLineSubtotal}>Subtotal {formatCurrencyMXN(multiplyMoney(product.price, quantity))}</strong>
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
                <dd>{formatCurrencyMXN(getCartSubtotal())}</dd>
              </div>
              <div>
                <dt>Descuentos</dt>
                <dd className={styles.discountValue}>-{formatCurrencyMXN(getCartDiscount())}</dd>
              </div>
              <div>
                <dt>Total estimado</dt>
                <dd>{formatCurrencyMXN(getCartTotal())}</dd>
              </div>
            </dl>
            <a className={styles.primaryButton} href="#/checkout">
              {t('cart.checkout')}
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
