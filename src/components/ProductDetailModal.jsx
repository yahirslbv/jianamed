import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import ProductVisual from './ProductVisual.jsx';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function ProductDetailModal({ product, onClose, canOrder = true }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!product) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [product, onClose]);

  useEffect(() => {
    setQuantity(1);
    setAdded(false);
  }, [product]);

  if (!product) {
    return null;
  }

  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
  };

  return (
    <div className={styles.modalOverlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Cerrar detalle">
          Cerrar
        </button>
        <div className={styles.modalGrid}>
          <ProductVisual product={product} large />
          <div className={styles.modalContent}>
            <div className={styles.productTopline}>
              <span
                className={`${styles.badge} ${
                  product.classification === 'RX' ? styles.badgeRx : styles.badgeOtc
                }`}
              >
                {product.classification}
              </span>
              {product.requiresPrescription && (
                <span className={styles.prescriptionTag}>Requiere receta médica</span>
              )}
              {product.offer && <span className={styles.offerTag}>Oferta</span>}
            </div>
            <p className={styles.skuText}>{product.sku}</p>
            <h2 id="product-detail-title">{product.name}</h2>
            <dl className={styles.detailList}>
              <div>
                <dt>Principio activo</dt>
                <dd>{product.activeIngredient}</dd>
              </div>
              <div>
                <dt>Laboratorio</dt>
                <dd>{product.laboratoryName}</dd>
              </div>
              <div>
                <dt>Presentación</dt>
                <dd>{product.presentation}</dd>
              </div>
              <div>
                <dt>Concentración</dt>
                <dd>{product.concentration}</dd>
              </div>
              <div>
                <dt>Forma farmacéutica</dt>
                <dd>{product.pharmaceuticalForm}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Clasificación</dt>
                <dd>{product.classification}</dd>
              </div>
              <div>
                <dt>Requiere receta</dt>
                <dd>{product.requiresPrescription ? 'Sí' : 'No'}</dd>
              </div>
              <div>
                <dt>Disponibilidad</dt>
                <dd>
                  {product.availability} - Stock {product.stock}
                </dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd className={styles.modalPrice}>
                  {product.originalPrice > product.price && (
                    <span className={styles.originalPrice}>{currency.format(product.originalPrice)}</span>
                  )}
                  <strong>{currency.format(product.price)}</strong>
                </dd>
              </div>
            </dl>
            <p className={styles.productDescription}>{product.description}</p>
            {canOrder ? (
              <div className={styles.modalCartRow}>
                <label className={styles.quantityControl}>
                  Cantidad
                  <input
                    min="1"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10) || 1)}
                  />
                </label>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                >
                  {isOutOfStock ? 'Sin existencia' : 'Agregar al carrito'}
                </button>
              </div>
            ) : (
              <p className={styles.catalogNotice}>
                Vista administrativa del producto. La solicitud de pedido está disponible para
                clientes autorizados.
              </p>
            )}
            {added && (
              <p className={styles.addedMessage} role="status">
                Producto agregado al carrito.
              </p>
            )}
            <p className={styles.safetyNotice}>
              La información mostrada es únicamente de carácter informativo. La venta y suministro
              de productos sujetos a regulación se realizará únicamente conforme a los requisitos
              aplicables.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
