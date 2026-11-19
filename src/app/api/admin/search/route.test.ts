import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { normalizeAdminSearch } from "../../../../lib/adminSearch";

function routeFixture(auth: () => Promise<object>, search: (query: string) => Promise<object>) {
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  const compiled = ts.transpileModule(readFileSync("src/app/api/admin/search/route.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { exports, URL, Response, require: (name: string) => {
    if (name === "@/lib/admin") return { requireAdminApiSession: auth };
    if (name === "@/lib/adminSearch") return { normalizeAdminSearch };
    if (name === "@/lib/adminSearchResults") return { getAdminSearchResults: search };
    throw new Error(`Unexpected admin search dependency ${name}`);
  } });
  assert.ok(exports.GET);
  return exports.GET;
}

test("admin search denies unauthenticated and unauthorized requests before touching search data", async () => {
  for (const status of [401, 403]) {
    let called = false;
    const GET = routeFixture(async () => ({ response: Response.json({ error: "denied" }, { status }) }), async () => { called = true; return {}; });
    const response = await GET(new Request("https://fixture.local/api/admin/search?q=private"));
    assert.equal(response.status, status); assert.equal(called, false);
  }
});

test("admin search normalizes the authorized query and keeps responses private and uncached", async () => {
  let observed = "";
  const data = { users: [], searches: [], providers: [] };
  const GET = routeFixture(async () => ({ session: { user: { role: "ADMIN" } } }), async (query) => { observed = query; return data; });
  const response = await GET(new Request("https://fixture.local/api/admin/search?q=%20A%20%26%20B%20"));
  assert.equal(observed, normalizeAdminSearch(" A & B "));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), data);
});

test("admin search data failure returns a truthful private 503 without leaking details", async () => {
  const GET = routeFixture(async () => ({ session: { user: { role: "ADMIN" } } }), async () => { throw Error("fixture private internal error"); });
  const response = await GET(new Request("https://fixture.local/api/admin/search?q=fixture"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.doesNotMatch(await response.text(), /private internal error/);
});
