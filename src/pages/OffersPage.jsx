import { useEffect, useState } from 'react';
import { getActiveOffers } from '../services/offerService.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatDiscount } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function getDiscountLabel(offer) {
  return `${formatDiscount(offer)} de descuento`;
}

export default function OffersPage() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getActiveOffers()
      .then((loadedOffers) => {
        if (isMounted) setOffers(loadedOffers);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message || 'No fue posible cargar las ofertas.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Ofertas vigentes</p>
          <h1>{t('offers.title')}</h1>
          <p>Los precios se actualizan en el carrito y se validan al enviar la solicitud.</p>
        </div>
        <a className={styles.secondaryButton} href="#/catalogo">
          Explorar catálogo
        </a>
      </div>

      {error ? (
        <div className={styles.emptyState}>
          <h2>No fue posible cargar las ofertas</h2>
          <p>{error}</p>
        </div>
      ) : isLoading ? (
        <div className={styles.offerGrid} aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div className={styles.offerSkeleton} key={index} />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No hay ofertas vigentes</h2>
          <p>Consulta el catálogo para revisar los productos disponibles.</p>
          <a className={styles.primaryButton} href="#/catalogo">
            Ir al catálogo
          </a>
        </div>
      ) : (
        <div className={styles.offerGrid}>
          {offers.map((offer) => (
            <article className={styles.offerCard} key={offer.id}>
              <span className={styles.offerTag}>Oferta</span>
              <strong className={styles.offerValue}>{getDiscountLabel(offer)}</strong>
              <h2>{offer.title}</h2>
              <p>{offer.description || 'Condición comercial sujeta a validación final.'}</p>
              <dl>
                <div>
                  <dt>Aplica a</dt>
                  <dd>{offer.scope.label}</dd>
                </div>
                <div>
                  <dt>Vigencia</dt>
                  <dd>Hasta {dateFormatter.format(new Date(offer.endsAt))}</dd>
                </div>
              </dl>
              <a className={styles.secondarySmall} href="#/catalogo">
                Ver productos
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
