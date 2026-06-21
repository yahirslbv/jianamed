import styles from '../styles/App.module.css';

const values = ['Responsabilidad sanitaria', 'Confianza comercial', 'Surtido oportuno', 'Atencion profesional'];

export default function CompanyPage() {
  return (
    <section className={styles.section}>
      <div className={styles.companyLayout}>
        <div>
          <p className={styles.eyebrow}>Nuestra empresa</p>
          <h1>Distribuidora enfocada en clientes farmaceuticos autorizados</h1>
          <p>
            Tic Toc Pharma conecta farmacias, clinicas y clientes institucionales con catalogos de
            laboratorios aliados. Nuestro enfoque esta en el abasto ordenado, la trazabilidad
            comercial y la atencion a clientes que requieren un portal profesional de consulta y
            preparacion de pedidos.
          </p>
        </div>
        <div className={styles.statementGrid}>
          <article>
            <h2>Mision</h2>
            <p>
              Facilitar el acceso comercial a medicamentos e insumos farmaceuticos mediante un
              catalogo confiable, atencion especializada y procesos preparados para validacion.
            </p>
          </article>
          <article>
            <h2>Vision</h2>
            <p>
              Ser una plataforma B2B de referencia para la distribucion farmaceutica regional, con
              informacion clara, laboratorios aliados y operacion escalable.
            </p>
          </article>
        </div>
      </div>

      <div className={styles.valuesGrid}>
        {values.map((value) => (
          <article key={value}>
            <span aria-hidden="true">TT</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
