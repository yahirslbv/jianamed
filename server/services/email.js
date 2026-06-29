/**
 * Email service — Resend-based, fire-and-forget.
 *
 * All public functions are non-blocking: they log on failure but never throw
 * so that a transient email error never breaks a business operation.
 *
 * Required env vars:
 *   RESEND_API_KEY   — from resend.com (required in production)
 *   EMAIL_FROM       — verified sender address, e.g. "Tic Toc Pharma <pedidos@tudominio.com>"
 */

import { ORDER_STATUS_LABELS } from '../constants.js';
import { logger } from './logger.js';

// ─── Client ──────────────────────────────────────────────────────────────────

let _resendClient = null;
let _resendImportAttempted = false;

/** Lazy async getter — dynamic import so missing package never crashes the server. */
async function getResendClient() {
  if (_resendClient) return _resendClient;
  if (_resendImportAttempted) return null;
  _resendImportAttempted = true;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null; // dev / test: silently skip

  try {
    const { Resend } = await import('resend');
    _resendClient = new Resend(apiKey);
    return _resendClient;
  } catch {
    logger.error('resend package not available — run: npm install resend');
    return null;
  }
}

const FROM = () => process.env.EMAIL_FROM || 'Tic Toc Pharma <noreply@ticticpharma.com>';

/**
 * Core send. Fire-and-forget — never rejects.
 */
