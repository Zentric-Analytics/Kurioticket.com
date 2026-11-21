import assert from "node:assert/strict";
import test from "node:test";
import {
  adminIdentityPageSql, adminRegisteredActivityDateWhere, escapePrismaContainsQuery, parseAdminIdentitySort,
  type AdminIdentityPageRequest,
} from "./adminIdentityDirectory";

const base: AdminIdentityPageRequest = {
  query: "", role: "ALL", status: "ALL",
  showUsers: true, showGuests: true, limit: 100, offset: 0, sort: "newest",
};

function sql(input: AdminIdentityPageRequest) {
  const result = adminIdentityPageSql(input);
  assert.ok(result);
  return { text: result.strings.join("?"), values: result.values };
}

test("both identity tables are combined before one chronological sort and 100-row pagination", () => {
  const result = sql(base);
  assert.match(result.text, /FROM "User"/);
  assert.match(result.text, /UNION ALL/);
  assert.match(result.text, /FROM "Visitor"/);
  assert.match(result.text, /ORDER BY "lastSeenAt" DESC NULLS LAST, "joinedAt" DESC, "kind" ASC, "id" DESC/);
  assert.match(result.text, /LIMIT .* OFFSET/);
  assert.deepEqual(result.values.slice(-2), [100, 0]);
});

test("all sort modes order the entire result set before slicing a page", () => {
  const expected: Array<[NonNullable<AdminIdentityPageRequest["sort"]>, RegExp]> = [
    ["newest", /ORDER BY "lastSeenAt" DESC NULLS LAST, "joinedAt" DESC, "kind" ASC, "id" DESC/],
    ["oldest", /ORDER BY "joinedAt" ASC, "kind" ASC, "id" ASC/],
    ["name_asc", /ORDER BY lower\("displayName"\) ASC, "joinedAt" DESC, "kind" ASC, "id" DESC/],
    ["name_desc", /ORDER BY lower\("displayName"\) DESC, "joinedAt" DESC, "kind" ASC, "id" DESC/],
  ];
  for (const [sort, order] of expected) {
    const result = sql({ ...base, sort, offset: 100 });
    assert.match(result.text, order);
    assert.ok(result.text.indexOf("ORDER BY") < result.text.indexOf("LIMIT"));
    assert.deepEqual(result.values.slice(-2), [100, 100]);
  }
  const alphabetical = sql({ ...base, sort: "name_asc" });
  assert.match(alphabetical.text, /COALESCE\(NULLIF\(BTRIM\(u\."name"\), ''\), 'Unnamed user'\)/);
  assert.match(alphabetical.text, /'Guest visitor'::text AS "displayName"/);
});

test("unknown sort options safely fall back to newest rather than interpolating SQL", () => {
  for (const bad of [undefined, "", "random()", "name; DROP TABLE User", "DESC"]) {
    assert.equal(parseAdminIdentitySort(bad), "newest");
  }
  assert.equal(parseAdminIdentitySort("oldest"), "oldest");
  assert.equal(parseAdminIdentitySort("name_asc"), "name_asc");
  assert.equal(parseAdminIdentitySort("name_desc"), "name_desc");
});

test("consent and unlink restrictions apply to mixed and guest-only queries", () => {
  for (const input of [base, { ...base, showUsers: false }]) {
    const result = sql(input);
    assert.match(result.text, /"consentStatus" = 'GRANTED'/);
    assert.match(result.text, /"trackingDisabledAt" IS NULL/);
    assert.match(result.text, /"currentUserId" IS NULL/);
    assert.match(result.text, /NOT EXISTS/);
  }
});

test("filters and page bounds remain parameterized even when sorting by name", () => {
  const malicious = "x' OR 1=1--";
  const result = sql({ ...base, query: malicious, role: "ADMIN", status: "ACTIVE", sort: "name_desc", limit: 100, offset: 100 });
  assert.ok(result.values.includes(malicious));
  assert.ok(result.values.includes("ADMIN"));
  assert.ok(result.values.includes("ACTIVE"));
  assert.equal(result.text.includes(malicious), false);
  assert.deepEqual(result.values.slice(-2), [100, 100]);
});

test("registered-only list never joins guests and empty selection is empty", () => {
  assert.doesNotMatch(sql({ ...base, showGuests: false }).text, /"Visitor"/);
  assert.equal(adminIdentityPageSql({ ...base, showUsers: false, showGuests: false }), null);
});

test("invalid offsets and limits cannot run", () => {
  for (const offset of [-1, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => adminIdentityPageSql({ ...base, offset }));
  }
  for (const limit of [0, 101, 10000]) {
    assert.throws(() => adminIdentityPageSql({ ...base, limit }));
  }
});

