import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveAuthSecret } from "./authSecret";

// Execute the actual boundaries with an explicit, closed dependency map. No
// process-wide environment mutation, real account lookup, or signed session.
function load(file: string, dependencies: Record<string, unknown>, environment = {}) {
  const source = readFileSync(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, (...args: unknown[]) => unknown> = {};
  const execute = runInThisContext(`(function(exports, require, process) {${code}\n})`, { filename: file });
  execute(exports, (name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, { env: environment });
  return exports;
}

for (const [name, environment, expected] of [
  ["different aliases", { AUTH_SECRET: "fixture-canonical", NEXTAUTH_SECRET: "fixture-legacy" }, "fixture-canonical"],
  ["canonical only", { AUTH_SECRET: "fixture-canonical" }, "fixture-canonical"],
  ["legacy only", { NEXTAUTH_SECRET: "fixture-legacy" }, "fixture-legacy"],
  ["neither", {}, ""],
  ["empty canonical fallback", { AUTH_SECRET: "", NEXTAUTH_SECRET: "fixture-legacy" }, "fixture-legacy"],
  ["unchanged whitespace semantics", { AUTH_SECRET: " " }, " "],
] as const) {
  test(`server and middleware share canonical secret: ${name}`, async () => {
    const server = load("src/lib/env.ts", { "./authSecret": { resolveAuthSecret }, "./stagingSafety": {} }, environment);
    const calls: unknown[] = [];
    const middleware = load("middleware.ts", {
      "next/server": { NextResponse },
      "next-auth/jwt": { getToken: async (input: { secret: string }) => { calls.push(input.secret); return null; } },
      "@/config/regionConfig": { REGION_COOKIE_KEY: "region", REGION_OVERRIDE_COOKIE_KEY: "override" },
      "@/lib/region/detectRegion": { normalizeRegion: () => null, countryToRegion: () => null },
      "@/lib/authSecret": { resolveAuthSecret },
    }, environment);
    assert.equal(resolveAuthSecret(environment), expected);
    assert.equal(server.getAuthSecret(), expected);
    const response = await middleware.middleware(new NextRequest("https://fixture.invalid/dashboard")) as Response;
    assert.equal(response.status, 200); // middleware is an early UX aid, not the canonical guard
    assert.deepEqual(calls, expected ? [expected] : []);
  });
}

test("canonical auth signing uses the server resolver; shared module has no runtime imports", () => {
  assert.match(readFileSync("src/lib/auth.ts", "utf8"), /secret:\s*getAuthSecret\(\)\s*\|\|\s*undefined/);
  const source = ts.createSourceFile("authSecret.ts", readFileSync("src/lib/authSecret.ts", "utf8"), ts.ScriptTarget.Latest, true);
  assert.equal(source.statements.some(ts.isImportDeclaration), false);
});

test("installed token verifier rejects absent and malformed tokens", async () => {
  for (const cookie of ["", "next-auth.session-token=invalid.fixture.token"]) {
    const token = await getToken({ req: new NextRequest("https://fixture.invalid", { headers: { cookie } }), secret: "fixture-only-not-live", secureCookie: false });
    assert.equal(token, null);
  }
});

test("middleware preserves MFA redirects, API denial, exemptions, and verified access", async () => {
  let verified = false;
  const boundary = load("middleware.ts", {
    "next/server": { NextResponse },
    "next-auth/jwt": { getToken: async () => ({ twoFactorEnabled: true, twoFactorVerified: verified }) },
    "@/config/regionConfig": { REGION_COOKIE_KEY: "region", REGION_OVERRIDE_COOKIE_KEY: "override" },
    "@/lib/region/detectRegion": { normalizeRegion: () => null, countryToRegion: () => null },
    "@/lib/authSecret": { resolveAuthSecret },
  }, { AUTH_SECRET: "fixture-only" });
  for (const path of ["/dashboard?tab=trips", "/account/security"]) {
    const response = await boundary.middleware(new NextRequest(`https://fixture.invalid${path}`)) as Response;
    assert.equal(response.status, 307);
    const target = new URL(response.headers.get("location")!);
    assert.equal(target.pathname, "/auth/two-factor");
    assert.equal(target.searchParams.get("callbackUrl"), path);
  }
  const denied = await boundary.middleware(new NextRequest("https://fixture.invalid/api/account/profile")) as Response;
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "Two-factor verification required." });
  for (const path of ["/auth/two-factor", "/api/auth/two-factor", "/api/auth/signout"]) {
    assert.equal((await boundary.middleware(new NextRequest(`https://fixture.invalid${path}`)) as Response).status, 200);
  }
  verified = true;
  assert.equal((await boundary.middleware(new NextRequest("https://fixture.invalid/account")) as Response).status, 200);
});

