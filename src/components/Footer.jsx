import styles from '../styles/App.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <div>
          <strong>Tic Toc Pharma</strong>
          <p>Consulte a su médico.</p>
        </div>
      </div>

      <nav aria-label="Enlaces de pie de pagina">
        <a href="#catalogo">Catálogo</a>
        <a href="#sucursales">Sucursales</a>
        <a href="#contacto">Contacto</a>
        <a href="#noticias">Noticias</a>
      </nav>

      <div className={styles.footerLinks}>
        <a href="#contacto">Aviso de privacidad</a>
        <a href="#contacto">Términos y condiciones</a>
        <a href="#contacto">Farmacovigilancia</a>
      </div>

      <div className={styles.socialLinks} aria-label="Redes sociales">
        <a href="#contacto">Facebook</a>
        <a href="#contacto">Instagram</a>
        <a href="#contacto">LinkedIn</a>
      </div>
    </footer>
  );
}