test("count predicates escape wildcard and backslash characters to match literal SQL substring search", () => {
  assert.equal(escapePrismaContainsQuery("%"), "\\%");
  assert.equal(escapePrismaContainsQuery("_"), "\\_");
  assert.equal(escapePrismaContainsQuery("\\"), "\\\\");
  assert.equal(escapePrismaContainsQuery("a%_\\b"), "a\\%\\_\\\\b");
  assert.equal(escapePrismaContainsQuery("LOS"), "LOS");

  const raw = sql({ ...base, query: "a%_\\b" });
  assert.ok(raw.values.includes("a%_\\b"));
  assert.equal(raw.values.includes("a\\%\\_\\\\b"), false);
});


test("non-consented guest sessions join the Users directory without depending on analytics consent", () => {
  const result = sql({ ...base, showUsers: false, showGuests: false, showOperationalGuests: true, environment: "staging" });
  assert.match(result.text, /FROM "SearchHistory"/);
  assert.match(result.text, /FROM "RedirectLog"/);
  assert.match(result.text, /"visitorId" IS NULL/);
  assert.match(result.text, /"userId" IS NULL/);
  assert.match(result.text, /GROUP BY a\."sessionId"/);
  assert.equal(result.values.includes("staging"), true);
  assert.doesNotMatch(result.text, /"consentStatus" = 'GRANTED'/);
});

test("operational session lookup and date limits remain parameterized", () => {
  const result = sql({ ...base, query: "session-id", showUsers: false, showGuests: false,
    showOperationalGuests: true, environment: "production", date: "last7" });
  assert.ok(result.values.includes("session-id"));
  assert.ok(result.values.includes("production"));
  assert.equal(result.text.includes("session-id"), false);
  assert.match(result.text, /o\."lastSeenAt" >=/);
  assert.match(result.text, /"firstSeenAt" >=/);
  assert.doesNotMatch(result.text, /HAVING MAX\(a\."createdAt"\)/);
});


test("all-time and new operational metrics share one unfiltered first-seen cohort", () => {
  const now = new Date("2026-11-21T15:00:00.000Z");
  const from = new Date("2026-11-21T00:00:00.000Z");
  const result = sql({
    ...base, query: "example", role: "ADMIN", status: "ACTIVE",
    showUsers: true, showGuests: false, showOperationalGuests: false,
    withOperationalSummary: true, environment: "staging", date: "today", now,
  });
  const sourceCte = result.text.split("), operational_sessions AS (")[0];
  assert.equal((sourceCte.match(/FROM "SearchHistory" s/g) ?? []).length, 1,
    "One operational session cohort reads SearchHistory once");
  assert.equal((sourceCte.match(/FROM "RedirectLog" r/g) ?? []).length, 1,
    "One operational session cohort reads RedirectLog once");
  assert.match(result.text, /all_operational_sessions AS MATERIALIZED/);
  assert.match(result.text, /MIN\(a\."createdAt"\) AS "firstSeenAt"/);
  assert.match(result.text, /MAX\(a\."createdAt"\) AS "lastSeenAt"/);
  assert.match(result.text, /COUNT\(\*\)::bigint AS "operationalAllTimeCount"/);
  assert.match(result.text, /COUNT\(\*\) FILTER \(WHERE "firstSeenAt" >=/);
  assert.match(result.text, /summary\."operationalNewCount"/);
  assert.match(result.text, /FROM all_operational_sessions\s*\)/);
  assert.match(result.text, /FROM all_operational_sessions o\s+WHERE TRUE/);
  assert.ok(result.values.some(v => v instanceof Date && v.getTime() === from.getTime()));
  assert.ok(result.values.some(v => v instanceof Date && v.getTime() === now.getTime()));
  assert.ok(result.values.includes("staging"));
  assert.ok(result.values.includes("example"));
  assert.equal(result.text.includes("example"), false);
  // The all-time CTE is declared before directory-only search/last-seen constraints.
  assert.ok(result.text.indexOf("all_operational_sessions AS MATERIALIZED")
    < result.text.indexOf("strpos(lower(o."));
});

test("metric summary is returned even when the directory has no selected identities", () => {
  const result = sql({ ...base, showUsers: false, showGuests: false,
    showOperationalGuests: false, withOperationalSummary: true });
  assert.match(result.text, /WHERE FALSE/);
  assert.match(result.text, /RIGHT JOIN/);
  assert.match(result.text, /"operationalAllTimeCount"/);
  assert.match(result.text, /"operationalNewCount"/);
  assert.equal(adminIdentityPageSql({ ...base, showUsers: false, showGuests: false,
    showOperationalGuests: false }), null);
});

