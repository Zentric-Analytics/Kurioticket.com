import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import test from "node:test";

const scanner = ["scripts/verify-no-secrets.mjs"];
const probePath = ".secret-scan-probe.txt";

function runScanner() {
  return spawnSync(process.execPath, scanner, { encoding: "utf8" });
}

test("git excludes nested node_modules from secret scanner file enumeration", () => {
  const ignored = spawnSync("git", ["check-ignore", "-v", "apps/mobile/node_modules/package.json"], { encoding: "utf8" });
  assert.equal(ignored.status, 0, ignored.stderr || ignored.stdout);
  assert.match(ignored.stdout, /node_modules\//);

  const nestedFiles = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter((file) => file.startsWith("apps/mobile/node_modules/"));
  assert.deepEqual(nestedFiles, []);
});

test("secret scanner succeeds for the repository and fails for a generated fake secret", () => {
  rmSync(probePath, { force: true });
  try {
    const clean = runScanner();
    assert.equal(clean.status, 0, clean.stderr || clean.stdout);
    assert.match(clean.stdout, /Secret verification passed: scanned \d+ tracked and non-ignored untracked files/);

    const fakeToken = "sk_test_" + "A".repeat(24);
    writeFileSync(probePath, `temporary scanner probe ${fakeToken}\n`, "utf8");

    const dirty = runScanner();
    assert.notEqual(dirty.status, 0, dirty.stdout);
    assert.match(dirty.stderr, new RegExp(probePath));
    assert.match(dirty.stderr, /Secret verification failed:/);
  } finally {
    rmSync(probePath, { force: true });
  }

  const cleanAfterProbe = runScanner();
  assert.equal(cleanAfterProbe.status, 0, cleanAfterProbe.stderr || cleanAfterProbe.stdout);
});
