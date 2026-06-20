import ProductVisual from './ProductVisual.jsx';
import styles from '../styles/App.module.css';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function ProductCard({ product, onViewDetails }) {
  const whatsappText = encodeURIComponent(`Hola, quiero consultar disponibilidad de ${product.name}`);

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
            <span className={styles.prescriptionTag}>Requiere receta médica</span>
          )}
        </div>
        <h3>{product.name}</h3>
        <dl className={styles.productMeta}>
          <div>
            <dt>Principio activo</dt>
            <dd>{product.activeIngredient}</dd>
          </div>
          <div>
            <dt>Presentación</dt>
            <dd>{product.presentation}</dd>
          </div>
          <div>
            <dt>Laboratorio</dt>
            <dd>{product.laboratory}</dd>
          </div>
        </dl>
        <p className={styles.availability}>{product.availability}</p>
        <p className={styles.priceReference}>Precio ref. {currency.format(product.referencePrice)}</p>
        <div className={styles.cardActions}>
          <button type="button" className={styles.primarySmall} onClick={() => onViewDetails(product)}>
            Ver detalles
          </button>
          <a
            className={styles.secondarySmall}
            href={`https://wa.me/526641234567?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            Consultar
          </a>
        </div>
      </div>
    </article>
  );
}
