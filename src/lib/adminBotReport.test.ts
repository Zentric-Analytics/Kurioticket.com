import assert from "node:assert/strict";
import test from "node:test";
import { BOT_DIRECTORY, botDirectoryHref, botDirectorySubtitle, botDirectoryTime, botFilters, botName, botTime, botType, botAccessLabel } from "./adminBotReport";
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

test("bot directory shows the owner or short reference without replacing the full identity", () => {
  const id = "415cbf42-0d0f-4efb-a4b7-6047bd20d38f";
  assert.equal(botDirectorySubtitle({ id, group: "UNKNOWN", owner: null }), "Ref: 415cbf42");
  assert.equal(botDirectorySubtitle({ id, group: "UNKNOWN", owner: "Unverified claim" }), "Ref: 415cbf42");
  assert.equal(botDirectorySubtitle({ id, group: "OTHER_RECOGNIZED", owner: "Meta" }), "Meta");
  assert.equal(botDirectorySubtitle({ id, group: "SEARCH_ENGINE", owner: null }), "Ref: 415cbf42");
});

test("directory displays UTC minutes without changing details timestamp precision", () => {
  const instant = new Date("2026-11-27T07:02:08Z");
  assert.equal(botDirectoryTime(instant), "27 Nov 2026, 07:02");
  assert.equal(botTime(instant), "27 Nov 2026, 07:02:08");
  assert.equal(botDirectoryTime(null), "Not recorded");
  assert.equal(botDirectoryTime(undefined), "Not recorded");
});

test("unknown bot names use recorded declaration tokens without approving or reclassifying the bot", () => {
  for (const [token, label] of [["BINGBOT", "Bingbot"], ["GOOGLEBOT", "Googlebot"], ["MJ12BOT", "MJ12BOT"], ["OAI-SEARCHBOT", "OAI-SEARCHBOT"], ["AASA-BOT", "AASA-BOT"], ["GOOGLE_INSPECTION_TOOL", "Google-InspectionTool"]]) {
    assert.equal(botName({ group: "UNKNOWN", name: null, identityKey: "UNKNOWN:" + token }), label);
  }
  assert.equal(botType("search", "UNKNOWN"), "Unknown");
  assert.equal(botType("seo", "UNKNOWN"), "Unknown");
  assert.equal(botAccessLabel("BLOCKED"), "Blocked");
  assert.equal(botName({ group: "SEARCH_ENGINE", name: "GOOGLEBOT", identityKey: "SEARCH_ENGINE:GOOGLEBOT" }), "Googlebot");
  assert.equal(botType("search", "SEARCH_ENGINE"), "Search engine");
});

test("unknown registry entries without a safe recorded declaration keep the fallback", () => {
  for (const identityKey of [undefined, "UNKNOWN:UNATTRIBUTED", "UNKNOWN:", "UNKNOWN:arbitrary user agent", "UNKNOWN:<script>bot", "SEARCH_ENGINE:GOOGLEBOT"]) {
    assert.equal(botName({ group: "UNKNOWN", name: null, identityKey }), "Unknown bot");
  }
});
