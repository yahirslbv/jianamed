import { useState } from 'react';
import LogoMark from './LogoMark.jsx';
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
  { label: 'Catálogo', href: '#/catalogo', roles: ['client', 'admin'] },
  { label: 'Laboratorios', href: '#/laboratorios', roles: ['client', 'admin'] },
  { label: 'Carrito', href: '#/carrito', roles: ['client'] },
  { label: 'Mis pedidos', href: '#/mis-pedidos', roles: ['client'] },
  { label: 'Admin productos', href: '#/admin/productos', roles: ['admin'] },
  { label: 'Admin pedidos', href: '#/admin/pedidos', roles: ['admin'] },
  { label: 'Mi cuenta', href: '#/cuenta', roles: ['client', 'admin'] },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const { getCartItemCount } = useCart();
  const navItems = isAuthenticated
    ? privateNavItems.filter((item) => item.roles.includes(user.role))
    : publicNavItems;
  const itemCount = getCartItemCount();

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    window.location.hash = '/';
  };

  return (
    <header className={styles.header}>
      <a className={styles.brand} href={isAuthenticated ? '#/catalogo' : '#/'} aria-label="Tic Toc Pharma inicio">
        <LogoMark className={styles.brandMark} />
        <span>
          <strong>Tic Toc Pharma</strong>
          <small>Distribuidora farmacéutica</small>
        </span>
      </a>

      <button
        className={styles.menuButton}
        type="button"
        aria-label="Abrir navegación"
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
        aria-label="Navegación principal"
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
            Cerrar sesión
          </button>
        ) : (
          <a className={styles.accessButton} href="#/login" onClick={() => setMenuOpen(false)}>
            Iniciar sesión
          </a>
        )}
        {isAuthenticated && <span className={styles.userPill}>{user.company}</span>}
      </nav>
    </header>
  );
}
