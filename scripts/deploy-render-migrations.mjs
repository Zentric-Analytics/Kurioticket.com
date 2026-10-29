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
const initialMigrationName = "20260517000000_initial_auth_foundation";
const adminMigrationName = "20260518000000_admin_users_audit";
const legacyUserProfileMigrationName = "20260628000000_add_user_profile";
const canonicalUserProfileMigrationName = "20260628000000_add_user_profiles";
const sharedUserProfileColumns = [
  "id",
  "userId",
  "dateOfBirth",
  "gender",
  "nationality",
  "address",
  "createdAt",
  "updatedAt",
];
const canonicalUserProfileColumns = [
  ...sharedUserProfileColumns,
  "fullName",
  "phoneNumber",
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

function hasColumns(columns, requiredColumns) {
  const presentColumns = new Set(columns);
  return requiredColumns.every((column) => presentColumns.has(column));
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

    const initialMigration = hasMigrationTable
      ? await getMigrationRecord(client, initialMigrationName)
      : null;
    const adminMigration = hasMigrationTable
      ? await getMigrationRecord(client, adminMigrationName)
      : null;
    const legacyUserProfileMigration = hasMigrationTable
      ? await getMigrationRecord(client, legacyUserProfileMigrationName)
      : null;
    const canonicalUserProfileMigration = hasMigrationTable
      ? await getMigrationRecord(client, canonicalUserProfileMigrationName)
      : null;
    const userProfileColumns = userProfileColumnResult.rows.map(
      (row) => row.column_name,
    );

    return {
      adminMigrationApplied: isMigrationApplied(adminMigration),
      adminMigrationFailed: isMigrationFailed(adminMigration),
      adminSchemaPresent: Boolean(
        userStatusColumnResult.rows[0]?.exists &&
          adminAuditTableResult.rows[0]?.exists,
      ),
      appTableCount: Number(appTableResult.rows[0]?.count ?? 0),
      canonicalUserProfileMigrationApplied: isMigrationApplied(
        canonicalUserProfileMigration,
      ),
      canonicalUserProfileMigrationFailed: isMigrationFailed(
        canonicalUserProfileMigration,
      ),
      initialMigrationApplied: isMigrationApplied(initialMigration),
      migrationTableExists: hasMigrationTable,
      initialMigrationFailed: isMigrationFailed(initialMigration),
      legacyUserProfileMigrationApplied: isMigrationApplied(
        legacyUserProfileMigration,
      ),
      userProfileColumns,
      userProfileHasCanonicalColumns: hasColumns(
        userProfileColumns,
        canonicalUserProfileColumns,
      ),
      userProfileHasLegacySignature: Boolean(
        hasColumns(userProfileColumns, sharedUserProfileColumns) &&
          userProfileColumns.includes("phone"),
      ),
      userProfileTableExists: Boolean(userProfileTableResult.rows[0]?.exists),
    };
  } finally {
    await client.end();
  }
}

