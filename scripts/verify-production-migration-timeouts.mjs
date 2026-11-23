import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { withMigrationLimits } from './production-migration-controls.mjs';

// No production host, data, restore or application entrypoint is permitted here.
const raw = process.env.DATABASE_URL || '';
const target = new URL(raw);
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.KURIOTICKET_SYNTHETIC_PG18 !== '1' || !['127.0.0.1','localhost'].includes(target.hostname) || target.pathname !== '/kurioticket_release_ci') {
  throw new Error('Timeout verification is restricted to the existing synthetic loopback CI database.');
}
const require = createRequire(import.meta.url);
const admin = new pg.Client({connectionString:raw});
await admin.connect();
assert.match((await admin.query('SHOW server_version')).rows[0].server_version, /^18\./);
try {
  for (const kind of ['statement','lock']) {
    const schema = `kt_timeout_${randomUUID().replaceAll('-','')}`;
    const dir = mkdtempSync(join(tmpdir(), 'kurioticket-migration-timeout-'));
    let blocker;
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      let sql = 'SELECT pg_sleep(1);';
      if (kind === 'lock') {
        await admin.query(`CREATE TABLE "${schema}".lock_probe (id integer)`);
        blocker = new pg.Client({connectionString:raw}); await blocker.connect();
        await blocker.query('BEGIN'); await blocker.query(`LOCK TABLE "${schema}".lock_probe IN ACCESS EXCLUSIVE MODE`);
        sql = `ALTER TABLE "${schema}".lock_probe ADD COLUMN value integer;`;
      }
      const base = new URL(raw); base.searchParams.set('schema',schema);
      const bounded = withMigrationLimits(base.href, {lockTimeoutMs:150, statementTimeoutMs:kind === 'lock' ? 2000 : 150});
      writeFileSync(join(dir,'schema.prisma'), 'datasource db {\n provider = "postgresql"\n}\nmodel TimeoutProbe {\n id Int @id\n}\n');
      const migrations = join(dir,'migrations'); mkdirSync(join(migrations,'20261123000000_timeout_probe'),{recursive:true});
      writeFileSync(join(migrations,'migration_lock.toml'),'provider = "postgresql"\n');
      writeFileSync(join(migrations,'20261123000000_timeout_probe','migration.sql'),sql);
      const config = join(dir,'prisma.config.mjs');
      writeFileSync(config, `import { defineConfig } from ${JSON.stringify(pathToFileURL(require.resolve('prisma/config')).href)}; export default defineConfig(${JSON.stringify({schema:join(dir,'schema.prisma'),migrations:{path:migrations},datasource:{url:bounded}})});`);
      const child = spawn(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--config',config],{stdio:['ignore','pipe','pipe'],windowsHide:true});
      let output=''; child.stdout.on('data',c=>{output+=c;}); child.stderr.on('data',c=>{output+=c;});
      const timer=setTimeout(()=>child.kill('SIGTERM'),30000);
      const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code));}); clearTimeout(timer);
      assert.notEqual(exit,0,`${kind} probe unexpectedly applied`);
      assert.match(output,kind==='lock'?/lock timeout|55P03/:/statement timeout|57014/,`${kind} timeout was not reported by the actual Prisma runner`);
      console.log(`PASS actual Prisma migration ${kind} timeout (synthetic PostgreSQL 18; scaled 150 ms limit)`);
    } finally {
      if(blocker){await blocker.query('ROLLBACK');await blocker.end();}
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      const safe=resolve(dir); assert.equal(dirname(safe),resolve(tmpdir())); assert.ok(basename(safe).startsWith('kurioticket-migration-timeout-'));
      rmSync(safe,{recursive:true,force:true});
    }
  }
} finally { await admin.end(); }
