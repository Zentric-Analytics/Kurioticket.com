import process from "node:process";
import pg from "pg";

const { Client } = pg;

const requiredColumns = new Map([
  ["User", ["id", "email", "role", "status", "createdAt", "updatedAt"]],
  [
    "UserProfile",
    [
      "id",
      "userId",
      "fullName",
      "phoneNumber",
      "phoneCountryCode",
      "createdAt",
      "updatedAt",
    ],
  ],
  [
    "UserSecuritySettings",
    [
      "id",
      "userId",
      "securityEmailAlerts",
      "twoFactorEnabled",
      "createdAt",
      "updatedAt",
    ],
  ],
  ["Account", ["id", "userId", "provider", "providerAccountId"]],
  ["Session", ["id", "sessionToken", "userId", "expires"]],
  ["AccountSession", ["id", "userId", "client", "sessionVersion", "expiresAt", "revokedAt"]],
  ["SecurityEvent", ["id", "userId", "type", "occurredAt"]],
  ["UserPasskey", ["id", "userId", "credentialId", "publicKey"]],
  ["WebAuthnChallenge", ["id", "challenge", "type", "expiresAt"]],
]);

function fail(message) {
  console.error(`[schema-verify] ${message}`);
  process.exitCode = 1;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("SELECT 1");
    console.log("[schema-verify] Database connection succeeded.");

    const tableNames = [...requiredColumns.keys()];
    const tableResult = await client.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])`,
      [tableNames],
    );

    const existingTables = new Set(
      tableResult.rows.map((row) => row.table_name),
    );

    for (const tableName of tableNames) {
      if (!existingTables.has(tableName)) {
        fail(`Missing required table: public."${tableName}".`);
      }
    }

    const columnResult = await client.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])`,
      [tableNames],
    );

    const existingColumns = new Map();
    for (const row of columnResult.rows) {
      if (!existingColumns.has(row.table_name)) {
        existingColumns.set(row.table_name, new Set());
      }
      existingColumns.get(row.table_name).add(row.column_name);
    }

    for (const [tableName, columns] of requiredColumns) {
      const tableColumns = existingColumns.get(tableName) ?? new Set();
      for (const columnName of columns) {
        if (!tableColumns.has(columnName)) {
          fail(
            `Missing required column: public."${tableName}"."${columnName}".`,
          );
        }
      }
    }

    const migrationTableResult = await client.query(
      `SELECT to_regclass('public._prisma_migrations') AS migration_table`,
    );

    if (!migrationTableResult.rows[0]?.migration_table) {
      fail('Missing required table: public."_prisma_migrations".');
    }

    const failedMigrationResult = await client.query(
      `SELECT migration_name
         FROM "_prisma_migrations"
        WHERE finished_at IS NULL
          AND rolled_back_at IS NULL`,
    );

    if (failedMigrationResult.rowCount > 0) {
      for (const row of failedMigrationResult.rows) {
        fail(`Unresolved Prisma migration: ${row.migration_name}.`);
      }
    }

    if (process.exitCode) {
      throw new Error("Production schema verification failed.");
    }

    console.log(
      `[schema-verify] Verified ${requiredColumns.size} critical tables and their required columns.`,
    );
    console.log("[schema-verify] Production schema verification passed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[schema-verify] Verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
