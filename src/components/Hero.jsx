import SearchBar from './SearchBar.jsx';
import styles from '../styles/App.module.css';

export default function Hero({ searchQuery, onSearchChange }) {
  return (
    <section className={styles.hero} id="inicio" aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <p className={styles.eyebrow}>Consulta farmacéutica organizada</p>
        <h1 id="hero-title">Catálogo de medicamentos y productos farmacéuticos</h1>
        <p className={styles.heroCopy}>
          Consulta productos OTC, RX, material de curación, naturismo, perfumería y cuidado
          personal.
        </p>
        <SearchBar value={searchQuery} onChange={onSearchChange} id="hero-search" />
        <div className={styles.heroActions}>
          <a className={styles.primaryButton} href="#catalogo">
            Explorar catálogo
          </a>
          <a className={styles.secondaryButton} href="#sucursales">
            Ver sucursales
          </a>
        </div>
      </div>
    </section>
  );
}
