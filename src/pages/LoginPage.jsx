import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import styles from '../styles/App.module.css';

export default function LoginPage({ redirectTo = '', navigate }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('cliente@demo.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const useDemoAccess = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await login({ email, password });
    setIsSubmitting(false);

    if (result.ok) {
      navigate(redirectTo || (result.user?.role === 'client' ? '/inicio-cliente' : result.user?.role === 'admin' ? '/catalogo' : '/cuenta'));
      return;
    }

    setError(result.message);
  };

  return (
    <section className={`${styles.section} ${styles.loginPage}`}>
      <div className={styles.loginPanel}>
        <div>
          <p className={styles.eyebrow}>Acceso autorizado</p>
          <h1>{t('login.title')}</h1>
          <p>
            Ingresa con tu usuario autorizado para consultar catálogos, agregar productos al
            carrito y preparar solicitudes de pedido.
          </p>
          <div className={styles.demoAccess}>
            <strong>Cliente demo</strong>
            <span>cliente@demo.com</span>
            <span>demo123</span>
            <button
              className={styles.secondarySmall}
              type="button"
              onClick={() => useDemoAccess('cliente@demo.com', 'demo123')}
            >
              Usar cliente
            </button>
          </div>
          <div className={styles.demoAccess}>
            <strong>Admin demo</strong>
            <span>admin@demo.com</span>
            <span>admin123</span>
            <button
              className={styles.secondarySmall}
              type="button"
              onClick={() => useDemoAccess('admin@demo.com', 'admin123')}
            >
              Usar admin
            </button>
          </div>
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label>
            {t('login.email')}
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            {t('login.password')}
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Validando acceso...' : t('login.submit')}
          </button>
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <p className={styles.loginHelp}>
            ¿No estás registrado? Comunícate con un agente de ventas para validar tu acceso.
          </p>
        </form>
      </div>
    </section>
  );
}
