import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleHome } from '../utils/routeAccess.js';
import styles from '../styles/App.module.css';

export default function ProtectedRoute({ children, path, navigate, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isRoleBlocked = Boolean(
    !isLoading && isAuthenticated && allowedRoles?.length && user && !allowedRoles.includes(user.role),
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    // If the admin set a temporary password, force a change before anything else.
    // The /cambiar-contrasena page itself is exempt to avoid an infinite redirect.
    if (!isLoading && isAuthenticated && user?.forcePasswordChange && path !== '/cambiar-contrasena') {
      navigate('/cambiar-contrasena');
      return;
    }
    if (isRoleBlocked) {
      navigate(getRoleHome(user.role));
    }
  }, [isAuthenticated, isLoading, navigate, path, user?.forcePasswordChange, user?.role, isRoleBlocked]);

  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Verificando sesión</p>
          <h1>Preparando tu acceso</h1>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Acceso requerido</p>
          <h1>Inicia sesión para consultar esta sección</h1>
          <p>El catálogo y el carrito están disponibles únicamente para usuarios autorizados.</p>
        </div>
      </section>
    );
  }

  // Show a neutral gate while the redirect to /cambiar-contrasena takes effect
  if (user?.forcePasswordChange && path !== '/cambiar-contrasena') {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Acción requerida</p>
          <h1>Debes establecer tu contraseña antes de continuar</h1>
        </div>
      </section>
    );
  }

  // Neutral gate while the redirect to the role home takes effect
  if (isRoleBlocked) {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Redirigiendo</p>
          <h1>Esta sección no está disponible para tu perfil</h1>
          <p>Te estamos llevando a tu página de inicio.</p>
        </div>
      </section>
    );
  }

  return children;
}
