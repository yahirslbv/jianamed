import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/App.module.css';

export default function ProtectedRoute({ children, path, navigate, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }, [isAuthenticated, navigate, path]);

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

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return (
      <section className={styles.section}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Acceso denegado</p>
          <h1>No tienes permisos para esta sección</h1>
          <p>Esta ruta está reservada para roles autorizados dentro del portal.</p>
          <a className={styles.primaryButton} href="#/catalogo">
            Volver al catálogo
          </a>
        </div>
      </section>
    );
  }

  return children;
}
