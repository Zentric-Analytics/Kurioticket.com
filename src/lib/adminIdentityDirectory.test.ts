import assert from "node:assert/strict";
import test from "node:test";
import { adminIdentityPageSql, escapePrismaContainsQuery } from "./adminIdentityDirectory";

const base = { query: "", role: "ALL", status: "ALL", showUsers: true, showGuests: true, limit: 15, offset: 0 };

function sql(input: typeof base) {
  const result = adminIdentityPageSql(input);
  assert.ok(result);
  return { text: result.strings.join("?"), values: result.values };
}

test("both identity tables are combined before one chronological sort and pagination", () => {
  const result = sql(base);
  assert.match(result.text, /FROM "User"/);
  assert.match(result.text, /UNION ALL/);
  assert.match(result.text, /FROM "Visitor"/);
  assert.match(result.text, /ORDER BY "joinedAt" DESC, "kind" ASC, "id" DESC/);
  assert.match(result.text, /LIMIT .* OFFSET/);
  assert.deepEqual(result.values.slice(-2), [15, 0]);
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

test("filters and page bounds remain parameterized", () => {
  const malicious = "x' OR 1=1--";
  const result = sql({ ...base, query: malicious, role: "ADMIN", status: "ACTIVE", limit: 15, offset: 15 });
  assert.ok(result.values.includes(malicious));
  assert.ok(result.values.includes("ADMIN"));
  assert.ok(result.values.includes("ACTIVE"));
  assert.equal(result.text.includes(malicious), false);
  assert.deepEqual(result.values.slice(-2), [15, 15]);
});

test("registered-only list never joins guests and empty selection is empty", () => {
  assert.doesNotMatch(sql({ ...base, showGuests: false }).text, /"Visitor"/);
  assert.equal(adminIdentityPageSql({ ...base, showUsers: false, showGuests: false }), null);
});

test("invalid offsets and limits cannot run", () => {
  for (const offset of [-1, 1.2, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => adminIdentityPageSql({ ...base, offset }));
  assert.throws(() => adminIdentityPageSql({ ...base, limit: 10000 }));
});


test("count predicates escape wildcard and backslash characters to match literal SQL substring search", () => {
  assert.equal(escapePrismaContainsQuery("%"), "\\%");
  assert.equal(escapePrismaContainsQuery("_"), "\\_");
  assert.equal(escapePrismaContainsQuery("\\"), "\\\\");
  assert.equal(escapePrismaContainsQuery("a%_\\b"), "a\\%\\_\\\\b");
  assert.equal(escapePrismaContainsQuery("LOS"), "LOS");

  // The raw ordering query still binds the original literal term, not
  // the Prisma LIKE-escaped representation or any interpolated SQL.
  const raw = sql({ ...base, query: "a%_\\b" });
  assert.ok(raw.values.includes("a%_\\b"));
  assert.equal(raw.values.includes("a\\%\\_\\\\b"), false);
});
