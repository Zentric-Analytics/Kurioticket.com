import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const migrationsDirectory = path.join(process.cwd(), "prisma", "migrations");
const grandfatheredDuplicateMigrations = new Map([
  [
    "20260603000000",
    new Set([
      "20260603000000_homepage_fare_snapshots",
      "20260603000000_remove_premium_subscription_systems",
    ]),
  ],
  [
    "20260628000000",
    new Set([
      "20260628000000_add_user_profile",
      "20260628000000_add_user_profiles",
    ]),
  ],
]);
const migrationDirectoryPattern = /^(\d{14})_.+$/;

function isGrandfatheredDuplicate(timestamp, migrations) {
  const expectedMigrations = grandfatheredDuplicateMigrations.get(timestamp);

  if (!expectedMigrations || expectedMigrations.size !== migrations.length) {
    return false;
  }

  return migrations.every((migration) => expectedMigrations.has(migration));
}

async function main() {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });
  const migrationsByTimestamp = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const match = migrationDirectoryPattern.exec(entry.name);
    if (!match) continue;

    const timestamp = match[1];
    const migrations = migrationsByTimestamp.get(timestamp) ?? [];
    migrations.push(entry.name);
    migrationsByTimestamp.set(timestamp, migrations);
  }

  const unexpectedDuplicates = [...migrationsByTimestamp.entries()]
    .filter(
      ([timestamp, migrations]) =>
        migrations.length > 1 && !isGrandfatheredDuplicate(timestamp, migrations),
    )
    .sort(([left], [right]) => left.localeCompare(right));

  if (unexpectedDuplicates.length > 0) {
    console.error("Duplicate Prisma migration timestamps found:");

    for (const [timestamp, migrations] of unexpectedDuplicates) {
      console.error(` - ${timestamp}: ${migrations.sort().join(", ")}`);
    }

    console.error(
      "Create a new migration with a unique timestamp before merging.",
    );
    process.exit(1);
  }

  console.log("No unexpected duplicate Prisma migration timestamps found.");
}

main().catch((error) => {
  console.error("Unable to inspect Prisma migration timestamps.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
