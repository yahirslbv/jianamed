import { laboratories } from '../data/laboratories.js';
import { products } from '../data/products.js';
import styles from '../styles/App.module.css';

export default function LaboratoriesPage() {
  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Laboratorios aliados</p>
          <h1>Catálogos por laboratorio</h1>
          <p>Consulta líneas disponibles y volumen de productos cargados en el catálogo mock.</p>
        </div>
      </div>

      <div className={styles.laboratoryGrid}>
        {laboratories.map((laboratory) => {
          const labProducts = products.filter((product) => product.laboratoryId === laboratory.id);
          return (
            <article className={styles.laboratoryCard} key={laboratory.id}>
              <span>{laboratory.status}</span>
              <h2>{laboratory.name}</h2>
              <p>{laboratory.line}</p>
              <strong>{labProducts.length} productos</strong>
              <a href={`#/catalogo?laboratory=${laboratory.id}`}>Ver catálogo</a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
