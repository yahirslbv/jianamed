import { useEffect } from 'react';
import ProductVisual from './ProductVisual.jsx';
import styles from '../styles/App.module.css';

export default function ProductDetailModal({ product, onClose }) {
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

  if (!product) {
    return null;
  }

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
            </div>
            <h2 id="product-detail-title">{product.name}</h2>
            <dl className={styles.detailList}>
              <div>
                <dt>Principio activo</dt>
                <dd>{product.activeIngredient}</dd>
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
                <dt>Laboratorio</dt>
                <dd>{product.laboratory}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Clasificacion</dt>
                <dd>{product.classification}</dd>
              </div>
              <div>
                <dt>Requiere receta</dt>
                <dd>{product.requiresPrescription ? 'Si' : 'No'}</dd>
              </div>
              <div>
                <dt>Disponibilidad</dt>
                <dd>{product.availability}</dd>
              </div>
            </dl>
            <p className={styles.safetyNotice}>
              La información mostrada es únicamente de carácter informativo. Consulte a su médico o
              farmacéutico. No se automedique.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
