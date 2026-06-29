import { useState } from 'react';
import { resetPassword } from '../services/authService.js';
import styles from '../styles/App.module.css';

export default function ResetPasswordPage({ token }) {
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState(token ? 'idle' : 'invalid'); // idle | submitting | done | invalid
  const [error, setError] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setStatus('submitting');
    try {
      await resetPassword({ token, newPassword: form.newPassword });
      setStatus('done');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar la contraseña.');
      setStatus('idle');
    }
  };

  if (status === 'invalid') {
    return (
      <section className={`${styles.section} ${styles.softSection}`}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Enlace inválido</p>
          <h1>Este enlace no es válido</h1>
          <p>El enlace de restablecimiento falta o está malformado. Solicita uno nuevo.</p>
          <a href="#/olvide-mi-contrasena" className={styles.primaryButton}>
            Solicitar nuevo enlace
          </a>
        </div>
      </section>
    );
  }

  if (status === 'done') {
    return (
      <section className={`${styles.section} ${styles.softSection}`}>
        <div className={styles.authGate}>
          <p className={styles.eyebrow}>Contraseña actualizada</p>
          <h1>Tu contraseña fue restablecida</h1>
          <p>Ahora puedes iniciar sesión con tu nueva contraseña.</p>
          <a href="#/login" className={styles.primaryButton}>
            Iniciar sesión
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.authGate}>
        <p className={styles.eyebrow}>Nueva contraseña</p>
        <h1>Establece tu nueva contraseña</h1>

        <form className={styles.singleForm} onSubmit={handleSubmit}>
          <label>
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              value={form.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
              required
            />
          </label>
          <label>
            Confirmar contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
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
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
