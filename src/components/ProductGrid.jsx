import ProductCard from './ProductCard.jsx';
import styles from '../styles/App.module.css';

export default function ProductGrid({ products, onViewDetails, canOrder = true }) {
  if (products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No encontramos productos con esos filtros</h3>
        <p>Intenta cambiar la búsqueda, laboratorio, categoría, disponibilidad o rango de precio.</p>
      </div>
    );
  }

  return (
    <div className={styles.productGrid}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onViewDetails={onViewDetails}
          canOrder={canOrder}
        />
      ))}
    </div>
  );
}
