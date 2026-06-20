import styles from '../styles/App.module.css';

export default function BranchCard({ branch }) {
  const message = encodeURIComponent(`Hola, quiero información de ${branch.name}`);

  return (
    <article className={styles.branchCard}>
      <span className={styles.branchPill}>{branch.city}</span>
      <h3>{branch.name}</h3>
      <p>{branch.address}</p>
      <dl className={styles.branchMeta}>
        <div>
          <dt>Teléfono</dt>
          <dd>{branch.phone}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{branch.hours}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>
            <a href={`mailto:${branch.email}`}>{branch.email}</a>
          </dd>
        </div>
      </dl>
      <a
        className={styles.secondarySmall}
        href={`https://wa.me/${branch.whatsapp}?text=${message}`}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
    </article>
  );
}
