const roleHomes = {
  client: '/inicio-cliente',
  admin: '/catalogo',
};

// Rutas privadas exclusivas del rol cliente; el resto de roles se redirige a su inicio.
const clientOnlyPaths = [
  '/inicio-cliente',
  '/ofertas',
  '/carrito',
  '/resumen',
  '/checkout',
  '/pedido-confirmado',
  '/mis-pedidos',
];

// Rutas privadas disponibles para cualquier rol autenticado.
const sharedPaths = ['/cuenta', '/cambiar-contrasena'];

export function getRoleHome(role) {
  return roleHomes[role] || '/cuenta';
}

export function resolvePostLoginRoute(role, redirectTo = '') {
  if (!redirectTo) return getRoleHome(role);

  const [path] = redirectTo.split('?');
  if (path.startsWith('/admin') && role !== 'admin') return getRoleHome(role);
  if (clientOnlyPaths.includes(path) && role !== 'client') return getRoleHome(role);
  if (role !== 'client' && role !== 'admin' && !sharedPaths.includes(path)) return getRoleHome(role);

  return redirectTo;
}
