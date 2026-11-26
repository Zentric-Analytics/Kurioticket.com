import assert from "node:assert/strict";
import test from "node:test";
import { BOT_DIRECTORY, botDirectoryHref, botFilters, botName } from "./adminBotReport";
import { isAdminWorkspaceSectionActive } from "./adminNavigation";

const now = new Date("2026-11-26T15:30:00.000Z");

test("bot reports default to the current UTC day and can select all recorded time", () => {
  assert.deepEqual(botFilters({}, "today", now).window, {
    from: new Date("2026-11-26T00:00:00.000Z"), to: now,
  });
  assert.equal(botFilters({ range: "all" }, "today", now).window, undefined);
});

test("custom reporting includes both UTC calendar dates and enforces the 90-day maximum", () => {
  assert.deepEqual(botFilters({ range: "custom", from: "2026-08-28", to: "2026-11-25" }, "today", now).window, {
    from: new Date("2026-08-28T00:00:00.000Z"), to: new Date("2026-11-26T00:00:00.000Z"),
  });
  for (const [from, to] of [["2026-08-27", "2026-11-25"], ["2026-11-25", "2026-11-24"], ["2026-11-25", "2026-11-27"], ["2026-11-25", ""]]) {
    assert.equal(botFilters({ range: "custom", from, to }, "today", now).window, null);
  }
});

test("directory links keep the validated directory filters and exclude investigation filters", () => {
  const filters = botFilters({ q: "bot & crawler", group: "SEARCH_ENGINE", range: "7d", page: "2", decision: "DENIED" }, "today", now);
  assert.equal(botDirectoryHref(filters), BOT_DIRECTORY + "?range=7d&q=bot+%26+crawler&group=SEARCH_ENGINE&page=2");
  assert.equal(botFilters({ page: "Infinity", group: "fabricated", kind: "invalid" }).page, 1);
  assert.equal(botName({ group: "UNKNOWN", name: "GOOGLEBOT" }), "Unknown bot");
});

test("bot details highlight the Bot Management workspace entry", () => {
  assert.equal(isAdminWorkspaceSectionActive(BOT_DIRECTORY + "/example", BOT_DIRECTORY), true);
  assert.equal(isAdminWorkspaceSectionActive(BOT_DIRECTORY + "/example", "/admin/users"), false);
});