test("Today includes returning account sessions and environment-scoped searches/handoffs", () => {
  const now = new Date("2026-11-20T08:00:00.000Z");
  const start = new Date("2026-11-20T00:00:00.000Z");
  const where = adminRegisteredActivityDateWhere({ from: start, to: now }, "staging");
  assert.ok(where.OR);
  assert.equal(where.OR.length, 5);
  assert.deepEqual(where.OR[0], { createdAt: { gte: start, lt: now } });
  assert.deepEqual(where.OR[1], { accountSessions: { some: { lastSeenAt: { gte: start, lt: now } } } });
  assert.deepEqual(where.OR[2], { searchHistory: { some: { createdAt: { gte: start, lt: now }, query: { path: ["environment"], equals: "staging" } } } });
  assert.deepEqual(where.OR[3], { redirectLogs: { some: { createdAt: { gte: start, lt: now }, metadata: { path: ["environment"], equals: "staging" } } } });
  assert.deepEqual(where.OR[4], { apiEvents: { some: { createdAt: { gte: start, lt: now }, metadata: { path: ["environment"], equals: "staging" } } } });
  assert.deepEqual(adminRegisteredActivityDateWhere(null, "staging"), {});
  const result = sql({ ...base, date: "today", now, environment: "staging" });
  assert.match(result.text, /OR EXISTS \([\s\S]*?"AccountSession"/);
  assert.match(result.text, /OR EXISTS \([\s\S]*?"SearchHistory"/);
  assert.match(result.text, /OR EXISTS \([\s\S]*?"RedirectLog"/);
  assert.match(result.text, /OR EXISTS \([\s\S]*?"AnalyticsEvent"/);
  assert.equal(result.values.includes("staging"), true);
  assert.ok(result.values.some(value => value instanceof Date && value.getTime() === start.getTime()));
  assert.ok(result.values.some(value => value instanceof Date && value.getTime() === now.getTime()));
});

test("registered activity filtering preserves correct role, status and identity search", () => {
  const result = sql({ ...base, date: "today", now: new Date("2026-11-20T08:00:00.000Z"),
    environment: "production", query: "customer@example.invalid", role: "USER", status: "ACTIVE" });
  assert.ok(result.values.includes("customer@example.invalid"));
  assert.ok(result.values.includes("USER"));
  assert.ok(result.values.includes("ACTIVE"));
  assert.ok(result.values.includes("production"));
  assert.doesNotMatch(result.text, /customer@example.invalid/);
  const all = sql({ ...base, date: "all" });
  // All time still computes the latest observed session for sorting; it must
  // not impose a date-window predicate on membership.
  assert.match(all.text, /FROM "AccountSession"/);
  assert.doesNotMatch(all.text, /AND a\."lastSeenAt" >= /);
});

test("latest observation drives the same value used for display and ordering", () => {
  const result = sql({ ...base, date: "today", now: new Date("2026-11-20T10:00:00.000Z"), environment: "staging" });
  assert.match(result.text, /GREATEST\(/);
  for (const source of ['"AccountSession"', '"SearchHistory"', '"RedirectLog"', '"AnalyticsEvent"']) {
    assert.ok(result.text.includes(source), source);
  }
  assert.match(result.text, /v\."lastSeenAt" AS "lastSeenAt"/);
  assert.match(result.text, /ORDER BY "lastSeenAt" DESC NULLS LAST, "joinedAt" DESC, "kind" ASC, "id" DESC/);
});

test("returning consented and operational guests qualify by last observed activity", () => {
  const result = sql({ ...base, date: "today", now: new Date("2026-11-20T10:00:00.000Z"),
    environment: "staging", showOperationalGuests: true });
  assert.match(result.text, /v\."firstSeenAt" >= /);
  assert.match(result.text, /OR \(v\."lastSeenAt" >= /);
  assert.match(result.text, /o\."lastSeenAt" >=/);
  assert.match(result.text, /"consentStatus" = 'GRANTED'/);
  assert.match(result.text, /"trackingDisabledAt" IS NULL/);
  assert.match(result.text, /NOT EXISTS/);
});

test("oldest and alphabetic explicit sorts remain available", () => {
  assert.match(sql({ ...base, sort: "oldest" }).text, /ORDER BY "joinedAt" ASC, "kind" ASC, "id" ASC/);
  assert.match(sql({ ...base, sort: "name_asc" }).text, /ORDER BY lower\("displayName"\) ASC, "joinedAt" DESC/);
  assert.match(sql({ ...base, sort: "name_desc" }).text, /ORDER BY lower\("displayName"\) DESC, "joinedAt" DESC/);
});
