import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const databaseUrlEnvNames = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"];
const initialMigrationName = "20260517000000_initial_auth_foundation";
const adminMigrationName = "20260518000000_admin_users_audit";
const userProfileMigrationName = "20260628000000_add_user_profile";
const renderStagingDatabaseName = "curioticket_web_staging_2489";
const expectedUserProfileColumns = [
  "id",
  "userId",
  "fullName",
  "phoneNumber",
  "dateOfBirth",
  "gender",
  "nationality",
  "address",
  "createdAt",
  "updatedAt",
];

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

function getDatabaseName(connectionString) {
  try {
    return new URL(connectionString).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function hasExpectedUserProfileColumns(columns) {
  const presentColumns = new Set(columns);
  return expectedUserProfileColumns.every((column) => presentColumns.has(column));
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
    const userProfileTableResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'UserProfile'
      ) AS "exists"
    `);
    const userProfileColumnResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserProfile'
      ORDER BY ordinal_position
    `);

    const initialMigration = hasMigrationTable ? await getMigrationRecord(client, initialMigrationName) : null;
    const adminMigration = hasMigrationTable ? await getMigrationRecord(client, adminMigrationName) : null;
    const userProfileMigration = hasMigrationTable ? await getMigrationRecord(client, userProfileMigrationName) : null;
    const userProfileColumns = userProfileColumnResult.rows.map((row) => row.column_name);

    return {
      adminMigrationApplied: isMigrationApplied(adminMigration),
      adminMigrationFailed: isMigrationFailed(adminMigration),
      adminSchemaPresent: Boolean(userStatusColumnResult.rows[0]?.exists && adminAuditTableResult.rows[0]?.exists),
      appTableCount: Number(appTableResult.rows[0]?.count ?? 0),
      initialMigrationApplied: isMigrationApplied(initialMigration),
      initialMigrationFailed: isMigrationFailed(initialMigration),
      userProfileColumns,
      userProfileMigrationApplied: isMigrationApplied(userProfileMigration),
      userProfileMigrationFailed: isMigrationFailed(userProfileMigration),
      userProfileSchemaMatches: Boolean(
        userProfileTableResult.rows[0]?.exists && hasExpectedUserProfileColumns(userProfileColumns),
      ),
      userProfileTableExists: Boolean(userProfileTableResult.rows[0]?.exists),
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
  runPrisma(["generate"]);

  const databaseName = getDatabaseName(databaseUrl.value);
  const isRenderStagingDatabase = databaseName === renderStagingDatabaseName;
  const state = await getDatabaseState(databaseUrl.value);
  const shouldBaselineInitialMigration = state.appTableCount > 0 && !state.initialMigrationApplied;
  const shouldBaselineAdminMigration = state.adminSchemaPresent && !state.adminMigrationApplied;
  const shouldResolveUserProfileMigration =
    isRenderStagingDatabase &&
    state.userProfileMigrationFailed &&
    state.userProfileTableExists &&
    state.userProfileSchemaMatches;

  if (isRenderStagingDatabase) {
    console.log(`[render-migrate] Confirmed target database: ${renderStagingDatabaseName}.`);
    console.log(`[render-migrate] UserProfile table exists: ${state.userProfileTableExists ? "yes" : "no"}.`);
    console.log(`[render-migrate] UserProfile columns: ${state.userProfileColumns.join(", ") || "none"}.`);
  }

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

  if (state.userProfileMigrationFailed && isRenderStagingDatabase && !state.userProfileSchemaMatches) {
    console.error(
      `[render-migrate] ${userProfileMigrationName} failed on staging, but UserProfile does not match the current schema. Manual review required; refusing to drop or alter staging data automatically.`,
    );
    process.exit(1);
  }

  if (shouldResolveUserProfileMigration) {
    console.log(
      `[render-migrate] Existing UserProfile schema matches Prisma on staging; marking failed migration ${userProfileMigrationName} as applied.`,
    );
    runPrisma(["migrate", "resolve", "--applied", userProfileMigrationName]);
  }

  console.log("[render-migrate] Applying pending Prisma migrations.");
  runPrisma(["migrate", "deploy"]);
}

main().catch((error) => {
  console.error("[render-migrate] Migration deployment failed.");
  console.error(error);
  process.exit(1);
});
