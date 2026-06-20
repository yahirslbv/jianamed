import { useState } from 'react';
import styles from '../styles/App.module.css';

const navItems = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Catálogo', href: '#catalogo' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Sucursales', href: '#sucursales' },
  { label: 'Noticias', href: '#noticias' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#inicio" aria-label="Tic Toc Pharma inicio">
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <span>
          <strong>Tic Toc Pharma</strong>
          <small>Catálogo farmacéutico</small>
        </span>
      </a>

      <button
        className={styles.menuButton}
        type="button"
        aria-label="Abrir navegacion"
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        id="main-navigation"
        className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
        aria-label="Navegacion principal"
      >
        {navItems.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            {item.label}
          </a>
        ))}
        <a className={styles.accessButton} href="#contacto" onClick={() => setMenuOpen(false)}>
          Intranet
        </a>
      </nav>
    </header>
  );
}
