import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { AdminFullActivityWorkspace, FULL_ACTIVITY_CATEGORIES } =
  jiti("./AdminFullActivityWorkspace") as typeof import("./AdminFullActivityWorkspace");
const { AdminUnifiedActivityList } =
  jiti("./AdminUnifiedActivityList") as typeof import("./AdminUnifiedActivityList");
const { AppRouterContext } =
  jiti("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
const at = new Date("2026-11-27T12:00:00.000Z");
const base = "/admin/users/guest/qa-recorded-guest";
const unavailable = "Recorded history is unavailable for this temporary guest session.";
type Props = ComponentProps<typeof AdminFullActivityWorkspace>;

const common: Omit<Props, "title" | "identityType" | "children"> = {
  backHref: base + "/activity",
  filters: {
    path: base + "/activity/all", directory: "", timeZone: "UTC", now: at.toISOString(),
    initial: { tab: "all", q: "", product: "all", stage: "all", order: "newest", from: "", to: "", range: "all" },
  },
  activeCategory: "all",
  categories: FULL_ACTIVITY_CATEGORIES.map(category => ({ ...category, href: base + "/activity/all?tab=" + category.value })),
  journeyAction: { label: "View journey history", href: base + "/journeys" },
  historyActions: [
    { label: "Device & Access history", href: base + "/devices" },
    { label: "Pages visited history", href: base + "/pages" },
  ],
};

function render(props: Props) {
  return new JSDOM(renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never },
    createElement(AdminFullActivityWorkspace, props)))).window.document;
}

function liveProps(): Props {
  return {
    ...common, title: "Guest session", identityType: "Live session", prefetch: false,
    filters: { ...common.filters, unavailableReason: unavailable },
    categories: common.categories.map(category => category.value === "all" || category.value === "access"
      ? category : { value: category.value, label: category.label, unavailableReason: unavailable }),
    journeyAction: { label: "View journey history", unavailableReason: unavailable },
    historyActions: common.historyActions.map(action => ({ label: action.label, unavailableReason: unavailable })),
    children: createElement(AdminUnifiedActivityList, {
      events: [], environment: "staging", timeZone: "UTC",
      access: { at, label: "Latest verified access", detail: "Android app" },
    }),
  };
}

test("recorded full activity retains usable filters, every category and its exact history links", () => {
  const document = render({
    ...common, title: "QA recorded guest", identityType: "Consented guest",
    children: createElement(AdminUnifiedActivityList, {
      events: [{ id: "s-qa-search", at, stage: "SEARCH_COMPLETED", label: "Search completed", detail: "Lagos to London", searchHistoryId: "qa-search" }],
      environment: "staging", timeZone: "UTC", nextHref: base + "/activity/all?cursor=qa-cursor",
    }),
  });
  assert.equal(document.querySelector("h1")?.textContent, "All activity");
  assert.equal(document.querySelectorAll('[aria-label="Activity categories"] a').length, 7);
  assert.equal(document.querySelectorAll('[aria-label="Activity categories"] [aria-disabled]').length, 0);
  assert.equal(document.querySelector('[aria-label="Search activity"]')?.hasAttribute("disabled"), false);
  assert.equal(document.querySelectorAll('[data-testid="activity-filters-row"] button:disabled').length, 0);
  assert.deepEqual(Array.from(document.querySelectorAll('[data-testid="activity-history-actions"] a'), link => link.getAttribute("href")),
    [base + "/devices", base + "/pages"]);
  assert.equal(document.querySelector('[data-activity-id="s-qa-search"]')?.textContent?.includes("Lagos to London"), true);
  assert.ok(document.querySelector('a[href="/admin/searches/qa-search?environment=staging"]'));
  assert.ok(document.querySelector('a[href="' + base + '/activity/all?cursor=qa-cursor"]'));
});

test("temporary guests retain the recorded full-view framework without actionable history or fabricated events", () => {
  const recorded = render({ ...common, title: "QA customer", identityType: "Registered account", children: "Recorded history" });
  const live = render(liveProps());
  for (const selector of ['[data-testid="activity-history-card"]', '[data-testid="activity-filters-row"]', '[aria-label="Activity categories"]', '[data-testid="activity-history-actions"]']) {
    assert.equal(live.querySelector(selector)?.className, recorded.querySelector(selector)?.className);
  }
  assert.equal(live.querySelectorAll('[aria-label="Activity categories"] > *').length, 7);
  assert.equal(live.querySelectorAll('[aria-label="Activity categories"] a').length, 2);
  assert.equal(live.querySelectorAll('[aria-label="Activity categories"] [aria-disabled="true"]').length, 5);
  assert.equal(live.querySelector('[aria-label="Search activity"]')?.hasAttribute("disabled"), true);
  assert.equal(live.querySelectorAll('[data-testid="activity-filters-row"] button:disabled').length, 4);
  assert.match(live.querySelector('[data-testid="activity-filters-row"]')?.textContent ?? "", /Unavailable/);
  assert.equal(live.querySelectorAll('[data-testid="activity-history-actions"] a').length, 0);
  assert.equal(live.querySelectorAll('a[href*="/journeys"], a[href*="/devices"], a[href*="/pages"], a[href*="/searches"]').length, 0);
  assert.equal(live.querySelectorAll("[data-activity-id]").length, 1);
  assert.match(live.querySelector("[data-activity-id]")?.textContent ?? "", /Latest verified access/);
  assert.doesNotMatch(live.body.textContent ?? "", /No recorded activity matches|0 searches|0 events/);
});

test("an expired guest retains the full workspace with all categories unavailable and no activity record", () => {
  const props = liveProps();
  const document = render({
    ...props, identityType: "Unavailable",
    categories: props.categories.map(category => ({ value: category.value, label: category.label, unavailableReason: unavailable })),
    children: createElement("p", { role: "status" }, "This live guest session is no longer available or cannot be verified."),
  });
  assert.ok(document.querySelector('[data-testid="activity-history-card"]'));
  assert.equal(document.querySelectorAll('[aria-label="Activity categories"] [aria-disabled="true"]').length, 7);
  assert.equal(document.querySelectorAll('[aria-label="Activity categories"] a, [data-activity-id]').length, 0);
  assert.match(document.querySelector('[role="status"]')?.textContent ?? "", /no longer available/);
});
