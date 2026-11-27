import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { guestAccessHistorySql } from "@/lib/adminGuestAccessSql";
import { recordedDevicePlatformLabels } from "@/lib/adminDevicePlatform";
import { recordedGuestAccessLocation, safeGuestDeviceDescription } from "@/lib/guestAccessObservation";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import type { loadAdminGuestAccessHistory } from "./adminGuestAccessService";

const owner = "12345678-1234-4123-8123-123456789abc";
const at = new Date("2026-11-26T12:00:00Z");
function reader(observations: Array<Record<string, unknown>>) {
  const source = readFileSync("src/services/adminGuestAccessService.ts", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const rows = observations.map((row, index) => ({ guestId: owner, guestSource: "operational", recordId: "search:" + index,
    evidence: "search", platform: "web", deviceLabel: null, browser: null, os: null, locationLabel: null,
    recordedCountryCode: "NG", at, total: BigInt(observations.length), firstSeenAt: at, lastSeenAt: at, ...row }));
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "@/lib/prisma": { getOptionalPrisma: () => ({ $queryRaw: async () => rows }) },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
    "@/lib/adminGuestAccessSql": { guestAccessHistorySql },
    "@/lib/adminDeviceHistory": { DEVICE_HISTORY_PAGE_SIZE: 20 },
    "@/lib/adminDevicePlatform": { recordedDevicePlatformLabels },
    "@/lib/guestAccessObservation": { recordedGuestAccessLocation, safeGuestDeviceDescription },
    "@/lib/adminIdentityActivity": { validActivityIdentity },
  };
  const exported: { loadAdminGuestAccessHistory?: typeof loadAdminGuestAccessHistory } = {};
  runInNewContext(compiled, { exports: exported, Date, require: (name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name];
  } });
  return () => exported.loadAdminGuestAccessHistory!(owner, { range: "all", page: 1 }, "UTC", new Date(+at + 1000));
}

test("history exposes observed operational devices and sanitizes every field before display", async () => {
  const result = await reader([
    { platform: "desktop", deviceLabel: "Windows computer", browser: "Chrome 140", os: "Windows" },
    { platform: "mobile", deviceLabel: "Android phone", browser: "Samsung Internet 29", os: "Android" },
    { platform: "ios", deviceLabel: "iOS device", os: "iOS" },
    { platform: "android", deviceLabel: "Android device", os: "Android" },
    { deviceLabel: "Customer's unique device", browser: "Mozilla/private", os: "private-account-123" },
    {},
  ])();
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.total, 6);
  assert.deepEqual(Array.from(result.records, row => [row.platform, row.deviceLabel, row.browser, row.os]), [
    ["Desktop web", "Windows computer", "Chrome 140", "Windows"],
    ["Mobile web", "Android phone", "Samsung Internet 29", "Android"],
    ["iOS app", "iOS device", null, "iOS"],
    ["Android app", "Android device", null, "Android"],
    ["Website", null, null, null], ["Website", null, null, null],
  ]);
  assert.ok(result.records.every(row => row.locationLabel === "Nigeria"));
  assert.doesNotMatch(JSON.stringify(result), /Customer|Mozilla|private/);
});

test("device enrichment cannot expose another identity's observation", async () => {
  const result = await reader([{ guestId: "87654321-4321-4321-8321-cba987654321", deviceLabel: "Windows computer" }])();
  assert.equal(result.status, "unavailable");
});
