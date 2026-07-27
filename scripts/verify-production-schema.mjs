import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const databaseUrlEnvNames = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
];

const requiredTables = ["User", "UserProfile", "UserSecuritySettings"];
const requiredUserProfileColumns = [
  "id",
  "userId",
  "fullName",
  "phoneNumber",
  "phoneCountryCode",
  "dateOfBirth",
  "gender",
  "nationality",
  "address",
  "createdAt",
  "updatedAt",
];
const requiredSecurityColumns = [
  "id",
  "userId",
  "securityEmailAlerts",
  "twoFactorEnabled",
  "twoFactorMethod",
  "twoFactorSecretEncrypted",
  "twoFactorLastUsedStep",
  "recoveryCodesHash",
  "twoFactorEnabledAt",
  "twoFactorDisabledAt",
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

function runPrismaStatus() {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, ["prisma", "migrate", "status"], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma migrate status exited with code ${result.status ?? 1}.`);
  }
}

function missingValues(actualValues, requiredValues) {
  const actual = new Set(actualValues);
  return requiredValues.filter((value) => !actual.has(value));
}

async function verifyDatabase(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const failedMigrationsResult = await client.query(`
      SELECT migration_name, started_at
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at
    `);

    if (failedMigrationsResult.rows.length > 0) {
      const names = failedMigrationsResult.rows
        .map((row) => row.migration_name)
        .join(", ");
      throw new Error(`Unresolved failed Prisma migrations found: ${names}`);
    }

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const missingTables = missingValues(
      tablesResult.rows.map((row) => row.table_name),
      requiredTables,
    );

    if (missingTables.length > 0) {
      throw new Error(`Required database tables are missing: ${missingTables.join(", ")}`);
    }

    const userProfileColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserProfile'
    `);
    const missingUserProfileColumns = missingValues(
      userProfileColumnsResult.rows.map((row) => row.column_name),
      requiredUserProfileColumns,
    );

    if (missingUserProfileColumns.length > 0) {
      throw new Error(
        `UserProfile is missing required columns: ${missingUserProfileColumns.join(", ")}`,
      );
    }

    const securityColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserSecuritySettings'
    `);
    const missingSecurityColumns = missingValues(
      securityColumnsResult.rows.map((row) => row.column_name),
      requiredSecurityColumns,
    );

    if (missingSecurityColumns.length > 0) {
      throw new Error(
        `UserSecuritySettings is missing required columns: ${missingSecurityColumns.join(", ")}`,
      );
    }

    const profileIndexResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'UserProfile'
          AND indexname = 'UserProfile_createdAt_idx'
      ) AS "exists"
    `);

    if (!profileIndexResult.rows[0]?.exists) {
      throw new Error('Required index UserProfile_createdAt_idx is missing.');
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl.value) {
    console.error(
      `[schema-verify] Missing database URL. Set one of: ${databaseUrlEnvNames.join(", ")}.`,
    );
    process.exit(1);
  }

  console.log(`[schema-verify] Verifying database using ${databaseUrl.name}.`);
  await verifyDatabase(databaseUrl.value);
  runPrismaStatus();
  console.log("[schema-verify] Database schema and migration history are healthy.");
}

main().catch((error) => {
  console.error("[schema-verify] Database verification failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
