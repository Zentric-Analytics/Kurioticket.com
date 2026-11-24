import assert from "node:assert/strict";
import test from "node:test";
import { formatViewerTimestamp, validViewerTimeZone, viewerTodayStart } from "./adminLocalTime";

test("search timestamps display in the viewer's timezone, not UTC", () => {
  const instant = "2026-11-24T09:28:33.356Z";
  assert.match(formatViewerTimestamp(instant, "Africa/Lagos"), /10:28/);
  assert.match(formatViewerTimestamp(instant, "UTC"), /9:28/);
  assert.match(formatViewerTimestamp(instant, "Africa/Lagos", "2026-11-24T12:00:00Z"), /^Today, 10:28/);
});

test("Today starts at viewer-local midnight and can be the previous UTC day", () => {
  const now = new Date("2026-11-24T11:30:00Z");
  assert.equal(viewerTodayStart(now, "Africa/Lagos"), "2026-11-23T23:00:00.000Z");
  assert.equal(viewerTodayStart(now, "UTC"), "2026-11-24T00:00:00.000Z");
  assert.equal(viewerTodayStart(now, "America/New_York"), "2026-11-24T05:00:00.000Z");
});

test("DST offsets resolve using local midnight instead of the current offset", () => {
  assert.equal(viewerTodayStart(new Date("2026-03-08T18:00:00Z"), "America/New_York"), "2026-03-08T05:00:00.000Z");
  assert.equal(viewerTodayStart(new Date("2026-11-01T18:00:00Z"), "America/New_York"), "2026-11-01T04:00:00.000Z");
});

test("untrusted timezone values fail closed to UTC interpretation", () => {
  assert.equal(validViewerTimeZone("Africa/Lagos"), "Africa/Lagos");
  assert.equal(validViewerTimeZone("not-a-timezone"), null);
  assert.equal(validViewerTimeZone("x".repeat(81)), null);
});
