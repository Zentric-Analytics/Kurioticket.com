import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { createJiti } from 'jiti';

// Synthetic-only destructive experiment; refuse every non-local database.
const target = new URL(process.env.DIAGNOSIS_DATABASE_URL || 'http://invalid');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/kurioticket_diagnosis');
const container = 'kurioticket-pg-diagnosis';
function memory() {
  return execFileSync('docker', ['exec', container, 'sh', '-c',
    'cat /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.events'], { encoding: 'utf8' }).trim();
}
const client = new pg.Client({ connectionString: target.href });
client.on('error', () => {});
await client.connect();
await client.query('CREATE TABLE IF NOT EXISTS diagnosis_cache (id text PRIMARY KEY, payload jsonb NOT NULL)');
const timeoutMs = Number(process.env.DIAGNOSIS_TIMEOUT_MS ?? 4000);
assert.ok([0, 4000].includes(timeoutMs));
await client.query(`SET statement_timeout = '${timeoutMs}ms'`);
const sizes = process.argv.slice(2).map(Number);
assert.ok(sizes.length && sizes.every(n => Number.isInteger(n) && n > 0 && n <= 64));
for (const mib of sizes) {
  // Nested result shape rather than one compressible giant string.
  const results = Array.from({ length: Math.ceil(mib * 1024 * 1024 / 4096) }, (_, i) => ({
    id: `synthetic-${i}`, name: 'Synthetic hotel',
    rooms: Array.from({ length: 16 }, (_, r) => ({ id: r, price: i + r, policy: 'Synthetic cancellation policy. '.repeat(7) })),
  }));
  const payload = JSON.stringify(results);
  const started = Date.now();
  console.log(JSON.stringify({ event: 'before', timeoutMs, chunked: process.env.DIAGNOSIS_CHUNKED === '1', payloadBytes: Buffer.byteLength(payload), memory: memory() }));
  try {
    if (process.env.DIAGNOSIS_CHUNKED === '1') {
      const { encodeCohort, decodeCohort } = await createJiti(import.meta.url).import('../src/lib/search/cohortEncoding.ts');
      const { manifest, chunks } = await encodeCohort(results, randomUUID());
      for (let i = 0; i < chunks.length; i++) {
        await client.query('INSERT INTO diagnosis_cache VALUES ($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload', [`chunk-${i}`, JSON.stringify(chunks[i])]);
      }
      await client.query('INSERT INTO diagnosis_cache VALUES ($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload', ['manifest', JSON.stringify(manifest)]);
      const restored = [];
      for (let i = 0; i < chunks.length; i++) restored.push((await client.query('SELECT payload FROM diagnosis_cache WHERE id=$1', [`chunk-${i}`])).rows[0].payload);
      assert.deepEqual(await decodeCohort(manifest, restored), results);
      console.log(JSON.stringify({ event: 'roundtrip', results: results.length, chunks: chunks.length, maxParameterBytes: Math.max(...chunks.map(c => Buffer.byteLength(JSON.stringify(c)))) }));
    } else {
      await client.query('INSERT INTO diagnosis_cache VALUES ($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload', ['cohort', payload]);
    }
    console.log(JSON.stringify({ event: 'success', elapsedMs: Date.now() - started, memory: memory() }));
  } catch (error) {
    console.log(JSON.stringify({ event: 'failure', code: error.code, message: error.message?.slice(0,200), elapsedMs: Date.now() - started, memory: memory() }));
    process.exitCode = 1;
    break;
  }
}
await client.end().catch(() => {});
