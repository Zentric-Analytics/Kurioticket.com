import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
const require = createRequire(import.meta.url);

test("patched archive and cleanup globs preserve inclusion, exclusion and owned temporary paths", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "kt-toolchain-"));
  const child = path.join(directory, "nested");
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep));
  try {
    mkdirSync(child); writeFileSync(path.join(child, "keep.fixture"), "fixture"); writeFileSync(path.join(child, "private.secret"), "synthetic");
    const archive = require("archiver-utils") as { file: { expand(options: { cwd: string; nodir: boolean }, patterns: string[]): string[] } };
    assert.deepEqual(archive.file.expand({ cwd: directory, nodir: true }, ["**/*", "!**/*.secret"]).map(p => p.split(path.sep).join("/")), ["nested/keep.fixture"]);
    const { rimraf } = require("rimraf") as { rimraf(pattern: string, options: { glob: { cwd: string; absolute: boolean } }): Promise<boolean> };
    await rimraf("**/*.fixture", { glob: { cwd: directory, absolute: true } });
    assert.equal(existsSync(path.join(child, "keep.fixture")), false);
    assert.equal(existsSync(path.join(child, "private.secret")), true, "cleanup must not broaden the requested pattern");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
