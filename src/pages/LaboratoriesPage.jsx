import { useEffect, useMemo, useState } from 'react';
import { getLaboratories } from '../services/laboratoryService.js';
import { getProducts } from '../services/productService.js';
import styles from '../styles/App.module.css';

const initialFilters = {
  laboratoryId: '',
  offer: '',
  productType: '',
  category: '',
  availability: '',
  healthFraction: '',
};

export default function LaboratoriesPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getLaboratories(), getProducts()])
      .then(([loadedLaboratories, loadedProducts]) => {
        if (!isMounted) return;
        setLaboratories(loadedLaboratories);
        setProducts(loadedProducts);
      })
      .catch(() => {
        if (!isMounted) return;
        setLaboratories([]);
        setProducts([]);
      });
    return () => { isMounted = false; };
  }, []);

  const filterOptions = useMemo(() => ({
    productTypes: Array.from(new Set(products.map((product) => product.productTypeLabel || product.productType).filter(Boolean))).sort(),
    categories: Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(),
    healthFractions: Array.from(new Set(products.map((product) => product.healthFraction).filter(Boolean))).sort(),
  }), [products]);

  const laboratorySummaries = useMemo(() => laboratories
    .filter((laboratory) => !filters.laboratoryId || laboratory.id === filters.laboratoryId)
    .map((laboratory) => {
      const allProducts = products.filter((product) => product.laboratoryId === laboratory.id);
      const matchingProducts = allProducts.filter((product) => (
        (!filters.offer || (filters.offer === 'active' ? Boolean(product.offer) : !product.offer))
        && (!filters.productType || (product.productTypeLabel || product.productType) === filters.productType)
        && (!filters.category || product.category === filters.category)
        && (!filters.healthFraction || product.healthFraction === filters.healthFraction)
        && (!filters.availability || (filters.availability === 'available' ? product.stock > 0 : product.stock <= 0))
      ));
      return {
        laboratory,
        allProducts,
        matchingProducts,
        offers: matchingProducts.filter((product) => product.offer).length,
      };
    })
    .filter((summary) => summary.matchingProducts.length > 0 || Object.values(filters).every((value) => !value)), [filters, laboratories, products]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Laboratorios aliados</p>
          <h1>Catálogos por laboratorio</h1>
          <p>Explora productos por laboratorio, tipo de medicamento y ofertas disponibles.</p>
        </div>
        <a className={styles.secondaryButton} href="#/catalogo">Ver catálogo completo</a>
      </div>

      <section className={styles.laboratoryFilters} aria-label="Filtros de catálogos por laboratorio">
        <div className={styles.laboratoryFiltersHeading}>
          <strong>Explorar catálogo</strong>
          <span>Filtros listos para crecer conforme se amplíe el catálogo.</span>
        </div>
        <label>Laboratorio
          <select value={filters.laboratoryId} onChange={(event) => updateFilter('laboratoryId', event.target.value)}>
            <option value="">Todos los laboratorios</option>
            {laboratories.map((laboratory) => <option key={laboratory.id} value={laboratory.id}>{laboratory.name}</option>)}
          </select>
        </label>
        <label>Ofertas
          <select value={filters.offer} onChange={(event) => updateFilter('offer', event.target.value)}>
            <option value="">Todas las condiciones</option>
            <option value="active">Con ofertas activas</option>
            <option value="none">Sin oferta activa</option>
          </select>
        </label>
        <label>Tipo de producto
          <select value={filters.productType} onChange={(event) => updateFilter('productType', event.target.value)}>
            <option value="">Todos los tipos</option>
            {filterOptions.productTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>Categoría
          <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
            <option value="">Todas las categorías</option>
            {filterOptions.categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>Disponibilidad
          <select value={filters.availability} onChange={(event) => updateFilter('availability', event.target.value)}>
            <option value="">Cualquier disponibilidad</option>
            <option value="available">Con existencia</option>
            <option value="out">Sin existencia</option>
          </select>
        </label>
        <label>Fracción sanitaria
          <select value={filters.healthFraction} onChange={(event) => updateFilter('healthFraction', event.target.value)}>
            <option value="">Todas las fracciones</option>
            {filterOptions.healthFractions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        {hasFilters && <button className={styles.textButton} type="button" onClick={() => setFilters(initialFilters)}>Limpiar filtros</button>}
      </section>

      {!laboratorySummaries.length ? (
        <div className={styles.emptyState}>
          <h2>Sin productos para estos filtros</h2>
          <p>Prueba con otra combinación para explorar los catálogos disponibles.</p>
          <button className={styles.secondarySmall} type="button" onClick={() => setFilters(initialFilters)}>Restablecer filtros</button>
        </div>
      ) : (
        <div className={styles.laboratoryGrid}>
          {laboratorySummaries.map(({ laboratory, allProducts, matchingProducts, offers }) => (
            <article className={styles.laboratoryCard} key={laboratory.id}>
              <div className={styles.laboratoryCardTopline}>
                <span className={styles.laboratoryStatus}>{laboratory.status || 'Catálogo activo'}</span>
                {offers > 0 && <span className={styles.offerTag}>{offers} {offers === 1 ? 'oferta activa' : 'ofertas activas'}</span>}
              </div>
              <h2>{laboratory.name}</h2>
              <p>{laboratory.description || laboratory.line || 'Línea disponible para clientes autorizados.'}</p>
              <div className={styles.laboratoryMetrics}>
                <span><strong>{matchingProducts.length}</strong> {hasFilters ? 'productos coincidentes' : 'productos'}</span>
                {hasFilters && <span>{allProducts.length} en el catálogo del laboratorio</span>}
              </div>
              <a className={styles.secondarySmall} href={`#/catalogo?laboratory=${encodeURIComponent(laboratory.id)}`}>Ver catálogo</a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
