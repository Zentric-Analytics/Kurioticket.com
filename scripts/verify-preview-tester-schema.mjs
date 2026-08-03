import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required for PreviewTester schema verification.");

const migration = await readFile("prisma/migrations/20260803180000_add_preview_testers/migration.sql", "utf8");
const destructive = /\b(DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET|ALTER\s+TABLE\s+(?!"PreviewTester"))\b/i;
if (destructive.test(migration)) throw new Error("PreviewTester migration contains a destructive or existing-table ALTER statement.");

const client = new Client({ connectionString });
await client.connect();

try {
  const enumResult = await client.query(`
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'PreviewTesterStatus'
    ORDER BY enumsortorder
  `);
  const enumLabels = enumResult.rows.map((row) => row.enumlabel);
  if (JSON.stringify(enumLabels) !== JSON.stringify(["ACTIVE", "SUSPENDED", "REVOKED"])) {
    throw new Error("PreviewTesterStatus does not match the approved labels.");
  }

  const columnsResult = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PreviewTester'
  `);
  const columns = new Map(columnsResult.rows.map((row) => [row.column_name, row]));
  for (const name of ["id", "email", "emailNormalized", "status", "allowGoogleSignIn", "allowStagingEmail", "expiresAt", "approvedByAdminId", "approvedAt", "suspendedByAdminId", "suspendedAt", "revokedByAdminId", "revokedAt", "reason", "createdAt", "updatedAt"]) {
    if (!columns.has(name)) throw new Error(`PreviewTester is missing required column ${name}.`);
  }
  for (const name of ["approvedByAdminId", "suspendedByAdminId", "revokedByAdminId"]) {
    if (columns.get(name)?.is_nullable !== "YES") throw new Error(`${name} must remain nullable.`);
  }
  if (!String(columns.get("status")?.column_default || "").includes("SUSPENDED")) {
    throw new Error("PreviewTester status must default fail-closed to SUSPENDED.");
  }

  const indexResult = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'PreviewTester'
  `);
  const indexNames = new Set(indexResult.rows.map((row) => row.indexname));
  for (const name of ["PreviewTester_emailNormalized_key", "PreviewTester_status_expiresAt_idx", "PreviewTester_approvedByAdminId_idx", "PreviewTester_suspendedByAdminId_idx", "PreviewTester_revokedByAdminId_idx"]) {
    if (!indexNames.has(name)) throw new Error(`PreviewTester is missing required index ${name}.`);
  }
  const normalizedIndex = indexResult.rows.find((row) => row.indexname === "PreviewTester_emailNormalized_key");
  if (!normalizedIndex?.indexdef.includes("UNIQUE")) throw new Error("Normalized tester email index must be unique.");

  const foreignKeys = await client.query(`
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = '"PreviewTester"'::regclass AND contype = 'f'
  `);
  if (foreignKeys.rowCount !== 3 || foreignKeys.rows.some((row) => row.confdeltype !== "n")) {
    throw new Error("PreviewTester audit foreign keys must all use ON DELETE SET NULL.");
  }

  const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM "PreviewTester"`);
  if (countResult.rows[0]?.count !== 0) throw new Error("PreviewTester migration must not seed records.");

  console.log("[preview-tester-schema] Enum, table, constraints, indexes, nullable audit references, and zero seed rows verified.");
} finally {
  await client.end();
}
