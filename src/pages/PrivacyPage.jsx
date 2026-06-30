import styles from '../styles/App.module.css';

export default function PrivacyPage() {
  return (
    <section className={styles.section}>
      <div className={styles.legalPage}>
        <p className={styles.eyebrow}>Tic Toc Pharma S.A. de C.V.</p>
        <h1>Aviso de Privacidad</h1>
        <p className={styles.legalMeta}>Última actualización: junio de 2026</p>

        <p>
          En cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de
          los Particulares</strong> (LFPDPPP) y su Reglamento, <strong>Tic Toc Pharma S.A. de C.V.</strong>,
          con domicilio en Tijuana, Baja California, México (en adelante "Tic Toc Pharma" o el
          "Responsable"), pone a disposición el presente Aviso de Privacidad.
        </p>

        <h2>1. Datos de contacto del Responsable</h2>
        <p>
          <strong>Razón social:</strong> Tic Toc Pharma S.A. de C.V.<br />
          <strong>Domicilio:</strong> Tijuana, Baja California, México<br />
          <strong>Correo de privacidad:</strong> privacidad@tictocpharma.com
        </p>

        <h2>2. Datos personales que recabamos</h2>
        <p>
          Al registrarse y utilizar este portal B2B, recabamos los siguientes datos personales y
          empresariales:
        </p>
        <ul>
          <li>Nombre completo del contacto y representante legal</li>
          <li>Correo electrónico y número de teléfono</li>
          <li>Razón social y nombre comercial de la empresa</li>
          <li>RFC y domicilio fiscal</li>
          <li>Dirección de entrega</li>
          <li>Licencia sanitaria (cuando aplique)</li>
          <li>Datos de acceso a la plataforma (correo y contraseña cifrada)</li>
          <li>Historial de pedidos y actividad en el portal</li>
        </ul>
        <p>
          No recabamos datos personales sensibles en el sentido del artículo 3, fracción VI de la LFPDPPP.
        </p>

        <h2>3. Finalidades del tratamiento</h2>
        <p>Utilizamos sus datos para las siguientes finalidades <strong>primarias</strong>:</p>
        <ul>
          <li>Gestionar su registro y acceso al portal B2B</li>
          <li>Procesar, preparar y dar seguimiento a sus pedidos</li>
          <li>Emitir facturas y comprobantes fiscales</li>
          <li>Verificar y validar su perfil como cliente autorizado</li>
          <li>Enviar notificaciones sobre el estado de sus pedidos</li>
          <li>Cumplir con obligaciones legales y regulatorias en materia sanitaria y fiscal</li>
        </ul>
        <p>
          Finalidades <strong>secundarias</strong> (puede oponerse sin que afecte la prestación del
          servicio):
        </p>
        <ul>
          <li>Envío de información sobre nuevos productos, ofertas o actualizaciones del catálogo</li>
          <li>Análisis internos de uso de la plataforma para mejorar el servicio</li>
        </ul>

        <h2>4. Transferencias de datos</h2>
        <p>
          Sus datos podrán ser compartidos con terceros únicamente en los siguientes supuestos:
        </p>
        <ul>
          <li>
            <strong>Proveedores de servicios tecnológicos:</strong> Servicios de hospedaje, envío de
            correo electrónico y procesamiento de pagos, bajo acuerdos de confidencialidad y
            cumplimiento de la LFPDPPP.
          </li>
          <li>
            <strong>Autoridades competentes:</strong> Cuando sea requerido por ley, orden judicial o
            autoridad sanitaria (COFEPRIS, SAT, etc.).
          </li>
        </ul>
        <p>
          No vendemos, arrendamos ni cedemos sus datos personales a terceros con fines comerciales
          propios.
        </p>

        <h2>5. Derechos ARCO</h2>
        <p>
          Usted tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>,{' '}
          <strong>Cancelar</strong> u <strong>Oponerse</strong> al tratamiento de sus datos personales
          (Derechos ARCO). Para ejercerlos, envíe su solicitud a{' '}
          <strong>privacidad@tictocpharma.com</strong> indicando:
        </p>
        <ul>
          <li>Nombre completo y correo registrado en el portal</li>
          <li>Derecho que desea ejercer</li>
          <li>Descripción clara de los datos sobre los que solicita el ejercicio</li>
          <li>Copia de identificación oficial</li>
        </ul>
        <p>
          Daremos respuesta en un plazo máximo de <strong>20 días hábiles</strong> contados a partir
          de la recepción de su solicitud.
        </p>

        <h2>6. Cookies y tecnologías de rastreo</h2>
        <p>
          Este portal utiliza cookies de sesión estrictamente necesarias para mantener su acceso
          autenticado. No utilizamos cookies de rastreo publicitario ni compartimos información de
          navegación con redes de publicidad.
        </p>

        <h2>7. Cambios al Aviso de Privacidad</h2>
        <p>
          Tic Toc Pharma se reserva el derecho de modificar este Aviso en cualquier momento. Cualquier
          cambio será notificado a través del portal o por correo electrónico al menos 15 días antes
          de su entrada en vigor.
        </p>

        <h2>8. Autoridad de protección de datos</h2>
        <p>
          Si considera que el tratamiento de sus datos no se ajusta a la normativa vigente, puede
          presentar una queja ante el <strong>Instituto Nacional de Transparencia, Acceso a la
          Información y Protección de Datos Personales (INAI)</strong> en{' '}
          <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer">www.inai.org.mx</a>.
        </p>
      </div>
    </section>
  );
}
