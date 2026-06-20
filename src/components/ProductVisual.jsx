import styles from '../styles/App.module.css';

export default function ProductVisual({ product, large = false }) {
  return (
    <div
      className={`${styles.productVisual} ${large ? styles.productVisualLarge : ''}`}
      role="img"
      aria-label={`Imagen de referencia de ${product.name}`}
    >
      <span className={styles.packageBack} />
      <span className={styles.packageFront}>
        <span>{product.classification}</span>
      </span>
      <span className={styles.blister} />
    </div>
  );
}
