import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import styles from '../styles/App.module.css';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, themePreference, setThemePreference } = useTheme();
  const roleLabel = { admin: 'Administración', sales: 'Ventas', supervisor: 'Supervisión', client: 'Cliente autorizado' }[user.role] || user.role;

  const handleLogout = async () => {
    await logout();
    window.location.hash = '/';
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Mi cuenta</p>
          <h1>Configuración y sesión</h1>
          <p>Administra tus preferencias de visualización y consulta los datos de la sesión activa.</p>
        </div>
      </div>

      <div className={styles.accountSettingsGrid}>
        <article className={styles.accountProfileCard}>
          <p className={styles.eyebrow}>Datos de sesión</p>
          <h2>{user.company}</h2>
          <dl className={styles.detailList}>
            <div><dt>Contacto</dt><dd>{user.name}</dd></div>
            <div><dt>Correo</dt><dd>{user.email}</dd></div>
            <div><dt>Rol</dt><dd>{roleLabel}</dd></div>
            <div><dt>Estado</dt><dd>Sesión activa</dd></div>
          </dl>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>Cerrar sesión</button>
        </article>

        <article className={styles.accountPreferencesCard}>
          <p className={styles.eyebrow}>Apariencia</p>
          <h2>Preferencias del portal</h2>
          <p className={styles.accountCardCopy}>Estas opciones se guardan en este navegador y no modifican la información comercial.</p>
          <div className={styles.preferenceControls}>
            <label>
              Tema
              <select value={themePreference} onChange={(event) => setThemePreference(event.target.value)}>
                <option value="system">Usar configuración del sistema</option>
                <option value="light">Tema claro</option>
                <option value="dark">Tema oscuro</option>
              </select>
              <small>Actualmente se muestra el tema {theme === 'dark' ? 'oscuro' : 'claro'}.</small>
            </label>
            <label>
              Idioma
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <small>La traducción inicial se aplica a los controles principales del portal.</small>
            </label>
          </div>
        </article>

        <article className={styles.accountUtilityCard}>
          <p className={styles.eyebrow}>Marca</p>
          <h2>Logo institucional</h2>
          <p className={styles.accountCardCopy}>El logo actual es temporal. Solicitar al cliente un PNG o SVG oficial, de buena calidad y con fondo transparente.</p>
          <span className={styles.accountNote}>Actualización de logo preparada para una etapa posterior.</span>
        </article>

        {user.role === 'admin' && (
          <article className={styles.accountAdminCard}>
            <p className={styles.eyebrow}>Administración</p>
            <h2>Accesos secundarios</h2>
            <p className={styles.accountCardCopy}>Herramientas administrativas fuera de la navegación principal.</p>
            <div className={styles.accountAdminLinks}>
              <a className={styles.secondarySmall} href="#/admin/ofertas">Ofertas</a>
              <a className={styles.secondarySmall} href="#/admin/reportes">Reportes</a>
              <a className={styles.secondarySmall} href="#/admin/auditoria">Auditoría</a>
              <a className={styles.secondarySmall} href="#/admin/usuarios">Cuentas internas</a>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
