import assert from "node:assert/strict";
import test from "node:test";
import {
  adminIdentityPageSql, escapePrismaContainsQuery, parseAdminIdentitySort,
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
  assert.match(result.text, /ORDER BY "joinedAt" DESC, "kind" ASC, "id" DESC/);
  assert.match(result.text, /LIMIT .* OFFSET/);
  assert.deepEqual(result.values.slice(-2), [100, 0]);
});

test("all sort modes order the entire result set before slicing a page", () => {
  const expected: Array<[NonNullable<AdminIdentityPageRequest["sort"]>, RegExp]> = [
    ["newest", /ORDER BY "joinedAt" DESC, "kind" ASC, "id" DESC/],
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
