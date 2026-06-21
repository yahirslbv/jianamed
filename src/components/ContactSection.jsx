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
        <h2>Atención comercial para clientes autorizados</h2>
        <p>
          Comparte tus datos para recibir respuesta del equipo de Tic Toc Pharma. Un agente puede
          orientarte sobre validación de acceso, catálogos por laboratorio y disponibilidad.
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
            <dt>Horario de atención</dt>
            <dd>Lun a sáb., 8:00 a 20:00</dd>
          </div>
        </dl>
        <a
          className={styles.primaryButton}
          href="https://wa.me/526641234567?text=Hola,%20quiero%20validar%20mi%20acceso%20a%20Tic%20Toc%20Pharma"
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
            Mensaje preparado. Conecta este formulario a tu API cuando el backend esté listo.
          </p>
        )}
      </form>
    </section>
  );
}
