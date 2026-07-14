import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrencyMXN } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const MAX_RESULTS = 40;

/**
 * Buscador con autocompletado para elegir un producto por nombre o SKU.
 * Sustituye al <select> plano, inviable con miles de productos.
 */
export default function ProductPicker({ products, value, onChange }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);

  const selected = useMemo(() => products.find((product) => product.id === value) || null, [products, value]);

  const results = useMemo(() => {
    const query_ = normalizeText(query);
    const pool = query_
      ? products.filter((product) => normalizeText(product.name).includes(query_) || normalizeText(product.sku).includes(query_))
      : products;
    return pool.slice(0, MAX_RESULTS);
  }, [products, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (product) => {
    onChange(product.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && results[highlighted]) select(results[highlighted]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (selected) {
    return (
      <div className={styles.productPickerSelected}>
        <span>
          <strong>{selected.name}</strong>
          <small>
            {selected.sku} · {formatCurrencyMXN(selected.originalPrice ?? selected.price)}
            {selected.isActive === false ? ' · inactivo' : ''}
          </small>
        </span>
        <button className={styles.textButton} type="button" onClick={() => onChange('')}>Cambiar</button>
      </div>
    );
  }

  return (
    <div className={styles.productPicker} ref={containerRef}>
      <input
        value={query}
        placeholder="Escribe el nombre o SKU del producto"
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setHighlighted(0); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-label="Buscar producto"
      />
      {isOpen && (
        <ul className={styles.productPickerList} role="listbox">
          {results.length === 0 && <li className={styles.productPickerEmpty}>Sin coincidencias para “{query}”</li>}
          {results.map((product, index) => (
            <li key={product.id}>
              <button
                type="button"
                className={`${styles.productPickerOption} ${index === highlighted ? styles.productPickerOptionActive : ''}`}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => select(product)}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.sku}{product.isActive === false ? ' · inactivo' : ''}</small>
                </span>
                <span className={styles.productPickerPrice}>{formatCurrencyMXN(product.originalPrice ?? product.price)}</span>
              </button>
            </li>
          ))}
          {results.length === MAX_RESULTS && <li className={styles.productPickerEmpty}>Hay más resultados — escribe más letras para afinar.</li>}
        </ul>
      )}
    </div>
  );
}
