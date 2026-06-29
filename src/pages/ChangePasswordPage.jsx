import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword } from '../services/authService.js';
import styles from '../styles/App.module.css';

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isForced = Boolean(user?.forcePasswordChange);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // Refresh the user in context so forcePasswordChange clears and ProtectedRoute unblocks
      await refreshUser(response.user);
      // Redirect to the appropriate home page (href for reliable hash navigation)
      const home = response.user?.role === 'client' ? '#/inicio-cliente' : '#/admin/pedidos';
      window.location.href = home;
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.authGate}>
        {isForced ? (
          <>
            <p className={styles.eyebrow}>Primer acceso</p>
            <h1>Establece tu contraseña</h1>
            <p>
              Tu cuenta fue creada con una contraseña temporal. Debes elegir una contraseña propia
              antes de acceder al portal.
            </p>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>Seguridad</p>
            <h1>Cambiar contraseña</h1>
          </>
        )}

        <form className={styles.singleForm} onSubmit={handleSubmit}>
          <label>
            Contraseña {isForced ? 'temporal' : 'actual'}
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => update('currentPassword', event.target.value)}
              required
            />
          </label>
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
            Confirmar nueva contraseña
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
            {!isForced && (
              <a className={styles.secondarySmall} href="#/cuenta">
                Cancelar
              </a>
            )}
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
