export const OFFER_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'];

export const offerInclude = {
  product: { select: { id: true, sku: true, commercialName: true } },
  laboratory: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
};

export function isOfferActive(offer, now = new Date()) {
  return offer.isActive && offer.startsAt <= now && offer.endsAt >= now;
}

export async function getActiveOffers(client, now = new Date()) {
  return client.offer.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: offerInclude,
    orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
  });
}

function offerAppliesToProduct(offer, product) {
  return (
    offer.productId === product.id ||
    offer.laboratoryId === product.laboratoryId ||
    offer.categoryId === product.categoryId ||
    offer.productType === product.productType
  );
}

function getDiscountAmount(price, offer) {
  const rawDiscount =
    offer.discountType === 'PERCENTAGE'
      ? price * (offer.discountValue / 100)
      : offer.discountValue;

  return Math.max(0, Math.min(price, Math.round(rawDiscount * 100) / 100));
}

export function getOfferApplication(product, offers, now = new Date()) {
  const applicableOffers = offers
    .filter((offer) => isOfferActive(offer, now) && offerAppliesToProduct(offer, product))
    .map((offer) => ({ offer, discountAmount: getDiscountAmount(product.price, offer) }))
    .filter(({ discountAmount }) => discountAmount > 0)
    .sort((left, right) => {
      if (right.discountAmount !== left.discountAmount) {
        return right.discountAmount - left.discountAmount;
      }
      return new Date(left.offer.endsAt) - new Date(right.offer.endsAt);
    });

  const bestMatch = applicableOffers[0];
  if (!bestMatch) return null;

  return {
    offer: bestMatch.offer,
    originalPrice: product.price,
    discountAmount: bestMatch.discountAmount,
    finalPrice: Math.max(0, Math.round((product.price - bestMatch.discountAmount) * 100) / 100),
  };
}
