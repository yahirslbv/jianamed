import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getActiveOffers } from '../services/offerService.js';
import { getOrders } from '../services/orderService.js';
import { getProducts } from '../services/productService.js';
import { formatCurrencyMXN, formatDiscount } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function getDiscountLabel(offer) {
  return formatDiscount(offer);
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getCartItemCount } = useCart();
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getProducts(), getActiveOffers(), getOrders()])
      .then(([loadedProducts, loadedOffers, loadedOrders]) => {
        if (!isMounted) return;
        setProducts(loadedProducts);
        setOffers(loadedOffers);
        setOrders(loadedOrders);
      })
      .catch(() => {
        // Individual destination pages remain available if a dashboard request fails.
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).filter(Boolean).slice(0, 6),
    [products],
  );
  const featuredProducts = useMemo(
    () => products.filter((product) => product.offer).slice(0, 3).concat(
      products.filter((product) => !product.offer).slice(0, Math.max(0, 3 - products.filter((product) => product.offer).length)),
    ),
    [products],
  );

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.dashboardHero}>
        <div>
          <p className={styles.eyebrow}>Portal B2B</p>
          <h1>{t('dashboard.greeting')}, {user.name}</h1>
          <p>Consulta condiciones comerciales, prepara solicitudes y da seguimiento a tus pedidos.</p>
        </div>
        <a className={styles.primaryButton} href="#/catalogo">
          {t('dashboard.explore')}
        </a>
      </div>

      <div className={styles.dashboardQuickGrid}>
        <a className={styles.dashboardAction} href="#/catalogo">
          <strong>Catálogo</strong>
          <span>Productos y disponibilidad</span>
        </a>
        <a className={styles.dashboardAction} href="#/ofertas">
          <strong>Ofertas</strong>
          <span>{offers.length} vigentes</span>
        </a>
        <a className={styles.dashboardAction} href="#/carrito">
          <strong>Carrito</strong>
          <span>{getCartItemCount()} productos seleccionados</span>
        </a>
        <a className={styles.dashboardAction} href="#/mis-pedidos">
          <strong>Mis pedidos</strong>
          <span>{orders.length} solicitudes registradas</span>
        </a>
      </div>

      <div className={styles.dashboardColumns}>
        <section className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHeader}>
            <div>
              <p className={styles.eyebrow}>Categorías</p>
              <h2>Explora por línea</h2>
            </div>
            <a href="#/catalogo">Ver catálogo</a>
          </div>
          {isLoading ? (
            <p className={styles.dashboardMuted}>Cargando categorías...</p>
          ) : (
            <div className={styles.dashboardCategoryList}>
              {categories.map((category) => (
                <a key={category} href={`#/catalogo?category=${encodeURIComponent(category)}`}>
                  {category}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelHeader}>
            <div>
              <p className={styles.eyebrow}>Pedidos recientes</p>
              <h2>Seguimiento</h2>
            </div>
            <a href="#/mis-pedidos">Ver todos</a>
          </div>
          {isLoading ? (
            <p className={styles.dashboardMuted}>Cargando pedidos...</p>
          ) : orders.length ? (
            <div className={styles.dashboardOrderList}>
              {orders.slice(0, 3).map((order) => (
                <a href="#/mis-pedidos" key={order.id}>
                  <span>
                    <strong>{order.folio}</strong>
                    <small>{dateFormatter.format(new Date(order.createdAt))}</small>
                  </span>
                  <span>
                    <em>{order.status}</em>
                    <strong>{formatCurrencyMXN(order.total)}</strong>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className={styles.dashboardMuted}>Aún no tienes solicitudes registradas.</p>
          )}
        </section>
      </div>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardPanelHeader}>
          <div>
            <p className={styles.eyebrow}>Ofertas activas</p>
            <h2>Condiciones comerciales destacadas</h2>
          </div>
          <a href="#/ofertas">Ver ofertas</a>
        </div>
        <div className={styles.dashboardOfferStrip}>
          {offers.slice(0, 3).map((offer) => (
            <article key={offer.id}>
              <span className={styles.offerTag}>{getDiscountLabel(offer)}</span>
              <strong>{offer.title}</strong>
              <small>{offer.scope.label}</small>
            </article>
          ))}
          {!isLoading && !offers.length && <p className={styles.dashboardMuted}>No hay ofertas vigentes.</p>}
        </div>
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardPanelHeader}>
          <div>
            <p className={styles.eyebrow}>Catálogo destacado</p>
            <h2>Productos con disponibilidad</h2>
          </div>
          <a href="#/catalogo">Explorar</a>
        </div>
        <div className={styles.dashboardProductStrip}>
          {featuredProducts.map((product) => (
            <a href="#/catalogo" key={product.id}>
              <span>{product.offer ? 'Oferta activa' : product.category}</span>
              <strong>{product.name}</strong>
              <small className={styles.dashboardProductMeta}>{product.activeIngredient || product.presentation}</small>
              <small className={styles.dashboardProductPrice}>{product.offer ? 'Precio con oferta ' : 'Precio unitario '}{formatCurrencyMXN(product.price)}</small>
            </a>
          ))}
          {!isLoading && !featuredProducts.length && <p className={styles.dashboardMuted}>No hay productos disponibles.</p>}
        </div>
      </section>

      <p className={styles.dashboardNotice}>
        Las solicitudes B2B están sujetas a revisión de disponibilidad, requisitos regulatorios y condiciones comerciales por un agente de ventas.
      </p>
    </section>
  );
}
