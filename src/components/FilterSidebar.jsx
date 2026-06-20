import styles from '../styles/App.module.css';
import { presentations, productTypes } from '../data/products.js';

export default function FilterSidebar({
  categories,
  laboratories,
  filters,
  sortOrder,
  onFilterChange,
  onSortChange,
  onClearFilters,
}) {
  return (
    <aside className={styles.filters} aria-label="Filtros de catálogo">
      <div className={styles.filtersHeader}>
        <h3>Filtros</h3>
        <button type="button" className={styles.textButton} onClick={onClearFilters}>
          Limpiar
        </button>
      </div>

      <label>
        Categoría
        <select
          value={filters.category}
          onChange={(event) => onFilterChange('category', event.target.value)}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label>
        Marca / laboratorio
        <select
          value={filters.laboratory}
          onChange={(event) => onFilterChange('laboratory', event.target.value)}
        >
          <option value="">Todos</option>
          {laboratories.map((laboratory) => (
            <option key={laboratory} value={laboratory}>
              {laboratory}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tipo de producto
        <select value={filters.type} onChange={(event) => onFilterChange('type', event.target.value)}>
          <option value="">Todos</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        Presentación
        <select
          value={filters.presentation}
          onChange={(event) => onFilterChange('presentation', event.target.value)}
        >
          <option value="">Todas</option>
          {presentations.map((presentation) => (
            <option key={presentation} value={presentation}>
              {presentation}
            </option>
          ))}
        </select>
      </label>

      <label>
        Requiere receta
        <select
          value={filters.requiresPrescription}
          onChange={(event) => onFilterChange('requiresPrescription', event.target.value)}
        >
          <option value="">Todos</option>
          <option value="yes">Si</option>
          <option value="no">No</option>
        </select>
      </label>

      <label>
        Ordenamiento
        <select value={sortOrder} onChange={(event) => onSortChange(event.target.value)}>
          <option value="relevance">Relevancia</option>
          <option value="az">A-Z</option>
          <option value="priceAsc">Precio menor a mayor</option>
          <option value="priceDesc">Precio mayor a menor</option>
        </select>
      </label>
    </aside>
  );
}