test("actual database-backed session and admin boundaries reject stale, invalid, non-admin and incomplete-MFA claims", async () => {
  const nativeRequire = createRequire(`${process.cwd()}/package.json`);
  const user = { id: "fixture-user", email: "qa-admin@zentricanalytics.com", emailVerified: new Date(), status: "ACTIVE", sessionVersion: 3, securitySettings: { twoFactorEnabled: true } };
  const validRecord = { id: "fixture-session", userId: user.id, user, sessionVersion: 3, revokedAt: null as Date | null, expiresAt: new Date(Date.now() + 60_000), authMethod: "PASSWORD", assuranceLevel: "MFA" };
  let record: typeof validRecord | null = validRecord;
  const policy = load("src/lib/account-security-policy.ts", { "@/lib/previewTesterAccess": { canRetainStagingSession: async (email: string) => email.endsWith("@zentricanalytics.com") } });
  const account = load("src/lib/account-session.ts", {
    "node:crypto": nativeRequire("node:crypto"),
    "@/lib/prisma": { getPrisma: () => ({ accountSession: { findFirst: async (query: { where: { id: string; userId: string } }) => {
      assert.deepEqual(query.where, { id: validRecord.id, userId: user.id }); return record;
    } } }) },
    "@/lib/account-security-policy": policy,
  });
  const validSession = { user: { ...user, role: "ADMIN", accountSessionId: validRecord.id, twoFactorEnabled: true, twoFactorVerified: true } };
  let session: typeof validSession | null = validSession;
  const web = load("src/lib/web-api-auth.ts", {
    "next-auth": { getServerSession: async () => session }, "@/lib/auth": { authOptions: {} }, "@/lib/account-session": account,
  });
  const admin = load("src/lib/admin.ts", {
    "next/server": { NextResponse }, "@/lib/web-api-auth": web,
    "@/lib/auth-diagnostics": { logSafeAuthDiagnostics: () => {} },
    "@/lib/env": { getAdminEmails: () => [user.email] }, "@/lib/prisma": {},
    "@/lib/previewTesterAccess": { isTrustedPreviewCompanyEmail: (email: string) => email.endsWith("@zentricanalytics.com") },
    "@/lib/stagingSafety": { isStagingEnvironment: () => true },
  });
  assert.ok(await web.requireWebApiSession());
  assert.ok((await admin.requireAdminApiSession() as { session?: unknown }).session);
  for (const invalid of [null, { ...validRecord, revokedAt: new Date() }, { ...validRecord, expiresAt: new Date(0) }, { ...validRecord, sessionVersion: 2 }, { ...validRecord, assuranceLevel: "PRIMARY" }, { ...validRecord, user: { ...user, status: "PENDING_DELETION" } }, { ...validRecord, user: { ...user, status: "SUSPENDED" } }, { ...validRecord, user: { ...user, emailVerified: null } }]) {
    record = invalid as typeof record;
    assert.equal(await web.requireWebApiSession(), null);
    assert.equal((await admin.requireAdminApiSession() as { response: Response }).response.status, 403);
  }
  record = validRecord;
  for (const invalid of [null, { user: { ...validSession.user, accountSessionId: "" } }, { user: { ...validSession.user, status: "PENDING_DELETION" } }, { user: { ...validSession.user, twoFactorVerified: false } }]) {
    session = invalid;
    assert.equal(await web.requireWebApiSession(), null);
  }
  session = { user: { ...validSession.user, role: "USER" } };
  assert.ok(await web.requireWebApiSession());
  assert.equal((await admin.requireAdminApiSession() as { response: Response }).response.status, 403);
  session = { user: { ...validSession.user, email: "unlisted@zentricanalytics.com" } };
  assert.equal((await admin.requireAdminApiSession() as { response: Response }).response.status, 403);

  const pages = load("src/lib/auth-guards.ts", {
    "next-auth": { getServerSession: async () => session }, "@/lib/auth": { authOptions: {} },
    "next/navigation": { redirect: (url: string) => { throw new Error(`Redirect:${url}`); } },
    "@/lib/env": { getAdminEmails: () => [user.email] },
    "@/lib/prisma": { isDatabaseConfigured: () => false },
    "@/services/emailVerificationService": { getEmailVerificationRedirect: () => "/auth/verify-email" },
    "@/lib/account-session": account,
  });
  session = validSession;
  assert.equal(await pages.requireAdminSession("/admin"), validSession);
  session = { user: { ...validSession.user, role: "USER" } };
  await assert.rejects(async () => pages.requireAdminSession("/admin"), /Redirect:\/dashboard$/);
  session = { user: { ...validSession.user, twoFactorVerified: false } };
  await assert.rejects(async () => pages.requireAdminSession("/admin"), /Redirect:\/auth\/two-factor\?callbackUrl=%2Fadmin$/);
  session = validSession;
  record = { ...validRecord, revokedAt: new Date() };
  await assert.rejects(async () => pages.requireAdminSession("/admin"), /error=SessionExpired$/);
  record = validRecord;
  session = null;
  await assert.rejects(async () => pages.requireAdminSession("/admin"), /Redirect:\/auth\/signin\?callbackUrl=%2Fadmin$/);
});
