import { useState } from 'react';
import LogoMark from './LogoMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import styles from '../styles/App.module.css';

const publicNavItems = [
  { label: 'Inicio', href: '#/' },
  { label: 'Nuestra empresa', href: '#/empresa' },
  { label: 'Sucursales', href: '#/sucursales' },
  { label: 'Contacto', href: '#/contacto' },
];

const privateNavItems = [
  { labelKey: 'nav.home', href: '#/inicio-cliente', roles: ['client'] },
  { labelKey: 'nav.catalog', href: '#/catalogo', roles: ['client', 'admin'] },
  { labelKey: 'nav.offers', href: '#/ofertas', roles: ['client'] },
  { labelKey: 'nav.laboratories', href: '#/laboratorios', roles: ['client', 'admin'] },
  { labelKey: 'nav.cart', href: '#/carrito', roles: ['client'] },
  { labelKey: 'nav.orders', href: '#/mis-pedidos', roles: ['client'] },
  { label: 'Admin productos', href: '#/admin/productos', roles: ['admin'] },
  { label: 'Admin ofertas', href: '#/admin/ofertas', roles: ['admin'] },
  { label: 'Reportes', href: '#/admin/reportes', roles: ['admin'] },
  { label: 'Auditoria', href: '#/admin/auditoria', roles: ['admin'] },
  { label: 'Admin pedidos', href: '#/admin/pedidos', roles: ['admin'] },
  { labelKey: 'nav.account', href: '#/cuenta', roles: ['client', 'admin'] },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const { getCartItemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
            {item.labelKey ? t(item.labelKey) : item.label}
            {item.href === '#/carrito' && <span className={styles.cartCount}>{itemCount}</span>}
          </a>
        ))}
        {isAuthenticated ? (
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        ) : (
          <a className={styles.accessButton} href="#/login" onClick={() => setMenuOpen(false)}>
            {t('nav.login')}
          </a>
        )}
        <label className={styles.languageSelect}>
          <span className={styles.srOnly}>Idioma</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
        </label>
        <button
          className={styles.themeToggle}
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {theme === 'dark' ? '☀' : '◐'}
        </button>
        {isAuthenticated && <span className={styles.userPill}>{user.company}</span>}
      </nav>
    </header>
  );
}
