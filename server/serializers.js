import { ORDER_STATUS_LABELS, PRODUCT_TYPE_LABELS } from './constants.js';
import { moneyToNumber } from './utils/money.js';

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
          creditLimit: moneyToNumber(user.customer.creditLimitCents),
          creditUsed: moneyToNumber(user.customer.creditUsedCents),
          creditAvailable: moneyToNumber(Math.max(0, user.customer.creditLimitCents - user.customer.creditUsedCents)),
          creditStatus: user.customer.creditStatus,
          isAuthorized: user.customer.isAuthorized,
        }
      : null,
  };
}

export function serializeCustomer(customer) {
  const user = customer.user || {};
  return {
    id: customer.id,
    userId: customer.userId,
    name: user.name || customer.contactName,
    email: user.email || '',
    isActive: Boolean(user.isActive),
    businessName: customer.businessName,
    commercialName: customer.commercialName,
    rfc: customer.rfc,
    contactName: customer.contactName,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
    sanitaryLicense: customer.sanitaryLicense,
    isAuthorized: customer.isAuthorized,
    creditEnabled: customer.creditEnabled,
    creditLimit: moneyToNumber(customer.creditLimitCents),
    creditUsed: moneyToNumber(customer.creditUsedCents),
    creditAvailable: moneyToNumber(Math.max(0, customer.creditLimitCents - customer.creditUsedCents)),
    creditStatus: customer.creditStatus,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
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
  const originalPrice = offerApplication?.originalPrice ?? moneyToNumber(product.priceCents);
  const price = offerApplication?.finalPrice ?? moneyToNumber(product.priceCents);

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
          discountValue: offerApplication.offer.discountType === 'PERCENTAGE'
            ? Number(offerApplication.offer.discountPercentageBps || 0) / 100
            : moneyToNumber(offerApplication.offer.discountValueCents),
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
    discountValue: offer.discountType === 'PERCENTAGE'
      ? Number(offer.discountPercentageBps || 0) / 100
      : moneyToNumber(offer.discountValueCents),
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
    subtotal: moneyToNumber(order.subtotalCents),
    discountTotal: moneyToNumber(order.discountTotalCents),
    total: moneyToNumber(order.totalCents),
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
      unitPrice: moneyToNumber(item.unitPriceCents),
      originalUnitPrice: moneyToNumber(item.originalUnitPriceCents || item.unitPriceCents),
      discountAmount: moneyToNumber(item.discountAmountCents),
      offerTitle: item.offerTitle || '',
      subtotal: moneyToNumber(item.subtotalCents),
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
