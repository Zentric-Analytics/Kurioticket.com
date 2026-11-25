import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { validViewerTimeZone } from "../../lib/adminLocalTime";
import { parseAdminReportingTimeZonePreference } from "../../lib/adminReportingTimeZonePreference";

function load<T>(file: string, imports: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, process, require: (id: string) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected dependency ${id}`);
    return imports[id];
  } });
  return exports as T;
}

function reportingTimeZoneFixture() {
  const stored = new Map<string, string>();
  const jar = {
    get: (name: string) => ({ value: stored.get(name) }),
    set: (name: string, value: string, options: { httpOnly: boolean; maxAge: number }) => {
      assert.equal(options.httpOnly, true);
      if (options.maxAge === 0) stored.delete(name);
      else stored.set(name, value);
    },
  };
  let adminId: string | null = "admin-one";
  const cookieModule = load<typeof import("../../lib/adminViewerTimeZone.server")>("src/lib/adminViewerTimeZone.server.ts", {
    "node:crypto": { createHash },
    "next/headers": { cookies: async () => jar },
    "next-auth": { getServerSession: async () => adminId ? { user: { id: adminId } } : null },
    "server-only": {},
    "@/lib/adminLocalTime": { validViewerTimeZone },
    "@/lib/auth": { authOptions: {} },
  });
  const { setAdminReportingTimeZone } = load<typeof import("./reportingTimeZoneActions")>("src/app/admin/reportingTimeZoneActions.ts", {
    "@/lib/adminViewerTimeZone.server": cookieModule,
    "@/lib/adminReportingTimeZonePreference": { parseAdminReportingTimeZonePreference },
    "@/lib/auth-guards": { requireAdminSession: async () => {
      if (!adminId) throw new Error("Admin access required");
      return { user: { id: adminId } };
    } },
  });
  return {
    stored,
    ...cookieModule,
    setAdminReportingTimeZone,
    switchAdmin: (id: string | null) => { adminId = id; },
  };
}

test("Admin reporting cookie follows the current account and manual mode wins device updates", async () => {
  const fixture = reportingTimeZoneFixture();
  assert.equal(await fixture.getAdminViewerTimeZone(), "UTC");
  await fixture.setAdminReportingTimeZone({ mode: "automatic", timeZone: "Africa/Lagos" }, "synchronize");
  assert.equal(await fixture.getAdminViewerTimeZone(), "Africa/Lagos");
  await fixture.setAdminReportingTimeZone({ mode: "manual", timeZone: "Asia/Dubai" }, "select");
  const staleDevice = await fixture.setAdminReportingTimeZone({ mode: "automatic", timeZone: "Europe/London" }, "synchronize");
  assert.equal(staleDevice.ok && staleDevice.changed, false);
  assert.equal(await fixture.getAdminViewerTimeZone(), "Asia/Dubai");
  // A separate cookie keeps manual mode authoritative even if two requests race.
  await fixture.setAdminReportingTimeZoneCookie("admin-one", { mode: "automatic", timeZone: "Europe/London" }, { synchronize: true });
  assert.equal(await fixture.getAdminViewerTimeZone(), "Asia/Dubai");

  fixture.switchAdmin("admin-two");
  assert.equal(await fixture.getAdminViewerTimeZone(), "UTC");
  await fixture.setAdminReportingTimeZone({ mode: "manual", timeZone: "America/New_York" }, "select");
  assert.equal(await fixture.getAdminViewerTimeZone(), "America/New_York");
  fixture.switchAdmin("admin-one");
  assert.equal(await fixture.getAdminViewerTimeZone(), "Asia/Dubai");
  await fixture.setAdminReportingTimeZone({ mode: "automatic", timeZone: "Europe/London" }, "select");
  assert.equal((await fixture.getAdminReportingTimeZonePreference()).mode, "automatic");
  assert.equal(await fixture.getAdminViewerTimeZone(), "Europe/London");
});

test("Admin reporting action rejects invalid or unauthorized settings without changing cookies", async () => {
  const fixture = reportingTimeZoneFixture();
  assert.equal((await fixture.setAdminReportingTimeZone({ mode: "manual", timeZone: "+01:00" }, "select")).ok, false);
  assert.equal((await fixture.setAdminReportingTimeZone({ mode: "manual", timeZone: "Asia/Dubai" }, "synchronize")).ok, false);
  fixture.switchAdmin(null);
  await assert.rejects(fixture.setAdminReportingTimeZone({ mode: "manual", timeZone: "Asia/Dubai" }, "select"), /Admin access required/);
  assert.equal(fixture.stored.size, 0);
});
