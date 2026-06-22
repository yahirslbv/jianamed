const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

function buildUrl(path) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiClient(path, options = {}) {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
      body:
        hasBody && !isFormData && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : options.body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('No fue posible conectar con la API.', { isNetworkError: true });
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.message || 'La solicitud no pudo completarse.', {
      status: response.status,
    });
  }

  return payload;
}

export function shouldUseLocalFallback(error) {
  // Vite devuelve un 5xx cuando su proxy no alcanza la API local. En ese caso
  // el portal conserva el acceso demo, pero nunca ignora errores de credenciales.
  return error instanceof ApiError && (error.isNetworkError || error.status >= 500);
}
