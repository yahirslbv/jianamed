import styles from '../styles/App.module.css';

export default function TermsPage() {
  return (
    <section className={styles.section}>
      <div className={styles.legalPage}>
        <p className={styles.eyebrow}>Tic Toc Pharma S.A. de C.V.</p>
        <h1>Términos y Condiciones</h1>
        <p className={styles.legalMeta}>Última actualización: junio de 2026</p>

        <p>
          Los presentes Términos y Condiciones regulan el uso del portal B2B de{' '}
          <strong>Tic Toc Pharma S.A. de C.V.</strong> (en adelante "Tic Toc Pharma"), con domicilio
          en Tijuana, Baja California, México. Al acceder y utilizar este portal, usted acepta
          expresamente estos términos en su totalidad.
        </p>

        <h2>1. Definiciones</h2>
        <ul>
          <li><strong>Portal:</strong> Plataforma web B2B accesible en el dominio de Tic Toc Pharma.</li>
          <li><strong>Cliente:</strong> Persona moral o física con actividad empresarial registrada y autorizada por Tic Toc Pharma para utilizar el portal.</li>
          <li><strong>Usuario:</strong> Persona física que accede al portal en nombre de un Cliente.</li>
          <li><strong>Pedido:</strong> Solicitud formal de productos enviada a través del portal.</li>
        </ul>

        <h2>2. Acceso al portal</h2>
        <p>
          El portal es de acceso exclusivo para <strong>clientes B2B autorizados</strong>. El
          registro está sujeto a validación por parte de Tic Toc Pharma, quien se reserva el
          derecho de aprobar, suspender o cancelar cualquier cuenta sin necesidad de justificación.
        </p>
        <p>
          El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y
          de todas las actividades realizadas desde su cuenta. Deberá notificar de inmediato a Tic
          Toc Pharma ante cualquier uso no autorizado.
        </p>

        <h2>3. Catálogo y disponibilidad de productos</h2>
        <p>
          La información sobre productos, precios y disponibilidad mostrada en el portal tiene
          carácter <strong>informativo y referencial</strong>. Tic Toc Pharma se reserva el derecho
          de modificar precios, suspender productos o ajustar condiciones comerciales sin previo
          aviso. La confirmación definitiva de precio y disponibilidad se realiza al momento de la
          aprobación del pedido.
        </p>

        <h2>4. Proceso de pedidos</h2>
        <ol>
          <li>El Cliente selecciona productos y genera un pedido desde el portal.</li>
          <li>El pedido queda en estado <strong>Pendiente de revisión</strong> hasta ser evaluado por el equipo de Tic Toc Pharma.</li>
          <li>Tic Toc Pharma puede aprobar, rechazar o solicitar ajustes al pedido.</li>
          <li>Una vez aprobado, el pedido pasa a preparación y posteriormente a <strong>Surtido</strong> cuando es despachado.</li>
          <li>El Cliente recibirá notificaciones por correo electrónico en cada cambio de estado relevante.</li>
        </ol>
        <p>
          La generación de un pedido en el portal <strong>no constituye una venta perfeccionada</strong>
          hasta que Tic Toc Pharma emita su aprobación formal.
        </p>

        <h2>5. Precios y condiciones comerciales</h2>
        <p>
          Los precios publicados en el portal están expresados en <strong>Pesos Mexicanos (MXN)</strong>
          y no incluyen IVA salvo indicación expresa. Las condiciones de descuento, crédito o precio
          especial son de carácter individual y pueden variar por cliente según el acuerdo comercial
          vigente.
        </p>

        <h2>6. Entrega</h2>
        <p>
          Las condiciones de entrega (lugar, plazo y costo de flete) se acordarán en el momento de
          la aprobación del pedido y dependerán del volumen, la ubicación del Cliente y la
          disponibilidad en almacén. Tic Toc Pharma no garantiza tiempos de entrega específicos
          salvo cuando sean confirmados expresamente por escrito.
        </p>

        <h2>7. Devoluciones y reclamaciones</h2>
        <p>
          Las devoluciones de productos están sujetas a las políticas comerciales vigentes de Tic
          Toc Pharma. No se aceptan devoluciones de productos farmacéuticos controlados, productos
          con cadena de frío rota o productos sin empaque original. Cualquier reclamación por
          producto dañado o incorrecto deberá notificarse dentro de las <strong>48 horas</strong>
          siguientes a la recepción del pedido.
        </p>

        <h2>8. Propiedad intelectual</h2>
        <p>
          Todo el contenido del portal (marcas, logotipos, textos, imágenes, código y diseño) es
          propiedad de Tic Toc Pharma o de sus licenciantes. Queda prohibida su reproducción,
          distribución o uso comercial sin autorización previa y por escrito.
        </p>

        <h2>9. Limitación de responsabilidad</h2>
        <p>
          Tic Toc Pharma no será responsable por daños indirectos, pérdidas de negocio o
          consecuencias derivadas de interrupciones del servicio, errores en el catálogo o demoras
          en la entrega atribuibles a causas de fuerza mayor o a terceros proveedores logísticos.
          La responsabilidad total de Tic Toc Pharma frente al Cliente estará limitada al monto del
          pedido en disputa.
        </p>

        <h2>10. Modificaciones</h2>
        <p>
          Tic Toc Pharma se reserva el derecho de modificar estos Términos en cualquier momento.
          Los cambios serán notificados con al menos <strong>15 días naturales</strong> de
          anticipación. El uso continuado del portal después de la notificación implica la aceptación
          de los nuevos términos.
        </p>

        <h2>11. Legislación aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>.
          Para cualquier controversia derivada del uso del portal o de las operaciones comerciales
          realizadas a través de él, las partes se someten a la jurisdicción de los tribunales
          competentes de <strong>Tijuana, Baja California</strong>, renunciando expresamente a
          cualquier otro fuero que pudiera corresponderles.
        </p>

        <h2>12. Contacto</h2>
        <p>
          Para dudas, aclaraciones o reclamaciones relacionadas con estos Términos, contáctenos en{' '}
          <strong>contacto@tictocpharma.com</strong> o a través de la sección de{' '}
          <a href="#/contacto">Contacto</a> de este portal.
        </p>
      </div>
    </section>
  );
}
