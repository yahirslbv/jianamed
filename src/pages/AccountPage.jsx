import { useAuth } from '../context/AuthContext.jsx';
import { futureAdminModels, futureAdminRoutes } from '../data/adminScaffold.js';
import styles from '../styles/App.module.css';

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <section className={styles.section}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Mi cuenta</p>
          <h1>{user.company}</h1>
          <p>
            Sesion activa para {user.name} · {user.email}
          </p>
        </div>
      </div>

      <div className={styles.accountGrid}>
        <article>
          <h2>Acceso actual</h2>
          <dl className={styles.detailList}>
            <div>
              <dt>Rol</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>Autorizado para demo</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Estructura administrativa preparada</h2>
          <p>
            Estos modulos quedan listos como referencia para una etapa posterior con usuarios
            administradores o vendedores.
          </p>
          <ul>
            {futureAdminRoutes.map((route) => (
              <li key={route.path}>{route.label}</li>
            ))}
          </ul>
        </article>
        <article>
          <h2>Modelos futuros</h2>
          <ul>
            {Object.entries(futureAdminModels).map(([model, fields]) => (
              <li key={model}>
                <strong>{model}</strong>: {fields.join(', ')}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
