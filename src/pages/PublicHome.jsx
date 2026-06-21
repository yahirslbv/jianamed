import BranchesSection from '../components/BranchesSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import styles from '../styles/App.module.css';

export default function PublicHome() {
  return (
    <>
      <section className={styles.hero} id="inicio">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Portal B2B farmaceutico</p>
          <h1>Distribucion de medicamentos e insumos farmaceuticos</h1>
          <p className={styles.heroCopy}>
            Para farmacias, clinicas y clientes autorizados que requieren catalogos por laboratorio,
            surtido eficiente y atencion comercial especializada.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#/login">
              Iniciar sesion
            </a>
            <a className={styles.secondaryButton} href="#/empresa">
              Conoce la distribuidora
            </a>
          </div>
          <p className={styles.publicNotice}>
            El catalogo y la compra estan disponibles unicamente para usuarios autorizados.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.b2bIntro}>
          <div>
            <p className={styles.eyebrow}>Servicio mayorista</p>
            <h2>Catalogos controlados para clientes farmaceuticos</h2>
          </div>
          <p>
            Tic Toc Pharma opera como distribuidora de productos farmaceuticos, genericos,
            material de curacion, OTC, RX, perfumeria, naturismo, suplementos e insumos para
            puntos de venta autorizados. El portal esta preparado para convertirse en flujo de
            pedidos con validacion comercial.
          </p>
        </div>
        <div className={styles.featureGrid}>
          <article>
            <strong>Laboratorios aliados</strong>
            <p>Catalogos organizados por laboratorio, linea comercial y disponibilidad.</p>
          </article>
          <article>
            <strong>Surtido eficiente</strong>
            <p>Busqueda por SKU, principio activo, categoria, presentacion y clasificacion.</p>
          </article>
          <article>
            <strong>Acceso controlado</strong>
            <p>El catalogo privado y el carrito requieren usuario autorizado.</p>
          </article>
        </div>
      </section>

      <BranchesSection />
      <ContactSection />
    </>
  );
}
