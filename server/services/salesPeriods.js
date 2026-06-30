import prisma from '../db.js';

const LOOKBACK = { DAILY: 30, WEEKLY: 12, MONTHLY: 6, ANNUAL: 3 };
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function startOfDay(d) {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d) {
  const r = new Date(d);
  const dow = r.getUTCDay(); // 0=Dom
  r.setUTCDate(r.getUTCDate() - (dow === 0 ? 6 : dow - 1)); // retrocede al lunes
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d) {
  const r = new Date(d);
  r.setUTCDate(1);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function startOfYear(d) {
  const r = new Date(d);
  r.setUTCMonth(0, 1);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function getPeriodStart(type, d) {
  if (type === 'DAILY') return startOfDay(d);
  if (type === 'WEEKLY') return startOfWeek(d);
  if (type === 'MONTHLY') return startOfMonth(d);
  return startOfYear(d);
}

function getPeriodEnd(type, start) {
  const r = new Date(start);
  if (type === 'DAILY') {
    r.setUTCHours(23, 59, 59, 999);
    return r;
  }
  if (type === 'WEEKLY') {
    r.setUTCDate(r.getUTCDate() + 6);
    r.setUTCHours(23, 59, 59, 999);
    return r;
  }
  if (type === 'MONTHLY') {
    r.setUTCMonth(r.getUTCMonth() + 1, 0); // día 0 del mes siguiente = último día del mes actual
    r.setUTCHours(23, 59, 59, 999);
    return r;
  }
  r.setUTCMonth(11, 31);
  r.setUTCHours(23, 59, 59, 999);
  return r;
}

function nextPeriodStart(type, start) {
  const r = new Date(start);
  if (type === 'DAILY') r.setUTCDate(r.getUTCDate() + 1);
  else if (type === 'WEEKLY') r.setUTCDate(r.getUTCDate() + 7);
  else if (type === 'MONTHLY') r.setUTCMonth(r.getUTCMonth() + 1);
  else r.setUTCFullYear(r.getUTCFullYear() + 1);
  return r;
}

function getLabel(type, start) {
  const d = new Date(start);
  if (type === 'DAILY') {
    return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  if (type === 'WEEKLY') {
    const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getUTCDay() + 1) / 7);
    return `Sem ${weekNum}, ${d.getUTCFullYear()}`;
  }
  if (type === 'MONTHLY') {
    return `${MONTHS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  return `${d.getUTCFullYear()}`;
}

export async function refreshSalesPeriods(type) {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: { status: 'SUPPLIED' },
    select: {
      totalCents: true,
      createdAt: true,
      items: { select: { quantity: true } },
    },
  });

  if (!orders.length) return { periodsComputed: 0 };

  const earliest = orders.reduce(
    (min, o) => (o.createdAt < min ? o.createdAt : min),
    orders[0].createdAt,
  );

  const buckets = new Map();
  let cursor = getPeriodStart(type, earliest);
  const currentStart = getPeriodStart(type, now);

  while (cursor <= currentStart) {
    const key = cursor.toISOString();
    const start = new Date(cursor);
    const end = getPeriodEnd(type, start);
    buckets.set(key, {
      startDate: start,
      endDate: end,
      label: getLabel(type, start),
      revenueCents: 0,
      orderCount: 0,
      unitsSold: 0,
      isComplete: end < now,
    });
    cursor = nextPeriodStart(type, cursor);
  }

  for (const order of orders) {
    const key = getPeriodStart(type, order.createdAt).toISOString();
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenueCents += order.totalCents;
      bucket.orderCount += 1;
      bucket.unitsSold += order.items.reduce((s, item) => s + item.quantity, 0);
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => a.startDate - b.startDate);
  const lookback = LOOKBACK[type];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const completedBefore = sorted.slice(Math.max(0, i - lookback), i).filter((x) => x.isComplete);

    if (p.isComplete) {
      if (completedBefore.length) {
        p.projectedRevenueCents = Math.round(completedBefore.reduce((s, x) => s + x.revenueCents, 0) / completedBefore.length);
        p.projectedOrderCount = Math.round(completedBefore.reduce((s, x) => s + x.orderCount, 0) / completedBefore.length);
        p.projectedUnitsSold = Math.round(completedBefore.reduce((s, x) => s + x.unitsSold, 0) / completedBefore.length);
      } else {
        p.projectedRevenueCents = p.revenueCents;
        p.projectedOrderCount = p.orderCount;
        p.projectedUnitsSold = p.unitsSold;
      }
    } else {
      const elapsedMs = Math.max(now - p.startDate, 1);
      const totalMs = p.endDate - p.startDate;
      const fraction = Math.min(elapsedMs / totalMs, 1);

      if (p.orderCount > 0) {
        p.projectedRevenueCents = Math.round(p.revenueCents / fraction);
        p.projectedOrderCount = Math.round(p.orderCount / fraction);
        p.projectedUnitsSold = Math.round(p.unitsSold / fraction);
      } else if (completedBefore.length) {
        p.projectedRevenueCents = Math.round(completedBefore.reduce((s, x) => s + x.revenueCents, 0) / completedBefore.length);
        p.projectedOrderCount = Math.round(completedBefore.reduce((s, x) => s + x.orderCount, 0) / completedBefore.length);
        p.projectedUnitsSold = Math.round(completedBefore.reduce((s, x) => s + x.unitsSold, 0) / completedBefore.length);
      } else {
        p.projectedRevenueCents = 0;
        p.projectedOrderCount = 0;
        p.projectedUnitsSold = 0;
      }
    }
  }

  const computedAt = now;
  for (const p of sorted) {
    await prisma.salesPeriod.upsert({
      where: { periodType_startDate: { periodType: type, startDate: p.startDate } },
      create: {
        periodType: type,
        label: p.label,
        startDate: p.startDate,
        endDate: p.endDate,
        revenueCents: p.revenueCents,
        orderCount: p.orderCount,
        unitsSold: p.unitsSold,
        projectedRevenueCents: p.projectedRevenueCents,
        projectedOrderCount: p.projectedOrderCount,
        projectedUnitsSold: p.projectedUnitsSold,
        isComplete: p.isComplete,
        computedAt,
      },
      update: {
        label: p.label,
        revenueCents: p.revenueCents,
        orderCount: p.orderCount,
        unitsSold: p.unitsSold,
        projectedRevenueCents: p.projectedRevenueCents,
        projectedOrderCount: p.projectedOrderCount,
        projectedUnitsSold: p.projectedUnitsSold,
        isComplete: p.isComplete,
        computedAt,
      },
    });
  }

  return { periodsComputed: sorted.length };
}

export async function getSalesPeriods(type, limit = 12) {
  const rows = await prisma.salesPeriod.findMany({
    where: { periodType: type },
    orderBy: { startDate: 'desc' },
    take: limit + 1, // +1 para calcular el % vs anterior del más antiguo visible
  });

  const sliced = rows.slice(0, limit);
  return sliced.map((p, i) => {
    const prev = rows[i + 1];
    const vsLast = prev
      ? {
          revenuePct: prev.revenueCents
            ? Math.round(((p.revenueCents - prev.revenueCents) / prev.revenueCents) * 1000) / 10
            : null,
          orderCountPct: prev.orderCount
            ? Math.round(((p.orderCount - prev.orderCount) / prev.orderCount) * 1000) / 10
            : null,
          unitsSoldPct: prev.unitsSold
            ? Math.round(((p.unitsSold - prev.unitsSold) / prev.unitsSold) * 1000) / 10
            : null,
        }
      : null;
    return { ...p, vsLast };
  });
}
