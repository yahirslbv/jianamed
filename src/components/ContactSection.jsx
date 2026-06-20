import { useState } from 'react';
import styles from '../styles/App.module.css';

export default function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  };

  return (
    <section className={`${styles.section} ${styles.contactSection}`} id="contacto">
      <div className={styles.contactInfo}>
        <p className={styles.eyebrow}>Contacto</p>
        <h2>Atención farmacéutica y consultas de disponibilidad</h2>
        <p>
          Comparte tus datos para recibir respuesta del equipo de Tic Toc Pharma. La información del
          catálogo es informativa y no sustituye una consulta profesional.
        </p>
        <dl className={styles.contactList}>
          <div>
            <dt>Teléfono</dt>
            <dd>+52 664 123 4567</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>
              <a href="mailto:contacto@tictocpharma.mx">contacto@tictocpharma.mx</a>
            </dd>
          </div>
          <div>
            <dt>Horario de atencion</dt>
            <dd>Lun a sab, 8:00 a 20:00</dd>
          </div>
        </dl>
        <a
          className={styles.primaryButton}
          href="https://wa.me/526641234567?text=Hola,%20quiero%20informaci%C3%B3n%20de%20Tic%20Toc%20Pharma"
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </div>

      <form className={styles.contactForm} onSubmit={handleSubmit}>
        <label>
          Nombre
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          Correo
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Teléfono
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label>
          Mensaje
          <textarea name="message" rows="5" required />
        </label>
        <button className={styles.primaryButton} type="submit">
          Enviar mensaje
        </button>
        {submitted && (
          <p className={styles.formSuccess} role="status">
            Mensaje preparado. Conecta este formulario a tu API cuando el backend este listo.
          </p>
        )}
      </form>
    </section>
  );
}
