import styles from '../styles/App.module.css';

export default function ProductVisual({ product, large = false }) {
  const visualLabel =
    product.classification === 'Material de curación' ? 'MC' : product.classification;

  if (product.image || product.imageUrl) {
    return (
      <div className={`${styles.productVisual} ${large ? styles.productVisualLarge : ''}`}>
        <img
          className={styles.productImage}
          src={product.image || product.imageUrl}
          alt={`Imagen de ${product.name}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.productVisual} ${large ? styles.productVisualLarge : ''}`}
      role="img"
      aria-label={`Imagen de referencia de ${product.name}`}
    >
      <span className={styles.packageBack} />
      <span className={styles.packageFront}>
        <span>{visualLabel}</span>
      </span>
      <span className={styles.blister} />
    </div>
  );
}
