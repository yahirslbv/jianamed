import { useEffect, useMemo, useState } from 'react';
import FilterSidebar from '../components/FilterSidebar.jsx';
import ProductDetailModal from '../components/ProductDetailModal.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getLaboratories } from '../services/laboratoryService.js';
import { getProducts } from '../services/productService.js';
import styles from '../styles/App.module.css';

const initialFilters = {
  laboratory: '',
  category: '',
  type: '',
  presentation: '',
  classification: '',
  availability: '',
  minPrice: '',
  maxPrice: '',
};

function normalizeText(value) {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getSearchScore(product, query) {
  if (!query) return 0;
  const normalizedQuery = normalizeText(query);
  const fields = [
    { value: product.name, score: 6 },
    { value: product.sku, score: 6 },
    { value: product.activeIngredient, score: 4 },
    { value: product.laboratoryName, score: 3 },
    { value: product.category, score: 2 },
  ];

  return fields.reduce((score, field) => {
    return normalizeText(field.value).includes(normalizedQuery) ? score + field.score : score;
  }, 0);
}

function CatalogSkeleton() {
  return (
    <div className={styles.productGrid} aria-label="Cargando productos" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className={styles.productSkeleton} key={index}>
          <span className={styles.skeletonVisual} />
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
        </div>
      ))}
    </div>
  );
}

export default function CatalogPage({ initialLaboratory = '', initialCategory = '' }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const canOrder = user.role === 'client';

  useEffect(() => {
    if (initialLaboratory) {
      setFilters((currentFilters) => ({ ...currentFilters, laboratory: initialLaboratory }));
    }
  }, [initialLaboratory]);

  useEffect(() => {
    if (initialCategory) {
      setFilters((currentFilters) => ({ ...currentFilters, category: initialCategory }));
    }
  }, [initialCategory]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getProducts({ includeInactive: user.role === 'admin' ? 'true' : undefined }),
      getLaboratories({ includeInactive: user.role === 'admin' }),
    ])
      .then(([loadedProducts, loadedLaboratories]) => {
        if (!isMounted) return;
        setProducts(loadedProducts);
        setLaboratories(loadedLaboratories);
        setCatalogError('');
      })
      .catch((error) => {
        if (isMounted) setCatalogError(error.message);
      })
      .finally(() => {
        if (isMounted) setIsCatalogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user.role]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());
    const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice);

    const matches = products.filter((product) => {
      const textMatches =
        !normalizedQuery ||
        [
          product.name,
          product.sku,
          product.activeIngredient,
          product.laboratoryName,
          product.category,
        ]
          .map(normalizeText)
          .some((field) => field.includes(normalizedQuery));

      return (
        textMatches &&
        (!filters.laboratory || product.laboratoryId === filters.laboratory) &&
        (!filters.category || product.category === filters.category) &&
        (!filters.type || product.type === filters.type) &&
        (!filters.presentation || product.presentation === filters.presentation) &&
        (!filters.classification || product.classification === filters.classification) &&
        (!filters.availability || product.availabilityStatus === filters.availability) &&
        (minPrice === null || product.price >= minPrice) &&
        (maxPrice === null || product.price <= maxPrice)
      );
    });

    return [...matches].sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name);
      if (sortOrder === 'priceAsc') return a.price - b.price;
      if (sortOrder === 'priceDesc') return b.price - a.price;
      if (sortOrder === 'stockDesc') return b.stock - a.stock;

      const scoreDifference = getSearchScore(b, searchQuery) - getSearchScore(a, searchQuery);
      return scoreDifference || a.name.localeCompare(b.name);
    });
  }, [filters, products, searchQuery, sortOrder]);

  const handleFilterChange = (name, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const clearSearchAndFilters = () => {
    setSearchQuery('');
    setFilters(initialFilters);
    setSortOrder('relevance');
  };

  const hasActiveSearchOrFilters =
    Boolean(searchQuery.trim()) || Object.values(filters).some((value) => value !== '');

  return (
    <section className={`${styles.section} ${styles.catalogSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Catálogo privado</p>
          <h1>{t('catalog.title')}</h1>
          <p>
            Busca por producto, principio activo, laboratorio, categoría o SKU.{' '}
            {canOrder
              ? 'Agrega productos al carrito para preparar una solicitud de pedido.'
              : 'Consulta el catálogo como administrador para revisar disponibilidad y laboratorios.'}
          </p>
        </div>
        {canOrder && (
          <a className={styles.secondaryButton} href="#/carrito">
            Ver carrito
          </a>
        )}
      </div>

      <div className={styles.catalogNotice} role="note">
        La venta y suministro de productos sujetos a regulación se realizará únicamente conforme a
        los requisitos aplicables.
      </div>

      <div className={styles.catalogLayout}>
        <FilterSidebar
          categories={categoryOptions}
          laboratories={laboratories}
          filters={filters}
          sortOrder={sortOrder}
          onFilterChange={handleFilterChange}
          onSortChange={setSortOrder}
          onClearFilters={clearSearchAndFilters}
        />
        <div className={styles.catalogResults}>
          <div className={styles.resultsToolbar}>
            <div>
              <span>{isCatalogLoading ? 'Cargando productos' : `${filteredProducts.length} productos`}</span>
              <p>Resultados según búsqueda y filtros seleccionados.</p>
            </div>
            <div className={styles.catalogSearch}>
              <label className={styles.srOnly} htmlFor="catalog-search">
                Buscar en catálogo
              </label>
              <input
                id="catalog-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('catalog.search')}
              />
            </div>
            {hasActiveSearchOrFilters && (
              <button className={styles.secondarySmall} type="button" onClick={clearSearchAndFilters}>
                {t('catalog.clear')}
              </button>
            )}
          </div>
          {catalogError ? (
            <div className={styles.emptyState}>
              <h3>No fue posible cargar el catálogo</h3>
              <p>{catalogError}</p>
            </div>
          ) : isCatalogLoading ? (
            <CatalogSkeleton />
          ) : (
            filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No encontramos productos con esos filtros</h3>
                <p>Prueba con otra búsqueda o restablece los filtros para ver el catálogo completo.</p>
                <button className={styles.primarySmall} type="button" onClick={clearSearchAndFilters}>
                  {t('catalog.clear')}
                </button>
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                onViewDetails={setSelectedProduct}
                canOrder={canOrder}
              />
            )
          )}
        </div>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        canOrder={canOrder}
      />
    </section>
  );
}
