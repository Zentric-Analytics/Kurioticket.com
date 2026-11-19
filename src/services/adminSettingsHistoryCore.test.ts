import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSettingsHistoryReader } from "./adminSettingsHistoryCore";

const now = new Date("2026-11-18T12:00:00.000Z");
const feature = {
  id: "audit-feature-001", action: "FEATURE_CONTROL_UPDATED", targetType: "FeatureFlag",
  targetId: "flag-1", targetEmail: null, adminEmail: "admin@example.invalid",
  createdAt: new Date("2026-11-18T11:00:00.000Z"),
  metadata: { featureKey: "CAR_SEARCH_ENABLED", category: "Travel Search", environment: "STAGING", previousEnabled: false, nextEnabled: true, reason: "Reviewed" },
};
const member = {
  id: "audit-member-002", action: "TEAM_ACCESS_UPDATE", targetType: "PreviewTester",
  targetId: "member-1", targetEmail: "member@example.invalid", adminEmail: "admin@example.invalid",
  createdAt: new Date("2026-11-18T10:00:00.000Z"),
  metadata: { previousStatus: "ACTIVE", nextStatus: "ACTIVE", previousRoles: ["TESTER"], nextRoles: ["TESTER", "DEVELOPER"], accessToken: "must-not-show" },
};
const legacy = {
  id: "audit-legacy-003", action: "ADMIN_NOTIFICATION_PREFERENCE_UPDATED", targetType: "AdminNotificationPreference",
  targetId: "preference-1", targetEmail: null, adminEmail: "admin@example.invalid",
  createdAt: new Date("2026-11-06T09:00:00.000Z"),
  metadata: { key: "showAcknowledgedWarnings", previous: false, next: true },
};

function fixture() {
  const queries: Array<Record<string, unknown>> = [];
  const database = {
    adminAuditLog: {
      findMany: async (args: Record<string, unknown>) => {
        queries.push(args);
        return [feature, member, legacy].slice(0, Number(args.take));
      },
    },
  };
  return {
    queries,
    reader: createAdminSettingsHistoryReader({
      authorize: async () => true,
      database: () => database as never,
      now: () => now,
    }),
  };
}

test("settings history remains denied and does not read records without authorization", async () => {
  let reads = 0;
  const reader = createAdminSettingsHistoryReader({
    authorize: async () => false,
    database: () => { reads++; return null; },
    now: () => now,
  });
  assert.deepEqual(await reader.list({ range: "7d", category: "all" }), { status: "forbidden" });
  assert.equal(reads, 0);
});

test("settings history queries only approved action types and orders newest first", async () => {
  const { reader, queries } = fixture();
  const result = await reader.list({ range: "90d", category: "all", limit: 6 });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.items[0].section, "Product availability");
  assert.equal(result.items[1].section, "Team Access");
  assert.equal(result.items[2].section, "Notification preferences (retired)");
  assert.deepEqual(result.items[0].details.filter(detail => /state/.test(detail.label)),
    [{ label: "Previous state", value: "Disabled" }, { label: "New state", value: "Enabled" }]);
  assert.ok(result.items[1].details.some(detail => detail.label === "New roles" && detail.value === "Tester, Developer"));
  assert.ok(!JSON.stringify(result.items).includes("must-not-show"));
  const q = queries[0];
  assert.deepEqual(q.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(q.take, 7);
  const serialized = JSON.stringify(q.where);
  assert.match(serialized, /FEATURE_CONTROL_UPDATED/);
  assert.match(serialized, /TEAM_ACCESS_UPDATE/);
  assert.match(serialized, /ADMIN_NOTIFICATION_PREFERENCE_UPDATED/);
  assert.doesNotMatch(serialized, /CMS_CONTENT_PUBLISHED|USER_SOFT_DELETED/);
});

test("settings history rejects unsupported filters and malicious cursors without reading data", async () => {
  const { reader, queries } = fixture();
  for (const query of [
    { range: "custom", category: "all" },
    { range: "7d", category: "invalid" },
    { range: "7d", category: "all", cursor: "not-a-valid-cursor" },
    { range: "7d", category: "all", limit: 100 },
  ] as never[]) assert.deepEqual(await reader.list(query), { status: "invalid" });
  assert.equal(queries.length, 0);
});

test("Settings History allows paginated All time while validating bounded custom UTC dates", async () => {
  const { reader, queries } = fixture();
  const all = await reader.list({ range: "all", category: "all" });
  assert.equal(all.status, "ok");
  assert.match(JSON.stringify(queries[0].where), /1970-01-01T00:00:00.000Z/);
  const custom = await reader.list({
    range: "custom", category: "all", fromDate: "2026-11-01", toDate: "2026-11-18",
  });
  assert.equal(custom.status, "ok");
  assert.match(JSON.stringify(queries[1].where), /2026-11-01T00:00:00.000Z/);
  assert.deepEqual(await reader.list({ range: "custom", category: "all", fromDate: "2026-02-30", toDate: "2026-11-18" }), { status: "invalid" });
  assert.deepEqual(await reader.list({ range: "custom", category: "all", fromDate: "2026-01-01", toDate: "2026-11-18" }), { status: "invalid" });
});

test("settings history category stays scoped to approved features and team actions", async () => {
  const { reader, queries } = fixture();
  await reader.list({ range: "7d", category: "team" });
  await reader.list({ range: "7d", category: "automation" });
  assert.match(JSON.stringify(queries[0].where), /TEAM_ACCESS_MEMBER_APPROVED/);
  assert.doesNotMatch(JSON.stringify(queries[0].where), /FEATURE_CONTROL_UPDATED/);
  assert.match(JSON.stringify(queries[1].where), /Travel Automation/);
});

test("settings history reports unavailable database without invented entries", async () => {
  const reader = createAdminSettingsHistoryReader({
    authorize: async () => true,
    database: () => null,
    now: () => now,
  });
  assert.deepEqual(await reader.list({ range: "7d", category: "all" }), { status: "unavailable" });
});
