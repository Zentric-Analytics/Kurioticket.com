import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("source contracts use LF checkouts even with Windows autocrlf enabled", () => {
  const paths = ["src/app/admin/page.tsx", "src/lib/sourceLineEndings.test.ts", "render.yaml", "scripts/check-conflicts.mjs", "docs/kayak-sandbox-integration.md"];
  const result = execFileSync("git", ["-c", "core.autocrlf=true", "check-attr", "eol", "--", ...paths], { encoding: "utf8" });
  assert.deepEqual(result.trim().split(/\r?\n/), paths.map((path) => `${path}: eol: lf`));
});

test("Windows command scripts retain CRLF checkout rules", () => {
  const result = execFileSync("git", ["check-attr", "eol", "--", "example.bat", "example.cmd"], { encoding: "utf8" });
  assert.deepEqual(result.trim().split(/\r?\n/), ["example.bat: eol: crlf", "example.cmd: eol: crlf"]);
});
