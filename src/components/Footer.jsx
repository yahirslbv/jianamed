import LogoMark from './LogoMark.jsx';
import styles from '../styles/App.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <LogoMark className={styles.brandMark} />
        <div>
          <strong>Tic Toc Pharma</strong>
          <p>Portal B2B para clientes autorizados.</p>
        </div>
      </div>

      <nav aria-label="Enlaces de pie de página">
        <a href="#/">Inicio</a>
        <a href="#/empresa">Nuestra empresa</a>
        <a href="#/sucursales">Sucursales</a>
        <a href="#/contacto">Contacto</a>
      </nav>

      <div className={styles.footerLinks}>
        <a href="#/privacidad">Aviso de privacidad</a>
        <a href="#/terminos">Términos y condiciones</a>
        <a href="#/contacto">Farmacovigilancia</a>
      </div>

      <div className={styles.socialLinks} aria-label="Redes sociales">
        <a href="#/contacto">Facebook</a>
        <a href="#/contacto">Instagram</a>
        <a href="#/contacto">LinkedIn</a>
      </div>
    </footer>
  );
}
