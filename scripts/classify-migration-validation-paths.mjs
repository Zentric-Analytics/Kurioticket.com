import { appendFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXACT_MIGRATION_PATHS = new Set([
  ".github/workflows/migration-validation.yml",
  "package-lock.json",
  "package.json",
  "prisma.config.ts",
  "scripts/check-prisma-migration-timestamps.mjs",
  "scripts/classify-migration-validation-paths.mjs",
  "scripts/deploy-render-migrations.mjs",
  "scripts/migration-validation-workflow.test.mjs",
  "scripts/run-render-migrations.mjs",
  "scripts/verify-production-schema.mjs",
]);

export function isMigrationValidationPath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return true;
  }

  const normalizedPath = filePath.replaceAll("\\", "/");
  return normalizedPath.startsWith("prisma/") || EXACT_MIGRATION_PATHS.has(normalizedPath);
}

export function classifyMigrationValidationPaths(filePaths) {
  if (!Array.isArray(filePaths)) {
    return { applicable: true, reason: "uncertain-change-set" };
  }

  const applicable = filePaths.some(isMigrationValidationPath);
  return {
    applicable,
    reason: applicable ? "migration-related-change" : "not-applicable",
  };
}

async function main() {
  const changedFilesPath = process.argv[2];
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!changedFilesPath || !outputPath) {
    throw new Error("Usage: classify-migration-validation-paths.mjs <changed-files-file> with GITHUB_OUTPUT set");
  }

  const changedFiles = (await readFile(changedFilesPath, "utf8"))
    .split(/\r?\n/u)
    .filter(Boolean);
  const result = classifyMigrationValidationPaths(changedFiles);
  await appendFile(
    outputPath,
    `applicable=${result.applicable}\nclassification=${result.reason}\n`,
    "utf8",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
