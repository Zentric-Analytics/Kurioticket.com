import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyMigrationValidationPaths,
  isMigrationValidationPath,
} from "./classify-migration-validation-paths.mjs";

const workflow = await readFile(new URL("../.github/workflows/migration-validation.yml", import.meta.url), "utf8");

test("migration and Prisma schema changes run full validation", () => {
  assert.equal(isMigrationValidationPath("prisma/migrations/20260804_add_table/migration.sql"), true);
  assert.equal(isMigrationValidationPath("prisma/schema.prisma"), true);
});

test("migration workflow and shared dependency changes run full validation", () => {
  assert.equal(isMigrationValidationPath(".github/workflows/migration-validation.yml"), true);
  assert.equal(isMigrationValidationPath("package-lock.json"), true);
  assert.equal(isMigrationValidationPath("scripts/verify-production-schema.mjs"), true);
});

test("mobile workflow and documentation-only changes are not applicable", () => {
  assert.deepEqual(
    classifyMigrationValidationPaths([
      ".github/workflows/android-production-delivery.yml",
      "apps/mobile/app.config.ts",
    ]),
    { applicable: false, reason: "not-applicable" },
  );
  assert.deepEqual(classifyMigrationValidationPaths(["docs/release.md"]), {
    applicable: false,
    reason: "not-applicable",
  });
});

test("uncertain path classification fails closed to full validation", () => {
  assert.deepEqual(classifyMigrationValidationPaths(undefined), {
    applicable: true,
    reason: "uncertain-change-set",
  });
  assert.equal(isMigrationValidationPath(""), true);
});

test("workflow always schedules and retains the conclusive required check", () => {
  assert.doesNotMatch(workflow, /^\s+paths:/mu);
  assert.match(workflow, /^\s+name: migration validation$/mu);
  assert.match(workflow, /Migration validation not applicable/u);
  assert.match(workflow, /if: always\(\)/u);
});

test("full migration failures remain authoritative", () => {
  assert.match(workflow, /VALIDATION_RESULT: \$\{\{ needs\.validate-migrations\.result \}\}/u);
  assert.match(workflow, /\[\[ "\$VALIDATION_RESULT" != 'success' \]\]/u);
  assert.match(workflow, /exit 1/u);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/u);
});
