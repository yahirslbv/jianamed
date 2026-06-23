import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import ProductVisual from './ProductVisual.jsx';
import { formatCurrencyMXN } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

export default function ProductCard({ product, onViewDetails, canOrder = true }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className={styles.productCard}>
      <ProductVisual product={product} />
      <div className={styles.productContent}>
        <div className={styles.productTopline}>
          <span className={`${styles.badge} ${product.classification === 'RX' ? styles.badgeRx : styles.badgeOtc}`}>
            {product.classification}
          </span>
          {product.requiresPrescription && <span className={styles.prescriptionTag}>Requiere receta médica</span>}
          {product.offer && <span className={styles.offerTag}>Oferta</span>}
        </div>
        <p className={styles.folioBadge}>SKU · {product.sku}</p>
        <h3>{product.name}</h3>
        <p className={styles.productActiveIngredient}>Principio activo · {product.activeIngredient}</p>
        <div className={styles.productDescriptorRow}>
          <span className={styles.laboratoryBadge}>{product.laboratoryName}</span>
          <span className={styles.categoryBadge}>{product.category}</span>
        </div>
        <p className={styles.productPresentation}>{product.presentation}</p>
        <p className={`${styles.availability} ${isOutOfStock ? styles.outOfStock : ''}`}>
          {product.availability} · Stock {product.stock}
        </p>
        <div className={styles.productPrice}>
          {product.originalPrice > product.price && (
            <span className={styles.originalPrice}>Precio base {formatCurrencyMXN(product.originalPrice)}</span>
          )}
          <p className={styles.priceReference}>
            {product.offer ? 'Precio con oferta' : 'Precio unitario'} <strong>{formatCurrencyMXN(product.price)}</strong>
          </p>
          {product.offer && <small>{product.offer.title}</small>}
        </div>
        {canOrder && (
          <label className={styles.quantityControl}>
            Cantidad
            <input min="1" type="number" value={quantity} onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10) || 1)} />
          </label>
        )}
        <div className={styles.cardActions}>
          <button type="button" className={styles.secondarySmall} onClick={() => onViewDetails(product)}>Ver detalles</button>
          {canOrder && (
            <button type="button" className={styles.primarySmall} disabled={isOutOfStock} onClick={handleAddToCart}>
              {isOutOfStock ? 'Sin existencia' : 'Agregar al carrito'}
            </button>
          )}
        </div>
        {added && <p className={styles.addedMessage} role="status">Producto agregado al carrito.</p>}
      </div>
    </article>
  );
}
