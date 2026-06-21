import LogoMark from '../components/LogoMark.jsx';
import styles from '../styles/App.module.css';

const values = ['Responsabilidad sanitaria', 'Confianza comercial', 'Surtido oportuno', 'Atención profesional'];

export default function CompanyPage() {
  return (
    <section className={styles.section}>
      <div className={styles.companyLayout}>
        <div>
          <p className={styles.eyebrow}>Nuestra empresa</p>
          <h1>Distribuidora enfocada en clientes farmacéuticos autorizados</h1>
          <p>
            Tic Toc Pharma conecta farmacias, clínicas y clientes institucionales con catálogos de
            laboratorios aliados. Nuestro enfoque está en el abasto ordenado, la trazabilidad
            comercial y la atención a clientes que requieren un portal profesional de consulta y
            preparación de pedidos.
          </p>
        </div>
        <div className={styles.statementGrid}>
          <article>
            <h2>Misión</h2>
            <p>
              Facilitar el acceso comercial a medicamentos e insumos farmacéuticos mediante un
              catálogo confiable, atención especializada y procesos preparados para validación.
            </p>
          </article>
          <article>
            <h2>Visión</h2>
            <p>
              Ser una plataforma B2B de referencia para la distribución farmacéutica regional, con
              información clara, laboratorios aliados y operación escalable.
            </p>
          </article>
        </div>
      </div>

      <div className={styles.valuesGrid}>
        {values.map((value) => (
          <article key={value}>
            <LogoMark className={styles.valueLogoMark} />
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
