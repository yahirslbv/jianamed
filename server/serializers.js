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
          rfc: user.customer.rfc,
          contactName: user.customer.contactName,
          phone: user.customer.phone,
          address: user.customer.address,
          city: user.customer.city,
          state: user.customer.state,
          postalCode: user.customer.postalCode,
          creditEnabled: user.customer.creditEnabled,
          creditLimit: user.customer.creditLimit,
          creditUsed: user.customer.creditUsed,
          creditAvailable: Math.max(0, user.customer.creditLimit - user.customer.creditUsed),
          creditStatus: user.customer.creditStatus,
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

export function serializeProduct(product, offerApplication = null) {
  const originalPrice = offerApplication?.originalPrice ?? product.price;
  const price = offerApplication?.finalPrice ?? product.price;

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
    price,
    originalPrice,
    discountAmount: offerApplication?.discountAmount ?? 0,
    offer: offerApplication
      ? {
          id: offerApplication.offer.id,
          title: offerApplication.offer.title,
          discountType: offerApplication.offer.discountType,
          discountValue: offerApplication.offer.discountValue,
          endsAt: offerApplication.offer.endsAt,
        }
      : null,
    stock: product.stock,
    imageUrl: product.imageUrl,
    description: product.description,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function serializeOffer(offer) {
  const scope = offer.product
    ? { type: 'PRODUCT', label: offer.product.commercialName, productId: offer.productId }
    : offer.laboratory
      ? { type: 'LABORATORY', label: offer.laboratory.name, laboratoryId: offer.laboratoryId }
      : offer.category
        ? { type: 'CATEGORY', label: offer.category.name, categoryId: offer.categoryId }
        : { type: 'PRODUCT_TYPE', label: offer.productType, productType: offer.productType };

  return {
    id: offer.id,
    title: offer.title,
    description: offer.description || '',
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    isActive: offer.isActive,
    productId: offer.productId,
    laboratoryId: offer.laboratoryId,
    categoryId: offer.categoryId,
    productType: offer.productType,
    scope,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

export function serializeOrder(order) {
  return {
    id: order.id,
    folio: order.folio,
    clientId: order.userId,
    customerId: order.customerId,
    clientName: order.clientName || order.customer?.businessName || order.user?.name || '',
    clientEmail: order.clientEmail || order.user?.email || '',
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal || 0,
    total: order.total,
    observations: order.observations || '',
    checkout: {
      deliveryAddress: order.deliveryAddress || '',
      deliveryCity: order.deliveryCity || '',
      deliveryState: order.deliveryState || '',
      deliveryPostalCode: order.deliveryPostalCode || '',
      billingBusinessName: order.billingBusinessName || '',
      billingRfc: order.billingRfc || '',
      billingAddress: order.billingAddress || '',
      responsibleName: order.responsibleName || '',
      responsiblePhone: order.responsiblePhone || '',
    },
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
      originalUnitPrice: item.originalUnitPrice || item.unitPrice,
      discountAmount: item.discountAmount || 0,
      offerTitle: item.offerTitle || '',
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
