import assert from "node:assert/strict";
import test from "node:test";
import { translations as th } from "./th";
import { translations as vi } from "./vi";
import { translations as en } from "./en";

test("Thai trip recovery messages use Thai rather than copied Chinese", () => {
  const keys = Object.keys(en).filter((key) => key.startsWith("accountDashboard.trips.state.") ||
    ["accountDashboard.trips.lookup.unauthenticated", "accountDashboard.trips.lookup.error", "accountDashboard.trips.lookup.found"].includes(key));
  for (const key of keys) {
    assert.match(th[key as keyof typeof th], /[\u0E00-\u0E7F]/, key);
    assert.doesNotMatch(th[key as keyof typeof th], /[\u4E00-\u9FFF]/, key);
  }
});

test("Vietnamese trip recovery messages preserve retry and sign-in meaning", () => {
  assert.equal(vi["accountDashboard.trips.state.error.retry"], "Thử lại");
  assert.match(vi["accountDashboard.trips.state.unauthenticated.title"], /Đăng nhập/);
  assert.match(vi["accountDashboard.trips.state.error.body"], /Vui lòng thử lại/);
  assert.match(vi["accountDashboard.trips.lookup.error"], /Vui lòng thử lại/);
});
