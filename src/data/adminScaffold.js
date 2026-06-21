export const futureAdminRoutes = [
  { path: '/admin/productos', label: 'Administrar productos' },
  { path: '/admin/laboratorios', label: 'Administrar laboratorios' },
  { path: '/admin/usuarios', label: 'Administrar usuarios autorizados' },
  { path: '/admin/pedidos', label: 'Administrar pedidos' },
];

export const futureAdminModels = {
  product: ['id', 'sku', 'laboratoryId', 'price', 'stock', 'regulatoryFlags'],
  laboratory: ['id', 'name', 'line', 'commercialTerms'],
  user: ['id', 'email', 'role', 'company', 'approvalStatus'],
  order: ['id', 'clientId', 'items', 'status', 'validationNotes'],
};
