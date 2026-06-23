import { calculateDiscount, moneyToNumber } from '../utils/money.js';

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

export function getOfferApplication(product, offers, now = new Date()) {
  const applicableOffers = offers
    .filter((offer) => isOfferActive(offer, now) && offerAppliesToProduct(offer, product))
    .map((offer) => ({ offer, discountAmountCents: calculateDiscount(product.priceCents, offer) }))
    .filter(({ discountAmountCents }) => discountAmountCents > 0)
    .sort((left, right) => {
      if (right.discountAmountCents !== left.discountAmountCents) {
        return right.discountAmountCents - left.discountAmountCents;
      }
      return new Date(left.offer.endsAt) - new Date(right.offer.endsAt);
    });

  const bestMatch = applicableOffers[0];
  if (!bestMatch) return null;

  return {
    offer: bestMatch.offer,
    originalPriceCents: product.priceCents,
    discountAmountCents: bestMatch.discountAmountCents,
    finalPriceCents: product.priceCents - bestMatch.discountAmountCents,
    originalPrice: moneyToNumber(product.priceCents),
    discountAmount: moneyToNumber(bestMatch.discountAmountCents),
    finalPrice: moneyToNumber(product.priceCents - bestMatch.discountAmountCents),
  };
}
