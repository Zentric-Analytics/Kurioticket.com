import assert from "node:assert/strict";
import test from "node:test";
import { platformFixture } from "../../qa/stage06/fixtures";
import { formatPlatformRefreshTime, parsePlatformRefreshSnapshot } from "./platformHealthRefresh";

test("a valid operational response updates the visible snapshot without inventing client health", () => {
  const sample = platformFixture();
  assert.equal(parsePlatformRefreshSnapshot(sample, 24), sample);
  assert.equal(sample.nativeApplicationHealth.state, "UNKNOWN");
  assert.equal(sample.providerHealth, null);
});

test("an unavailable activity reader remains a valid unknown response, never a healthy zero", () => {
  const unavailable = platformFixture(true);
  assert.equal(parsePlatformRefreshSnapshot(unavailable, 24), unavailable);
  assert.equal(unavailable.activity.data, null);
});

test("mismatched windows, wrong shape, and inconsistent totals are not applied to the dashboard", () => {
  const base = platformFixture();
  assert.equal(parsePlatformRefreshSnapshot({ ...base, environment: "another" }, 24), null);
  assert.equal(parsePlatformRefreshSnapshot({ ...base, window: { from: base.window.from, to: "nonsense" } }, 24), null);
  assert.equal(parsePlatformRefreshSnapshot(base, 168), null);
  assert.equal(parsePlatformRefreshSnapshot({ ...base, activity: { state: "AVAILABLE", data: null } }, 24), null);
  assert.equal(parsePlatformRefreshSnapshot({ ...base, providerHealth: "unexpected" }, 24), null);
  assert.equal(parsePlatformRefreshSnapshot({ ...base, scheduledJobs: null }, 24), null);
  const invalidSearches = { ...base.activity.data!.searches,
    combined: { ...base.activity.data!.searches.combined, total: 999 } };
  const invalidActivity = { ...base.activity.data!, searches: invalidSearches };
  assert.equal(parsePlatformRefreshSnapshot({ ...base, activity: { state: "AVAILABLE", data: invalidActivity } }, 24), null);
});

test("last refreshed is displayed in stable UTC, not an unverified local time", () => {
  assert.equal(formatPlatformRefreshTime("2026-11-19T16:25:15.000Z"), "16:25 UTC");
  assert.equal(formatPlatformRefreshTime("invalid"), "Not available");
});
