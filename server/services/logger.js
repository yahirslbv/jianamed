/**
 * Structured logger using pino.
 *
 * In production: outputs JSON lines (captured by any log collector).
 * In development: pretty-prints to stdout via pino-pretty.
 *
 * Packages required: pino, pino-http, pino-pretty (devDep)
 */

import { config } from '../env.js';

// ─── Pino factory (dynamic import so a missing package never crashes) ─────────────────

let _pino = null;
let _pinoHttp = null;
let _importAttempted = false;

async function loadPino() {
  if (_importAttempted) return;
  _importAttempted = true;
  try {
    const [pinoModule, pinoHttpModule] = await Promise.all([
      import('pino'),
      import('pino-http'),
    ]);

    // pino-pretty runs in a worker thread via the transport API — no try-catch needed here.
    // In production emit raw JSON; collector (Railway, Render, etc.) handles formatting.
    const transport = !config.isProduction
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined;

    _pino = pinoModule.default({
      level: process.env.LOG_LEVEL || (config.isProduction ? 'info' : 'debug'),
      transport,
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'body.password',
          'body.currentPassword',
          'body.newPassword',
        ],
        censor: '[REDACTED]',
      },
    });

    _pinoHttp = pinoHttpModule.default({
      logger: _pino,
      // Don't log health/ready probes — they're noisy
      autoLogging: {
        ignore: (req) => ['/api/health', '/api/ready'].includes(req.url),
      },
      customLogLevel: (_req, res) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    });
  } catch {
    // pino not installed — silent fallback to console
  }
}

// Kick off the import immediately (non-blocking)
loadPino();

// ─── Public API ────────────────────────────────────────────────────────────────────────────────

/**
 * Express middleware for request/response logging.
 * No-op if pino is not installed.
 */
export function requestLogger(req, res, next) {
  if (_pinoHttp) return _pinoHttp(req, res, next);
  return next();
}

/**
 * Structured logger instance. Falls back to console when pino is not installed.
 */
export const logger = {
  info: (msg, data) => (_pino ? _pino.info(data ?? {}, msg) : console.log(`[INFO] ${msg}`, data ?? '')),
  warn: (msg, data) => (_pino ? _pino.warn(data ?? {}, msg) : console.warn(`[WARN] ${msg}`, data ?? '')),
  error: (msg, data) => (_pino ? _pino.error(data ?? {}, msg) : console.error(`[ERROR] ${msg}`, data ?? '')),
  debug: (msg, data) => (_pino ? _pino.debug(data ?? {}, msg) : console.debug(`[DEBUG] ${msg}`, data ?? '')),
};
