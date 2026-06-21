import styles from '../styles/App.module.css';
import { availabilityOptions, presentations, productTypes } from '../data/products.js';

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
        Laboratorio
        <select
          value={filters.laboratory}
          onChange={(event) => onFilterChange('laboratory', event.target.value)}
        >
          <option value="">Todos</option>
          {laboratories.map((laboratory) => (
            <option key={laboratory.id} value={laboratory.id}>
              {laboratory.name}
            </option>
          ))}
        </select>
      </label>

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
        Clasificación
        <select
          value={filters.classification}
          onChange={(event) => onFilterChange('classification', event.target.value)}
        >
          <option value="">Todas</option>
          <option value="OTC">OTC</option>
          <option value="RX">RX</option>
          <option value="Material de curación">Material de curación</option>
          <option value="Suplemento">Suplemento</option>
          <option value="Naturismo">Naturismo</option>
          <option value="Perfumería">Perfumería</option>
        </select>
      </label>

      <label>
        Disponibilidad
        <select
          value={filters.availability}
          onChange={(event) => onFilterChange('availability', event.target.value)}
        >
          <option value="">Todas</option>
          {availabilityOptions.map((availability) => (
            <option key={availability.value} value={availability.value}>
              {availability.label}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.priceRange}>
        <label>
          Precio mínimo
          <input
            min="0"
            type="number"
            value={filters.minPrice}
            onChange={(event) => onFilterChange('minPrice', event.target.value)}
            placeholder="$0"
          />
        </label>
        <label>
          Precio máximo
          <input
            min="0"
            type="number"
            value={filters.maxPrice}
            onChange={(event) => onFilterChange('maxPrice', event.target.value)}
            placeholder="$999"
          />
        </label>
      </div>

      <label>
        Ordenamiento
        <select value={sortOrder} onChange={(event) => onSortChange(event.target.value)}>
          <option value="relevance">Relevancia</option>
          <option value="az">A-Z</option>
          <option value="priceAsc">Precio menor a mayor</option>
          <option value="priceDesc">Precio mayor a menor</option>
          <option value="stockDesc">Mayor existencia</option>
        </select>
      </label>
    </aside>
  );
}
