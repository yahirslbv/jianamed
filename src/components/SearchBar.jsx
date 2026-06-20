import styles from '../styles/App.module.css';

export default function SearchBar({ value, onChange, id = 'main-search', compact = false }) {
  return (
    <div className={`${styles.searchBar} ${compact ? styles.searchCompact : ''}`}>
      <label className={styles.srOnly} htmlFor={id}>
        Buscar productos
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por nombre, marca o principio activo"
      />
      <span className={styles.searchIcon} aria-hidden="true">
        Buscar
      </span>
    </div>
  );
}
