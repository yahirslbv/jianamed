// Preloaded via --import before any test file module is evaluated.
// Uses ??= so variables already set in the environment (CI) are not overwritten.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'file:./server/prisma/test.db';
process.env.SESSION_SECRET ??= 'test-only-secret-minimum-32-chars-long-for-tests';
process.env.FRONTEND_ORIGINS ??= 'http://localhost:5173';
process.env.COOKIE_SECURE ??= 'false';
process.env.COOKIE_SAME_SITE ??= 'lax';
process.env.TRUST_PROXY ??= 'false';
