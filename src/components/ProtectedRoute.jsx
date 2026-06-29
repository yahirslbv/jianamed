import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/App.module.css';

export default function ProtectedRoute({ children, path, navigate, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    // If the admin set a temporary password, force a change before anything else.
    // The /cambiar-contrasena page itself is exempt to avoid an infinite redirect.
    if (!isLoading && isAuthenticated && user?.forcePasswordChange && path !== '/cambiar-contrasena') {
      navigate('/cambiar-contrasena');
    }
  }, [isAuthenticated, isLoading, navigate, path, user?.forcePasswordChange]);

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

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Acceso denegado</p>
          <h1>No tienes permisos para esta sección</h1>
          <p>Esta ruta está reservada para roles autorizados dentro del portal.</p>
          <a className={styles.primaryButton} href={user.role === 'client' || user.role === 'admin' ? '#/catalogo' : '#/cuenta'}>
            Volver a mi cuenta
          </a>
        </div>
      </section>
    );
  }

  return children;
}
