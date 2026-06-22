import { ORDER_STATUS_LABELS, PRODUCT_TYPE_LABELS } from './constants.js';

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.customer?.businessName || user.name,
    customer: user.customer
      ? {
          id: user.customer.id,
          businessName: user.customer.businessName,
          commercialName: user.customer.commercialName,
          isAuthorized: user.customer.isAuthorized,
        }
      : null,
  };
}

export function serializeLaboratory(laboratory) {
  return {
    id: laboratory.id,
    name: laboratory.name,
    slug: laboratory.slug,
    description: laboratory.description,
    isActive: laboratory.isActive,
  };
}

export function serializeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive: category.isActive,
  };
}

export function serializeProduct(product) {
  return {
    id: product.id,
    sku: product.sku,
    commercialName: product.commercialName,
    genericName: product.genericName,
    activeIngredient: product.activeIngredient,
    laboratoryId: product.laboratoryId,
    laboratory: product.laboratory ? serializeLaboratory(product.laboratory) : null,
    categoryId: product.categoryId,
    category: product.category ? serializeCategory(product.category) : null,
    pharmaceuticalForm: product.pharmaceuticalForm,
    concentration: product.concentration,
    presentation: product.presentation,
    sanitaryRegistration: product.sanitaryRegistration,
    healthFraction: product.healthFraction,
    requiresPrescription: product.requiresPrescription,
    requiresRetainedPrescription: product.requiresRetainedPrescription,
    isControlled: product.isControlled,
    productType: product.productType,
    productTypeLabel: PRODUCT_TYPE_LABELS[product.productType] || product.productType,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
    description: product.description,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function serializeOrder(order) {
  return {
    id: order.id,
    folio: order.folio,
    clientId: order.userId,
    customerId: order.customerId,
    clientName: order.customer?.businessName || order.user?.name || '',
    clientEmail: order.user?.email || '',
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
    subtotal: order.subtotal,
    total: order.total,
    observations: order.observations || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      name: item.productName,
      laboratoryName: item.laboratoryName,
      presentation: item.presentation,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

export function serializeAuditLog(log) {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    details: log.details,
    createdAt: log.createdAt,
  };
}
