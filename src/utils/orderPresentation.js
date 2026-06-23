const statusPresentation = {
  'Pendiente de revisión': {
    tone: 'warning',
    description: 'Tu solicitud fue recibida y está pendiente de validación comercial y de disponibilidad.',
  },
  'En revisión': {
    tone: 'info',
    description: 'Un agente está revisando existencias, requisitos y condiciones comerciales.',
  },
  Aprobado: {
    tone: 'success',
    description: 'La solicitud fue aprobada para continuar con el surtido.',
  },
  Rechazado: {
    tone: 'danger',
    description: 'La solicitud no pudo aprobarse. Consulta las observaciones o contacta a tu agente.',
  },
  Surtido: {
    tone: 'success',
    description: 'El pedido está marcado como surtido.',
  },
  Cancelado: {
    tone: 'neutral',
    description: 'La solicitud fue cancelada y no seguirá a surtido.',
  },
};

export function getOrderStatusPresentation(status) {
  return statusPresentation[status] || {
    tone: 'neutral',
    description: 'El estado del pedido se actualizará cuando haya nueva información.',
  };
}

export function getOrderItemCount(order) {
  return (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
}
