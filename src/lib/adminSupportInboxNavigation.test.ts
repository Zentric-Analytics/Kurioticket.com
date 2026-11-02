import assert from "node:assert/strict";
import test from "node:test";
import {
  supportCategoryChoices,
  supportCategoryLabel,
  supportInboxHref,
  supportStatusTabs,
  supportPriorityOptions,
} from "./adminSupportInboxNavigation";

test("Support categories use actual form and system-generated storage values", () => {
  const values = supportCategoryChoices("").map(option => option.value);
  assert.deepEqual(values, ["", "search-help", "price-alerts", "redirect", "account", "account_deletion"]);
  assert.equal(supportCategoryLabel("search-help"), "Search help");
  assert.equal(supportCategoryLabel("account_deletion"), "Account deletion");
  assert.equal(supportCategoryLabel("legacy_custom"), "Legacy custom");
  assert.equal(supportCategoryChoices("legacy_custom").at(-1)?.value, "legacy_custom");
});

test("Support tabs and priorities retain the backend's accepted values", () => {
  assert.deepEqual(supportStatusTabs.map(tab => tab.value), ["", "OPEN", "WAITING_ON_TEAM", "WAITING_ON_USER", "RESOLVED", "CLOSED"]);
  assert.deepEqual(supportPriorityOptions.map(option => option.value), ["", "LOW", "NORMAL", "HIGH", "URGENT"]);
});

test("Changing Support filters preserves other filters and clears the stale page cursor", () => {
  const base = new URLSearchParams("q=flight&status=OPEN&priority=HIGH&category=search-help&cursor=old-token&from=2026-10-01T00%3A00%3A00.000Z");
  const next = new URL(supportInboxHref(base, { category: "redirect" }), "https://example.test");
  assert.equal(next.pathname, "/admin/support");
  assert.equal(next.searchParams.get("q"), "flight");
  assert.equal(next.searchParams.get("status"), "OPEN");
  assert.equal(next.searchParams.get("priority"), "HIGH");
  assert.equal(next.searchParams.get("category"), "redirect");
  assert.equal(next.searchParams.get("cursor"), null);
  assert.ok(next.searchParams.get("from"));
  const all = new URL(supportInboxHref(base, { status: "", category: "", priority: "" }), "https://example.test");
  assert.equal(all.searchParams.get("status"), null);
  assert.equal(all.searchParams.get("category"), null);
  assert.equal(all.searchParams.get("priority"), null);
});
