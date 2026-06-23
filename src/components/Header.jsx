import { useEffect, useRef, useState } from 'react';
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

const clientNavItems = [
  { labelKey: 'nav.home', href: '#/inicio-cliente' },
  { labelKey: 'nav.catalog', href: '#/catalogo' },
  { labelKey: 'nav.offers', href: '#/ofertas' },
  { labelKey: 'nav.cart', href: '#/carrito' },
  { labelKey: 'nav.orders', href: '#/mis-pedidos' },
];

const adminNavItems = [
  { labelKey: 'nav.catalog', href: '#/catalogo' },
  { label: 'Administración', href: '#/admin/productos' },
  { label: 'Pedidos', href: '#/admin/pedidos' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState(() => window.location.hash || '#/');
  const accountMenuRef = useRef(null);
  const { isAuthenticated, logout, user } = useAuth();
  const { getCartItemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const { themePreference, setThemePreference } = useTheme();
  const navItems = isAuthenticated ? (user.role === 'admin' ? adminNavItems : clientNavItems) : publicNavItems;
  const itemCount = getCartItemCount();

  useEffect(() => {
    const syncActiveHash = () => setActiveHash(window.location.hash || '#/');
    window.addEventListener('hashchange', syncActiveHash);
    return () => window.removeEventListener('hashchange', syncActiveHash);
  }, []);

  useEffect(() => {
    const closeAccountMenu = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        return;
      }
      if (event.type === 'mousedown' && !accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('keydown', closeAccountMenu);
    document.addEventListener('mousedown', closeAccountMenu);
    return () => {
      document.removeEventListener('keydown', closeAccountMenu);
      document.removeEventListener('mousedown', closeAccountMenu);
    };
  }, []);

  const closeMenus = () => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    closeMenus();
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
            className={[styles.navLink, item.href === activeHash ? styles.navLinkActive : '', item.href === '#/carrito' ? styles.cartNavLink : ''].filter(Boolean).join(' ')}
            href={item.href}
            onClick={closeMenus}
          >
            {item.labelKey ? t(item.labelKey) : item.label}
            {item.href === '#/carrito' && <span className={styles.cartCount}>{itemCount}</span>}
          </a>
        ))}
        {isAuthenticated ? (
          <div className={styles.accountMenu} ref={accountMenuRef}>
            <button
              className={`${styles.accountMenuButton} ${activeHash === '#/cuenta' ? styles.navLinkActive : ''}`}
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-controls="account-navigation"
              onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
            >
              {t('nav.account')}
              <span aria-hidden="true">⌄</span>
            </button>
            {accountMenuOpen && (
              <div className={styles.accountDropdown} id="account-navigation" role="menu" aria-label="Opciones de Mi cuenta">
                <a href="#/cuenta" role="menuitem" onClick={closeMenus}>Configuración y sesión</a>
                {user.role === 'client' && <a href="#/laboratorios" role="menuitem" onClick={closeMenus}>Catálogos por laboratorio</a>}
                {user.role === 'admin' && (
                  <>
                    <a href="#/admin/ofertas" role="menuitem" onClick={closeMenus}>Ofertas</a>
                    <a href="#/admin/reportes" role="menuitem" onClick={closeMenus}>Reportes</a>
                    <a href="#/admin/auditoria" role="menuitem" onClick={closeMenus}>Auditoría</a>
                  </>
                )}
                <div className={styles.accountDropdownSettings} role="group" aria-label="Preferencias">
                  <label>
                    Tema
                    <select value={themePreference} onChange={(event) => { setThemePreference(event.target.value); setAccountMenuOpen(false); }}>
                      <option value="system">Sistema</option>
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                    </select>
                  </label>
                  <label>
                    Idioma
                    <select value={language} onChange={(event) => { setLanguage(event.target.value); setAccountMenuOpen(false); }}>
                      <option value="es">ES</option>
                      <option value="en">EN</option>
                    </select>
                  </label>
                </div>
                <button className={styles.accountLogoutButton} type="button" role="menuitem" onClick={handleLogout}>
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <a className={styles.accessButton} href="#/login" onClick={closeMenus}>
            {t('nav.login')}
          </a>
        )}
      </nav>
    </header>
  );
}
