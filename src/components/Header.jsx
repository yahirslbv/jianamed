import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import styles from '../styles/App.module.css';

const publicNavItems = [
  { label: 'Inicio', href: '#/' },
  { label: 'Nuestra empresa', href: '#/empresa' },
  { label: 'Sucursales', href: '#/sucursales' },
  { label: 'Contacto', href: '#/contacto' },
];

const privateNavItems = [
  { label: 'Catalogo', href: '#/catalogo' },
  { label: 'Laboratorios', href: '#/laboratorios' },
  { label: 'Carrito', href: '#/carrito' },
  { label: 'Mi cuenta', href: '#/cuenta' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const { getCartItemCount } = useCart();
  const navItems = isAuthenticated ? privateNavItems : publicNavItems;
  const itemCount = getCartItemCount();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    window.location.hash = '/';
  };

  return (
    <header className={styles.header}>
      <a className={styles.brand} href={isAuthenticated ? '#/catalogo' : '#/'} aria-label="Tic Toc Pharma inicio">
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <span>
          <strong>Tic Toc Pharma</strong>
          <small>Distribuidora farmaceutica</small>
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
          <a
            key={item.href}
            className={item.href === '#/carrito' ? styles.cartNavLink : undefined}
            href={item.href}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
            {item.href === '#/carrito' && <span className={styles.cartCount}>{itemCount}</span>}
          </a>
        ))}
        {isAuthenticated ? (
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        ) : (
          <a className={styles.accessButton} href="#/login" onClick={() => setMenuOpen(false)}>
            Iniciar sesion
          </a>
        )}
        {isAuthenticated && <span className={styles.userPill}>{user.company}</span>}
      </nav>
    </header>
  );
}
