import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/App.module.css';

export default function ProtectedRoute({ children, path, navigate }) {
  const { isAuthenticated } = useAuth();

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
          <h1>Inicia sesion para consultar esta seccion</h1>
          <p>El catalogo y el carrito estan disponibles unicamente para usuarios autorizados.</p>
        </div>
      </section>
    );
  }

  return children;
}
