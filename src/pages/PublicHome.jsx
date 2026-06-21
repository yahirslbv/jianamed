import BranchesSection from '../components/BranchesSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import styles from '../styles/App.module.css';

export default function PublicHome() {
  return (
    <>
      <section className={styles.hero} id="inicio">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Portal B2B farmacéutico</p>
          <h1>Distribución de medicamentos e insumos farmacéuticos</h1>
          <p className={styles.heroCopy}>
            Para farmacias, clínicas y clientes autorizados que requieren catálogos por laboratorio,
            surtido eficiente y atención comercial especializada.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#/login">
              Iniciar sesión
            </a>
            <a className={styles.secondaryButton} href="#/empresa">
              Conoce la distribuidora
            </a>
          </div>
          <p className={styles.publicNotice}>
            El catálogo y la compra están disponibles únicamente para usuarios autorizados.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.b2bIntro}>
          <div>
            <p className={styles.eyebrow}>Servicio mayorista</p>
            <h2>Catálogos controlados para clientes farmacéuticos</h2>
          </div>
          <p>
            Tic Toc Pharma opera como distribuidora de productos farmacéuticos, genéricos,
            material de curación, OTC, RX, perfumería, naturismo, suplementos e insumos para
            puntos de venta autorizados. El portal está preparado para convertirse en flujo de
            pedidos con validación comercial.
          </p>
        </div>
        <div className={styles.featureGrid}>
          <article>
            <strong>Laboratorios aliados</strong>
            <p>Catálogos organizados por laboratorio, línea comercial y disponibilidad.</p>
          </article>
          <article>
            <strong>Surtido eficiente</strong>
            <p>Búsqueda por SKU, principio activo, categoría, presentación y clasificación.</p>
          </article>
          <article>
            <strong>Acceso controlado</strong>
            <p>El catálogo privado y el carrito requieren usuario autorizado.</p>
          </article>
        </div>
      </section>

      <BranchesSection />
      <ContactSection />
    </>
  );
}