async function repairCanonicalUserProfileSchema(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE "UserProfile"
        ADD COLUMN IF NOT EXISTS "fullName" TEXT,
        ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'UserProfile'
            AND column_name = 'phone'
        ) THEN
          UPDATE "UserProfile"
          SET "phoneNumber" = COALESCE("phoneNumber", "phone")
          WHERE "phoneNumber" IS NULL
            AND "phone" IS NOT NULL;
        END IF;
      END
      $$
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "UserProfile_createdAt_idx"
      ON "UserProfile" ("createdAt")
    `);

    const verificationResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserProfile'
    `);
    const columns = verificationResult.rows.map((row) => row.column_name);

    if (!hasColumns(columns, canonicalUserProfileColumns)) {
      throw new Error(
        "UserProfile repair did not produce the expected canonical columns.",
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
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

  console.log(
    `[render-migrate] Checking Prisma migration state using ${databaseUrl.name}.`,
  );
  runPrisma(["generate"]);

  let state = await getDatabaseState(databaseUrl.value);
  const shouldBaselineInitialMigration =
    state.appTableCount > 0 && !state.initialMigrationApplied;
  const shouldBaselineAdminMigration =
    state.adminSchemaPresent && !state.adminMigrationApplied;

  if (state.initialMigrationFailed) {
    console.log(
      `[render-migrate] Marking failed baseline migration ${initialMigrationName} as rolled back.`,
    );
    runPrisma(["migrate", "resolve", "--rolled-back", initialMigrationName]);
  }

  if (state.adminMigrationFailed) {
    console.log(
      `[render-migrate] Marking failed admin migration ${adminMigrationName} as rolled back.`,
    );
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

  if (state.canonicalUserProfileMigrationFailed) {
    console.log(
      `[render-migrate] Found failed migration ${canonicalUserProfileMigrationName}.`,
    );
    console.log(
      `[render-migrate] UserProfile columns: ${state.userProfileColumns.join(", ") || "none"}.`,
    );

    const canSafelyReconcile = Boolean(
      state.userProfileTableExists &&
        state.legacyUserProfileMigrationApplied &&
        (state.userProfileHasLegacySignature ||
          state.userProfileHasCanonicalColumns),
    );

    if (!canSafelyReconcile) {
      console.error(
        `[render-migrate] Refusing automatic repair because the database does not match the known duplicate UserProfile migration state. Manual review required.`,
      );
      process.exit(1);
    }

    if (!state.userProfileHasCanonicalColumns) {
      console.log(
        "[render-migrate] Reconciling the legacy UserProfile table with the canonical schema.",
      );
      await repairCanonicalUserProfileSchema(databaseUrl.value);
    }

    state = await getDatabaseState(databaseUrl.value);
    if (!state.userProfileHasCanonicalColumns) {
      console.error(
        "[render-migrate] UserProfile schema verification failed after repair.",
      );
      process.exit(1);
    }

    console.log(
      `[render-migrate] Marking reconciled migration ${canonicalUserProfileMigrationName} as applied.`,
    );
    runPrisma([
      "migrate",
      "resolve",
      "--applied",
      canonicalUserProfileMigrationName,
    ]);
  }

  // Recover one known staging-only duplicate-index failure from PR #6560.
  // Never auto-resolve unrecognized migration failures or production databases.
  // On a fresh database, let Prisma create _prisma_migrations normally.
  if (state.migrationTableExists) {
    const client = new Client({ connectionString: databaseUrl.value });
    await client.connect();
    try {
      const stateResult = await client.query(`
        SELECT current_database() AS database_name,
          (SELECT COUNT(*)::int FROM "_prisma_migrations"
           WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed_count,
          (SELECT COUNT(*)::int FROM "_prisma_migrations"
           WHERE migration_name = '20261029090000_support_activity_index'
             AND finished_at IS NULL AND rolled_back_at IS NULL) AS target_failed_count,
          (SELECT COUNT(*)::int FROM "_prisma_migrations"
           WHERE migration_name = '20261028182000_index_support_ticket_activity'
             AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS original_applied_count,
          (SELECT indexdef FROM pg_indexes
           WHERE schemaname = 'public' AND tablename = 'SupportTicket'
             AND indexname = 'SupportTicket_updatedAt_id_idx') AS existing_index
      `);
      const row = stateResult.rows[0];
      if (Number(row?.target_failed_count) > 0) {
        const expectedIndex = 'CREATE INDEX "SupportTicket_updatedAt_id_idx" ON public."SupportTicket" USING btree ("updatedAt", id)';
        // The existing Render staging instance uses kurioticket_web_staging;
        // the checked-in Render Blueprint declares kurioticket_staging.
        const knownStagingDatabase = ["kurioticket_web_staging", "kurioticket_staging"].includes(row.database_name);
        const safe =
          knownStagingDatabase &&
          Number(row.failed_count) === 1 &&
          Number(row.target_failed_count) === 1 &&
          Number(row.original_applied_count) === 1 &&
          row.existing_index === expectedIndex;
        if (!safe) {
          throw new Error("Refusing automatic Support migration recovery: staging database or known duplicate-index state does not match.");
        }
        console.log("[render-migrate] Recovering known staging Support duplicate-index migration failure.");
        runPrisma(["migrate", "resolve", "--rolled-back", "20261029090000_support_activity_index"]);
      }
    } finally {
      await client.end();
    }
  }

  console.log("[render-migrate] Applying pending Prisma migrations.");
  runPrisma(["migrate", "deploy"]);
}

main().catch((error) => {
  console.error("[render-migrate] Migration deployment failed.");
  console.error(error);
  process.exit(1);
});
