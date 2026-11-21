import assert from "node:assert/strict";
import test from "node:test";
import { recordedAccountsAndGuestSessionsTotal } from "./adminRecordedPopulationTotal";

test("total combines registered, consented and distinct operational sessions exactly once", () => {
  const population = { registered: 16, guests: 32, total: 48 };
  assert.equal(recordedAccountsAndGuestSessionsTotal(population, 7), 55);
  assert.equal(recordedAccountsAndGuestSessionsTotal(population, 0), 48);
});

test("overall total is unavailable rather than silently dropping missing operational evidence", () => {
  const population = { registered: 16, guests: 32, total: 48 };
  assert.equal(recordedAccountsAndGuestSessionsTotal(population, null), null);
  assert.equal(recordedAccountsAndGuestSessionsTotal(null, 7), null);
});

test("invalid or inconsistent source totals are not presented as reliable", () => {
  for (const input of [
    { registered: 16, guests: 32, total: 47 },
    { registered: 16, guests: 32, total: NaN },
    { registered: -1, guests: 32, total: 31 },
  ]) assert.equal(recordedAccountsAndGuestSessionsTotal(input, 7), null);
  assert.equal(recordedAccountsAndGuestSessionsTotal({ registered: 16, guests: 32, total: 48 }, -1), null);
  assert.equal(recordedAccountsAndGuestSessionsTotal({ registered: 16, guests: 32, total: 48 }, Infinity), null);
});
