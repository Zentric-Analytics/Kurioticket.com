import assert from "node:assert/strict";
import test from "node:test";
import {
  composeUtcExpiration, formatUtcExpiration, moveUtcMonth,
  parseUtcExpiration, utcMonthGrid, formatUtcAuditTimestamp,
} from "./teamAccessExpiration";

test("UTC Team Access picker serializes explicit instants without local timezone drift", () => {
  assert.equal(composeUtcExpiration("2026-11-18", "9", "05"), "2026-11-18T09:05:00.000Z");
  assert.equal(composeUtcExpiration("2026-02-29", "12", "30"), null);
  assert.equal(composeUtcExpiration("2028-02-29", "23", "59"), "2028-02-29T23:59:00.000Z");
  for (const [hour, minute] of [["24", "00"], ["05", "60"], ["-1", "20"], ["aa", "45"], ["12", ""]]) {
    assert.equal(composeUtcExpiration("2026-11-18", hour, minute), null);
  }
  const original = "2026-11-18T22:17:00.000Z";
  const values = parseUtcExpiration(original);
  assert.deepEqual(values, { date: "2026-11-18", hour: "22", minute: "17" });
  assert.equal(composeUtcExpiration(values!.date, values!.hour, values!.minute), original);
  assert.equal(parseUtcExpiration(null), null);
  assert.equal(formatUtcExpiration(null), "No expiration");
  assert.match(formatUtcExpiration(original), /Nov 18, 2026.*22:17 UTC/);
});
test("UTC calendar grid handles leap months and adjacent month navigation", () => {
  const feb2028 = utcMonthGrid("2028-02").filter(Boolean);
  assert.equal(feb2028.length, 29);
  assert.equal(feb2028[0], "2028-02-01");
  assert.equal(feb2028.at(-1), "2028-02-29");
  assert.equal(utcMonthGrid("2026-02").filter(Boolean).length, 28);
  assert.equal(moveUtcMonth("2026-12", 1), "2027-01");
  assert.equal(moveUtcMonth("2026-01", -1), "2025-12");
});

test("Team Access audit timestamps render identically on UTC servers and non-UTC browsers", () => {
  assert.equal(formatUtcAuditTimestamp("2026-11-01T08:00:00.000Z"), "2026-11-01 08:00 UTC");
  assert.equal(formatUtcAuditTimestamp(new Date("2026-11-18T17:40:00.000Z")), "2026-11-18 17:40 UTC");
});