async function send({ to, subject, html }) {
  try {
    const client = await getResendClient();
    if (!client) {
      if (process.env.NODE_ENV !== 'test') {
        logger.debug('email skipped (no RESEND_API_KEY)', { to, subject });
      }
      return;
    }
    const { error } = await client.emails.send({ from: FROM(), to, subject, html });
    if (error) {
      logger.error('email send error', { to, subject, error });
    }
  } catch (err) {
    logger.error('email unexpected error', { to, subject, message: err?.message ?? String(err) });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatMXN = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount ?? 0);

function wrap(body) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tic Toc Pharma</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background:#0a3d62;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Tic Toc Pharma</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f0f0f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#888888;">
              Este correo fue generado automáticamente. Por favor no responder directamente.<br/>
              &copy; ${new Date().getFullYear()} Tic Toc Pharma — Distribución farmacéutica B2B
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemsTable(items = []) {
  const rows = items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-size:14px;">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-size:14px;text-align:right;">${formatMXN(item.unitPrice)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-size:14px;text-align:right;">${formatMXN(item.subtotal)}</td>
    </tr>`).join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;font-size:12px;text-align:left;color:#666;">Producto</th>
        <th style="padding:8px;font-size:12px;text-align:center;color:#666;">Cant.</th>
        <th style="padding:8px;font-size:12px;text-align:right;color:#666;">P. Unit.</th>
        <th style="padding:8px;font-size:12px;text-align:right;color:#666;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function statusBadge(status) {
  const colors = {
    PENDING_REVIEW: '#e67e22',
    IN_REVIEW: '#2980b9',
    APPROVED: '#27ae60',
    REJECTED: '#c0392b',
    SUPPLIED: '#8e44ad',
    CANCELLED: '#7f8c8d',
  };
  const bg = colors[status] || '#999';
  const label = ORDER_STATUS_LABELS[status] || status;
  return `<span style="display:inline-block;background:${bg};color:#fff;padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;">${label}</span>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send order confirmation email.
 * Triggered after a Stripe payment succeeds or after a direct order is created.
 *
 * @param {import('../serializers.js').SerializedOrder} order — serialized order object
 */
export async function sendOrderConfirmation(order) {
  if (!order?.clientEmail) return;

  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:22px;">Pedido recibido ✓</h2>
    <p style="color:#555;margin:0 0 24px;">Hola <strong>${order.clientName}</strong>, tu pedido ha sido registrado correctamente.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#666;">Folio</td>
        <td style="font-size:16px;font-weight:700;text-align:right;">${order.folio}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#666;padding-top:8px;">Estado</td>
        <td style="text-align:right;padding-top:8px;">${statusBadge(order.status)}</td>
      </tr>
      ${order.paymentStatus === 'PAID' ? `<tr>
        <td style="font-size:13px;color:#666;padding-top:8px;">Pago</td>
        <td style="font-size:14px;color:#27ae60;font-weight:600;text-align:right;padding-top:8px;">✓ Recibido</td>
      </tr>` : ''}
    </table>

    ${itemsTable(order.items)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      ${order.discountTotal > 0 ? `
      <tr>
        <td style="font-size:13px;color:#666;padding:4px 0;">Subtotal</td>
        <td style="text-align:right;font-size:13px;">${formatMXN(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#27ae60;padding:4px 0;">Descuentos</td>
        <td style="text-align:right;font-size:13px;color:#27ae60;">-${formatMXN(order.discountTotal)}</td>
      </tr>` : ''}
      <tr>
        <td style="font-size:16px;font-weight:700;padding-top:8px;border-top:2px solid #eee;">Total</td>
        <td style="text-align:right;font-size:16px;font-weight:700;padding-top:8px;border-top:2px solid #eee;">${formatMXN(order.total)}</td>
      </tr>
    </table>

    <p style="margin-top:24px;font-size:13px;color:#888;">
      Un agente revisará tu pedido y recibirás una notificación cuando cambie de estado.
    </p>
  `);

  await send({
    to: order.clientEmail,
    subject: `Tic Toc Pharma — Pedido ${order.folio} recibido`,
    html,
  });
}

/**
 * Send order status update email to the client.
 * Triggered when an admin changes the order status.
 *
 * @param {import('../serializers.js').SerializedOrder} order
 * @param {string} previousStatus
 */
export async function sendOrderStatusUpdate(order, previousStatus) {
  if (!order?.clientEmail) return;
  if (order.status === previousStatus) return;

  const prevLabel = ORDER_STATUS_LABELS[previousStatus] || previousStatus;
  const newLabel = ORDER_STATUS_LABELS[order.status] || order.status;

  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:22px;">Tu pedido ha sido actualizado</h2>
    <p style="color:#555;margin:0 0 24px;">Hola <strong>${order.clientName}</strong>, el estado de tu pedido ha cambiado.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#666;">Folio</td>
        <td style="font-size:16px;font-weight:700;text-align:right;">${order.folio}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#666;padding-top:12px;">Estado anterior</td>
        <td style="font-size:14px;color:#999;text-align:right;padding-top:12px;">${prevLabel}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#666;padding-top:8px;">Nuevo estado</td>
        <td style="text-align:right;padding-top:8px;">${statusBadge(order.status)}</td>
      </tr>
    </table>

    ${order.status === 'APPROVED' ? `
    <p style="background:#eafaf1;border-left:4px solid #27ae60;padding:12px 16px;font-size:14px;margin-bottom:16px;">
      Tu pedido fue aprobado y será procesado a la brevedad.
    </p>` : ''}

    ${order.status === 'REJECTED' ? `
    <p style="background:#fdf2f2;border-left:4px solid #c0392b;padding:12px 16px;font-size:14px;margin-bottom:16px;">
      Tu pedido fue rechazado. Comunícate con tu agente de ventas para más información.
    </p>` : ''}

    ${order.status === 'SUPPLIED' ? `
    <p style="background:#f5eef8;border-left:4px solid #8e44ad;padding:12px 16px;font-size:14px;margin-bottom:16px;">
      Tu pedido ha sido surtido y está en camino.
    </p>` : ''}

    <p style="font-size:13px;color:#888;">Folio: <strong>${order.folio}</strong> &mdash; Total: <strong>${formatMXN(order.total)}</strong></p>
  `);

  await send({
    to: order.clientEmail,
    subject: `Tic Toc Pharma — Pedido ${order.folio}: ${newLabel}`,
    html,
  });
}

/**
 * Send password reset email with a one-time link.
 *
 * @param {{ name: string, email: string, resetUrl: string }} params
 */
export async function sendPasswordResetEmail({ name, email, resetUrl }) {
  if (!email || !resetUrl) return;

  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:22px;">Restablece tu contraseña</h2>
    <p style="color:#555;margin:0 0 24px;">
      Hola <strong>${name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
    </p>

    <p style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#0a3d62;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">
        Restablecer contraseña
      </a>
    </p>

    <p style="background:#fff8e1;border-left:4px solid #f39c12;padding:12px 16px;font-size:14px;margin-bottom:16px;">
      Este enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez.
    </p>

    <p style="font-size:13px;color:#999;">
      Si no solicitaste el cambio de contraseña, ignora este correo. Tu cuenta permanece segura.
    </p>
  `);

  await send({
    to: email,
    subject: 'Tic Toc Pharma — Restablece tu contraseña',
    html,
  });
}

/**
 * Send welcome email with temporary credentials when an admin creates a new user.
 * The user must change the password on first login (forcePasswordChange).
 *
 * @param {{ name: string, email: string, temporaryPassword: string }} params
 */
export async function sendWelcomeEmail({ name, email, temporaryPassword }) {
  if (!email || !temporaryPassword) return;

  const loginUrl = process.env.PUBLIC_APP_URL
    ? `${process.env.PUBLIC_APP_URL}/#/login`
    : null;

  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:22px;">Bienvenido/a al portal</h2>
    <p style="color:#555;margin:0 0 24px;">
      Hola <strong>${name}</strong>, tu cuenta en el portal de Tic Toc Pharma ha sido creada.
      Usa las siguientes credenciales para ingresar por primera vez.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#666;padding-bottom:8px;">Correo electrónico</td>
        <td style="font-size:15px;font-weight:700;text-align:right;padding-bottom:8px;">${email}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#666;">Contraseña temporal</td>
        <td style="font-size:15px;font-weight:700;font-family:monospace;text-align:right;letter-spacing:1px;">${temporaryPassword}</td>
      </tr>
    </table>

    <p style="background:#fff8e1;border-left:4px solid #f39c12;padding:12px 16px;font-size:14px;margin-bottom:24px;">
      Al iniciar sesión por primera vez deberás establecer una contraseña propia. La contraseña temporal no podrá usarse después de ese cambio.
    </p>

    ${loginUrl ? `
    <p style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}"
         style="display:inline-block;background:#0a3d62;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">
        Ingresar al portal
      </a>
    </p>` : ''}

    <p style="font-size:13px;color:#999;">Si no esperabas este correo, ignóralo o comunícate con soporte.</p>
  `);

  await send({
    to: email,
    subject: 'Tic Toc Pharma — Tu acceso al portal está listo',
    html,
  });
}
