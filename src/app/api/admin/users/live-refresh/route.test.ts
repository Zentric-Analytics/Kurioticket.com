import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(auth: () => Promise<unknown>) {
  const file = "src/app/api/admin/users/live-refresh/route.ts";
  const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { GET: () => Promise<Response> } };
  new Function("require", "module", "exports", output)((name: string) => {
    assert.equal(name, "@/lib/admin");
    return { requireAdminApiSession: auth };
  }, loaded, loaded.exports);
  return loaded.exports.GET;
}

test("the refresh probe validates canonical admin access without loading user records", async () => {
  let checked = 0;
  const response = await load(async () => { checked += 1; return { session: { user: { id: "fixture-admin" } } }; })();
  assert.equal(checked, 1);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Cookie, Authorization");
});

test("the refresh probe preserves denied access and marks denial as private and uncached", async () => {
  const response = await load(async () => ({ response: Response.json({ error: "Admin access required." }, { status: 403 }) }))();
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Cookie, Authorization");
  assert.deepEqual(await response.json(), { error: "Admin access required." });
});

test("database/auth service failure is retryable unavailability, never a false successful refresh", async () => {
  const response = await load(async () => { throw new Error("Unavailable"); })();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { ok: false });
});
