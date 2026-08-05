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
  assert.equal(isMigrationValidationPath("prisma.config.ts"), true);
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

test("the applicability decision does not execute pull-request classifier code", () => {
  assert.doesNotMatch(
    workflow,
    /run:\s*node scripts\/classify-migration-validation-paths\.mjs/u,
  );
  assert.match(workflow, /policy is deliberately inline/u);
  assert.match(workflow, /prisma\.config\.ts/u);
  assert.match(workflow, /scripts\/classify-migration-validation-paths\.mjs/u);
  assert.match(workflow, /scripts\/migration-validation-workflow\.test\.mjs/u);
});

test("change detection is binary-safe and deleted or renamed migration paths fail closed", () => {
  assert.match(workflow, /git diff --name-only --no-renames -z/u);
  assert.match(workflow, /read -r -d '' changed_file/u);
  assert.match(workflow, /migration-validation\.yml' > "\$changed_files"/u);
});

test("package, lockfile, workflow, and validation-script changes run full validation", () => {
  for (const relevantPath of [
    "package.json",
    "package-lock.json",
    ".github/workflows/migration-validation.yml",
    "scripts/check-prisma-migration-timestamps.mjs",
    "scripts/deploy-render-migrations.mjs",
    "scripts/run-render-migrations.mjs",
    "scripts/verify-production-schema.mjs",
  ]) {
    assert.equal(isMigrationValidationPath(relevantPath), true, relevantPath);
  }
});

test("full migration failures remain authoritative", () => {
  assert.match(workflow, /VALIDATION_RESULT: \$\{\{ needs\.validate-migrations\.result \}\}/u);
  assert.match(workflow, /\[\[ "\$VALIDATION_RESULT" != 'success' \]\]/u);
  assert.match(workflow, /exit 1/u);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/u);
});
