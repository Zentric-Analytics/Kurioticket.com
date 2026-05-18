import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const databaseUrlEnvNames = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"];
const initialMigrationName = "20260517000000_initial_auth_foundation";
const adminMigrationName = "20260518000000_admin_users_audit";

function getDatabaseUrl() {
  for (const name of databaseUrlEnvNames) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }

  return { name: "DATABASE_URL", value: "" };
}

function runPrisma(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, ["prisma", ...args], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function isMigrationApplied(migration) {
  return Boolean(migration?.finished_at && !migration?.rolled_back_at);
}

function isMigrationFailed(migration) {
  return Boolean(migration && !migration.finished_at && !migration.rolled_back_at);
}

async function getMigrationRecord(client, migrationName) {
  const migrationResult = await client.query(
    `
      SELECT finished_at, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name = $1
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [migrationName],
  );

  return migrationResult.rows[0] ?? null;
}

async function getDatabaseState(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const migrationTableResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS "exists"
    `);
    const appTableResult = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
    `);

    const hasMigrationTable = Boolean(migrationTableResult.rows[0]?.exists);
    const userStatusColumnResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name = 'status'
      ) AS "exists"
    `);
    const adminAuditTableResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'AdminAuditLog'
      ) AS "exists"
    `);

    const initialMigration = hasMigrationTable ? await getMigrationRecord(client, initialMigrationName) : null;
    const adminMigration = hasMigrationTable ? await getMigrationRecord(client, adminMigrationName) : null;

    return {
      adminMigrationApplied: isMigrationApplied(adminMigration),
      adminMigrationFailed: isMigrationFailed(adminMigration),
      adminSchemaPresent: Boolean(userStatusColumnResult.rows[0]?.exists && adminAuditTableResult.rows[0]?.exists),
      appTableCount: Number(appTableResult.rows[0]?.count ?? 0),
      initialMigrationApplied: isMigrationApplied(initialMigration),
      initialMigrationFailed: isMigrationFailed(initialMigration),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl.value) {
    console.error(
      `[render-migrate] Missing DATABASE_URL. Set one of: ${databaseUrlEnvNames.join(", ")} before running migrations.`,
    );
    process.exit(1);
  }

  console.log(`[render-migrate] Checking Prisma migration state using ${databaseUrl.name}.`);

  const state = await getDatabaseState(databaseUrl.value);
  const shouldBaselineInitialMigration = state.appTableCount > 0 && !state.initialMigrationApplied;
  const shouldBaselineAdminMigration = state.adminSchemaPresent && !state.adminMigrationApplied;

  if (state.initialMigrationFailed) {
    console.log(`[render-migrate] Marking failed baseline migration ${initialMigrationName} as rolled back.`);
    runPrisma(["migrate", "resolve", "--rolled-back", initialMigrationName]);
  }

  if (state.adminMigrationFailed) {
    console.log(`[render-migrate] Marking failed admin migration ${adminMigrationName} as rolled back.`);
    runPrisma(["migrate", "resolve", "--rolled-back", adminMigrationName]);
  }

  if (shouldBaselineInitialMigration) {
    console.log(
      `[render-migrate] Existing schema detected without applied Prisma baseline; marking ${initialMigrationName} as applied.`,
    );
    runPrisma(["migrate", "resolve", "--applied", initialMigrationName]);
  }

  if (shouldBaselineAdminMigration) {
    console.log(
      `[render-migrate] Admin schema detected without applied Prisma history; marking ${adminMigrationName} as applied.`,
    );
    runPrisma(["migrate", "resolve", "--applied", adminMigrationName]);
  }

  console.log("[render-migrate] Applying pending Prisma migrations.");
  runPrisma(["migrate", "deploy"]);
}

main().catch((error) => {
  console.error("[render-migrate] Migration deployment failed.");
  console.error(error);
  process.exit(1);
});
