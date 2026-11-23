import assert from 'node:assert/strict';
import test from 'node:test';
import { productionMigrationUrl, withMigrationLimits } from './production-migration-controls.mjs';

const raw = 'postgresql://fixture:p%40ss@127.0.0.1:5432/fixture?schema=public&sslmode=require';
const prod = { NEXT_PUBLIC_APP_URL: 'https://kurioticket.com' };
test('production migrate deploy gets finite connection-local limits', () => {
  const url = new URL(productionMigrationUrl(raw, prod, ['node', 'prisma', 'migrate', 'deploy']));
  assert.match(url.searchParams.get('options'), /-c lock_timeout=5000 -c statement_timeout=120000/);
  assert.match(url.searchParams.get('options'), /application_name=kurioticket-production-migrate/);
});
test('credentials, target, TLS, schema and unrelated startup settings are preserved', () => {
  const original = new URL(raw); original.searchParams.set('options', '-c search_path=public');
  const changed = new URL(withMigrationLimits(original.href));
  for (const key of ['protocol','username','password','hostname','port','pathname']) assert.equal(changed[key], original[key]);
  assert.equal(changed.searchParams.get('sslmode'), 'require');
  assert.equal(changed.searchParams.get('schema'), 'public');
  assert.ok(changed.searchParams.get('options').startsWith('-c search_path=public '));
  assert.equal(original.searchParams.get('options'), '-c search_path=public');
});
test('other Prisma commands and staging connections remain unchanged', () => {
  for (const args of [['generate'],['validate'],['migrate','status'],['migrate','dev']]) assert.equal(productionMigrationUrl(raw, prod, args), raw);
  for (const origin of ['https://staging.kurioticket.com','http://kurioticket.com','https://kurioticket.com.invalid','']) assert.equal(productionMigrationUrl(raw, {NEXT_PUBLIC_APP_URL:origin}, ['migrate','deploy']), raw);
});
test('no environment or application connection string is mutated', () => {
  const env = { ...prod, DATABASE_URL:raw }; productionMigrationUrl(raw, env, ['migrate','deploy']);
  assert.deepEqual(env, { ...prod, DATABASE_URL:raw });
  assert.equal(productionMigrationUrl(undefined, prod, ['migrate','deploy']), undefined);
});
test('invalid targets and unbounded limits fail without disclosing connection input', () => {
  assert.throws(() => withMigrationLimits('invalid-private-input'), {message:'Invalid migration database URL.'});
  assert.throws(() => withMigrationLimits('mysql://fixture@localhost/db'), /require PostgreSQL/);
  for (const value of [0, -1, Infinity, NaN]) assert.throws(() => withMigrationLimits(raw,{lockTimeoutMs:value,statementTimeoutMs:120000}), /positive integer/);
});
