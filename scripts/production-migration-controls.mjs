export const PRODUCTION_MIGRATION_LIMITS = Object.freeze({ lockTimeoutMs: 5000, statementTimeoutMs: 120000 });

/** Adds connection-local limits; never changes the environment, role or database defaults. */
export function withMigrationLimits(raw, limits = PRODUCTION_MIGRATION_LIMITS) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Invalid migration database URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Migration limits require PostgreSQL.');
  for (const value of [limits.lockTimeoutMs, limits.statementTimeoutMs]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Migration limits must be positive integer milliseconds.');
  }
  const existing = url.searchParams.get('options')?.trim();
  const settings = `-c lock_timeout=${limits.lockTimeoutMs} -c statement_timeout=${limits.statementTimeoutMs} -c application_name=kurioticket-production-migrate`;
  url.searchParams.set('options', [existing, settings].filter(Boolean).join(' '));
  return url.href;
}

/** Prisma CLI configuration only. Application queries keep the original DATABASE_URL. */
export function productionMigrationUrl(raw, env = process.env, argv = process.argv) {
  if (!raw || !argv.some((arg, index) => arg === 'migrate' && argv[index + 1] === 'deploy')) return raw;
  let app;
  try { app = new URL(env.NEXT_PUBLIC_APP_URL || ''); } catch { return raw; }
  if (app.protocol !== 'https:' || !['kurioticket.com', 'www.kurioticket.com'].includes(app.hostname)) return raw;
  return withMigrationLimits(raw);
}
