import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import ProductVisual from './ProductVisual.jsx';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function ProductCard({ product, onViewDetails }) {
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
          <span
            className={`${styles.badge} ${
              product.classification === 'RX' ? styles.badgeRx : styles.badgeOtc
            }`}
          >
            {product.classification}
          </span>
          {product.requiresPrescription && (
            <span className={styles.prescriptionTag}>Requiere receta medica</span>
          )}
        </div>
        <p className={styles.skuText}>{product.sku}</p>
        <h3>{product.name}</h3>
        <dl className={styles.productMeta}>
          <div>
            <dt>Principio activo</dt>
            <dd>{product.activeIngredient}</dd>
          </div>
          <div>
            <dt>Laboratorio</dt>
            <dd>{product.laboratoryName}</dd>
          </div>
          <div>
            <dt>Presentacion</dt>
            <dd>{product.presentation}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{product.category}</dd>
          </div>
        </dl>
        <p className={`${styles.availability} ${isOutOfStock ? styles.outOfStock : ''}`}>
          {product.availability} · Stock {product.stock}
        </p>
        <p className={styles.priceReference}>{currency.format(product.price)}</p>
        <label className={styles.quantityControl}>
          Cantidad
          <input
            min="1"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10) || 1)}
          />
        </label>
        <div className={styles.cardActions}>
          <button type="button" className={styles.secondarySmall} onClick={() => onViewDetails(product)}>
            Ver detalles
          </button>
          <button
            type="button"
            className={styles.primarySmall}
            disabled={isOutOfStock}
            onClick={handleAddToCart}
          >
            {isOutOfStock ? 'Sin existencia' : 'Agregar al carrito'}
          </button>
        </div>
        {added && (
          <p className={styles.addedMessage} role="status">
            Producto agregado al carrito.
          </p>
        )}
      </div>
    </article>
  );
}
