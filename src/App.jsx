import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import CategoryCard from './components/CategoryCard.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import ProductDetailModal from './components/ProductDetailModal.jsx';
import BranchesSection from './components/BranchesSection.jsx';
import NewsCard from './components/NewsCard.jsx';
import ContactSection from './components/ContactSection.jsx';
import Footer from './components/Footer.jsx';
import { branches } from './data/branches.js';
import { categories } from './data/categories.js';
import { news } from './data/news.js';
import { products } from './data/products.js';
import styles from './styles/App.module.css';

const initialFilters = {
  category: '',
  laboratory: '',
  type: '',
  presentation: '',
  requiresPrescription: '',
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
    { value: product.name, score: 5 },
    { value: product.activeIngredient, score: 4 },
    { value: product.laboratory, score: 3 },
    { value: product.category, score: 2 },
    { value: product.type, score: 1 },
  ];

  return fields.reduce((score, field) => {
    return normalizeText(field.value).includes(normalizedQuery) ? score + field.score : score;
  }, 0);
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [],
  );

  const laboratoryOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.laboratory))).sort(),
    [],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery.trim());

    const matches = products.filter((product) => {
      const textMatches =
        !normalizedQuery ||
        [product.name, product.activeIngredient, product.laboratory, product.category]
          .map(normalizeText)
          .some((field) => field.includes(normalizedQuery));

      const prescriptionMatches =
        !filters.requiresPrescription ||
        (filters.requiresPrescription === 'yes' && product.requiresPrescription) ||
        (filters.requiresPrescription === 'no' && !product.requiresPrescription);

      return (
        textMatches &&
        (!filters.category || product.category === filters.category) &&
        (!filters.laboratory || product.laboratory === filters.laboratory) &&
        (!filters.type || product.type === filters.type) &&
        (!filters.presentation || product.presentation === filters.presentation) &&
        prescriptionMatches
      );
    });

    return [...matches].sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name);
      if (sortOrder === 'priceAsc') return a.referencePrice - b.referencePrice;
      if (sortOrder === 'priceDesc') return b.referencePrice - a.referencePrice;

      const scoreDifference = getSearchScore(b, searchQuery) - getSearchScore(a, searchQuery);
      return scoreDifference || a.name.localeCompare(b.name);
    });
  }, [filters, searchQuery, sortOrder]);

  const handleFilterChange = (name, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleCategorySelect = (categoryName) => {
    setFilters((currentFilters) => ({ ...currentFilters, category: categoryName }));
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.app}>
      <Header />
      <main>
        <Hero searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <section className={styles.section} id="categorias" aria-labelledby="categories-title">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Categorías destacadas</p>
            <h2 id="categories-title">Productos organizados para consulta rapida</h2>
            <p>
              Explora medicamentos, productos de mostrador, insumos de curación y cuidado personal.
            </p>
          </div>
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onSelect={handleCategorySelect}
              />
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.catalogSection}`} id="catalogo">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Catálogo</p>
            <h2>Búsqueda y filtros de productos</h2>
            <p>
              Filtra por nombre, principio activo, laboratorio, categoría, presentación y receta.
            </p>
          </div>

          <div className={styles.catalogNotice} role="note">
            La información del catálogo es únicamente informativa. Consulte a su médico o
            farmacéutico. No se automedique.
          </div>

          <div className={styles.catalogLayout}>
            <FilterSidebar
              categories={categoryOptions}
              laboratories={laboratoryOptions}
              filters={filters}
              sortOrder={sortOrder}
              onFilterChange={handleFilterChange}
              onSortChange={setSortOrder}
              onClearFilters={() => setFilters(initialFilters)}
            />
            <div className={styles.catalogResults}>
              <div className={styles.resultsToolbar}>
                <div>
                  <span>{filteredProducts.length} productos</span>
                  <p>Resultados segun busqueda y filtros seleccionados.</p>
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
                    placeholder="Buscar por nombre, marca o principio activo"
                  />
                </div>
              </div>
              <ProductGrid products={filteredProducts} onViewDetails={setSelectedProduct} />
            </div>
          </div>
        </section>

        <BranchesSection branches={branches} />

        <section className={styles.section} id="noticias">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Noticias</p>
            <h2>Comunicados y actualizaciones</h2>
            <p>Informacion institucional, horarios y canales de consulta.</p>
          </div>
          <div className={styles.newsGrid}>
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        <ContactSection />
      </main>
      <Footer />
      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
