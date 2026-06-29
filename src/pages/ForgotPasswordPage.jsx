import { useState } from 'react';
import { forgotPassword } from '../services/authService.js';
import styles from '../styles/App.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('submitting');
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStatus('done');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible procesar la solicitud.');
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <section className={`${styles.section} ${styles.softSection}`}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Correo enviado</p>
          <h1>Revisa tu bandeja de entrada</h1>
          <p>
            Si ese correo está registrado en el portal, recibirás un enlace para restablecer tu
            contraseña. El enlace es válido por 1 hora.
          </p>
          <p>
            <a href="#/login" className={styles.secondarySmall}>
              Volver al inicio de sesión
            </a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.authGate}>
        <p className={styles.eyebrow}>Recuperar acceso</p>
        <h1>¿Olvidaste tu contraseña?</h1>
        <p>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

        <form className={styles.singleForm} onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <div className={styles.singleFormActions}>
            <a className={styles.secondarySmall} href="#/login">
              Cancelar
            </a>
            <button className={styles.primaryButton} type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
