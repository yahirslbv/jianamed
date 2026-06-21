import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from '../styles/App.module.css';

export default function LoginPage({ redirectTo = '/catalogo', navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('cliente@demo.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login({ email, password });

    if (result.ok) {
      navigate(redirectTo || '/catalogo');
      return;
    }

    setError(result.message);
  };

  return (
    <section className={`${styles.section} ${styles.loginPage}`}>
      <div className={styles.loginPanel}>
        <div>
          <p className={styles.eyebrow}>Acceso autorizado</p>
          <h1>Iniciar sesion</h1>
          <p>
            Ingresa con tu usuario autorizado para consultar catalogos, agregar productos al
            carrito y preparar solicitudes de pedido.
          </p>
          <div className={styles.demoAccess}>
            <strong>Demo</strong>
            <span>cliente@demo.com</span>
            <span>demo123</span>
          </div>
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label>
            Usuario o correo
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Contrasena
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className={styles.primaryButton} type="submit">
            Entrar al catalogo
          </button>
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <p className={styles.loginHelp}>
            No estas registrado? Comunicate con un agente de ventas para validar tu acceso.
          </p>
        </form>
      </div>
    </section>
  );
}
