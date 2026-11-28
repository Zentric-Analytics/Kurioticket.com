import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { JSDOM } from "jsdom";
import type { ActivityRow } from "@/lib/adminIdentityJourney";
import { decodeActivityJourneyReturn } from "@/lib/adminActivityJourneyNavigation";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  fsCache: false,
});

const { AdminUnifiedActivityList } =
  jiti("./AdminUnifiedActivityList") as typeof import("./AdminUnifiedActivityList");

const at = new Date("2026-11-26T12:00:00Z");

const pages: ActivityRow[] = [1, 2, 3].map(i => ({
  id: "e-page-" + i,
  at: new Date(+at - i * 60000),
  stage: "PAGE_VIEW",
  label: "Page visited",
  detail: "/support",
  pageView: { path: "/support", previousPath: null, transport: "native", platform: "iOS app", href: null },
}));

test("overview shows the global newest five actions, including multiple pages, with access separate", () => {
  const mixed: ActivityRow[] = [...pages,
    {id:"s-new-search",at:new Date(+at + 1000),stage:"SEARCH_COMPLETED",label:"Search completed",detail:"Lagos"},
    {id:"j-new-filter",at:new Date(+at - 1500),stage:"SEARCH_FILTER_APPLIED",label:"Results filter applied",detail:"Stops"},
    {id:"j-older-selection",at:new Date(+at - 600000),stage:"OFFER_SELECTED",label:"Offer selected",detail:"Older offer"},
  ];
  const html = renderToStaticMarkup(createElement(
    AdminUnifiedActivityList, {
      events: mixed,
      environment: "staging",
      timeZone: "UTC",
      overview: true,
      access: {
        at,
        detail: "Desktop web",
        href: "/admin/users/user/test-user/devices",
      },
      allHref: "/admin/users/user/test-user/activity/all",
    }
  ));

  assert.match(html, /e-page-1/);
  assert.match(html, /iOS app/);
  assert.match(html, /App screen/);
  assert.doesNotMatch(html, /Screen route|Safe page path/);
  for (const id of ["e-page-1","e-page-2","e-page-3","s-new-search","j-new-filter"]) assert.ok(html.includes('data-activity-id="' + id + '"'));
  assert.doesNotMatch(html, /j-older-selection/);
  assert.equal((html.match(/data-activity-id=/g) || []).length,5);
  assert.equal(
    (html.match(/data-activity-id="latest-access-summary"/g) || []).length,
    0
  );
  assert.match(html, /View all activity/);
});

test("full activity retains all supplied eligible records", () => {
  const html = renderToStaticMarkup(createElement(
    AdminUnifiedActivityList, {
      events: pages,
      environment: "staging",
      timeZone: "UTC",
    }
  ));

  for (const page of pages) {
    assert.ok(html.includes(page.id));
  }
});

test("car activity presents the stored scalar without inferring rental offers", () => {
  const row: ActivityRow = {
    id: "s-car-test",
    at,
    stage: "SEARCH_COMPLETED",
    label: "Search completed",
    detail: "CAR · Lagos · SUCCESS",
    product: "CAR",
    resultCount: 549,
  };

  const render = (event: ActivityRow) =>
    renderToStaticMarkup(createElement(
      AdminUnifiedActivityList, {
        events: [event],
        environment: "staging",
        timeZone: "UTC",
      }
    ));

  assert.match(render(row), /549 recorded results/);
  assert.match(render(row), /Rental offer count unavailable/);
  assert.doesNotMatch(render(row), /car result groups|2,547 rental offers/);
});

test("full live Activity shows only the verified access, with no fabricated historical links", () => {
  const html=renderToStaticMarkup(createElement(AdminUnifiedActivityList,{
    events:[],environment:"staging",timeZone:"UTC",
    access:{at,detail:"Desktop web",label:"Latest verified access"},
  }));
  assert.match(html,/aria-label="All activity"/);
  assert.doesNotMatch(html, /<h2/);
  assert.equal((html.match(/data-activity-id="latest-access-summary"/g)??[]).length,1);
  assert.match(html,/Latest verified access/);
  assert.doesNotMatch(html,/View access history|View original search|View pages visited|No recorded activity matches/);
});

const renderDocument = (events: ActivityRow[], options: Partial<Parameters<typeof AdminUnifiedActivityList>[0]> = {}) =>
  new JSDOM(renderToStaticMarkup(createElement(AdminUnifiedActivityList, {
    events, environment: "staging", timeZone: "UTC", ...options,
  }))).window.document;

test("collapsed action titles contain no repeated navigation or raw page/reference details", () => {
  const document = renderDocument([
    { ...pages[0], label: "Support", pageView: { path: "/support", previousPath: "/cars/results", transport: "web", platform: "Desktop web", href: "https://staging.kurioticket.com/support" } },
    { id: "e-saved", at, stage: "ACCOUNT_ACTIVITY", label: "Save confirmed", detail: "Flight · Web · Reference: item-exact-01", product: "FLIGHT", platform: "WEB", platformSource: "action" },
  ], { overview: true, pagesHref: "/admin/users/user/account-1/pages" });
  const collapsed = Array.from(document.querySelectorAll("summary"), row => row.textContent).join(" ");
  assert.match(collapsed, /Visited Support/);
  assert.match(collapsed, /Save confirmed/);
  assert.match(collapsed, /Website/);
  assert.doesNotMatch(collapsed, /https:|Reference:|item-exact-01|\/cars\/results|View pages visited|View original search/);
  assert.equal(document.querySelectorAll("summary a").length, 0);
  assert.equal(document.querySelectorAll("details[open]").length, 0);
  assert.equal(document.querySelector('[data-activity-id="e-saved"] code')?.textContent, "item-exact-01");
  assert.match(document.querySelector('[data-activity-id="e-page-1"]')?.textContent ?? document.body.textContent ?? "", /Previous observed page/);
  assert.equal(document.querySelectorAll('a[href="/admin/users/user/account-1/pages"]').length, 0);
  const ids = Array.from(document.querySelectorAll("summary"), node => node.getAttribute("aria-controls"));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(id && document.getElementById(id));
});

test("complete history presents sanitized audit outcomes and verified journey context", () => {
  const returnHref = "/admin/users/user/account-0001/activity/all?interface=customer";
  const document = renderDocument([
    { id: "a-admin-action", at, stage: "ADMIN_SECURITY_AUDIT", label: "Updated account role", detail: "Administrative security audit",
      interface: "admin", originalIdentity: "administrator", outcome: "succeeded" },
    { id: "j-package-search", at, stage: "SEARCH_COMPLETED", label: "Search completed", detail: "PACKAGE",
      interface: "customer", product: "PACKAGE", resultCount: 2, resultUnit: "component_results", journeyId: "journey-package-0001" },
  ], { identity: { kind: "user", id: "account-0001" }, now: at, returnHref });
  const audit = document.querySelector('[data-activity-id="a-admin-action"]');
  assert.match(audit?.textContent ?? "", /Administrative security audit/);
  assert.match(audit?.textContent ?? "", /Succeeded/);
  assert.match(audit?.textContent ?? "", /Administrator/);
  assert.equal(audit?.querySelectorAll("a").length, 0);
  const search = document.querySelector('[data-activity-id="j-package-search"]');
  assert.match(search?.textContent ?? "", /2 component results/);
  const link = search?.querySelector('a[href^="/admin/journeys/"]');
  assert.equal(link?.textContent?.trim(), "View journey");
  const url = new URL(link!.getAttribute("href")!, "https://test.invalid");
  assert.equal(url.searchParams.get("userId"), "account-0001");
  assert.equal(url.searchParams.get("environment"), "staging");
  assert.ok(url.searchParams.get("activityReturn"));
});

test("failed searches show their recorded outcome and exact guest search context inside the account view", () => {
  const returnHref = "/admin/users/user/account-0001/activity/all?range=today&tab=searches";
  const document = renderDocument([{
    id: "s-failed", at, stage: "SEARCH_COMPLETED", label: "Search completed", detail: "CAR · CDG → CDG · FAILED", product: "CAR",
    resultCount: 0, searchHistoryId: "search-original-0001", originalSearchIdentity: "guest", searchOutcome: "FAILED", platform: "WEB", platformSource: "search",
  }], { returnHref });
  assert.match(document.querySelector("summary")?.textContent ?? "", /Search failed/);
  assert.doesNotMatch(document.querySelector("summary")?.textContent ?? "", /Search completed|View original search/);
  assert.match(document.querySelector("summary")?.textContent ?? "", /Search originally recorded as guest/);
  const link = document.querySelector('details a[href^="/admin/searches/"]')!;
  assert.ok(link);
  const url = new URL(link.getAttribute("href")!, "https://admin.invalid");
  assert.equal(url.pathname, "/admin/searches/search-original-0001");
  assert.equal(url.searchParams.get("environment"), "staging");
  const returned = new URL(decodeActivityJourneyReturn(url.searchParams.get("activityReturn"))!, "https://admin.invalid");
  assert.equal(returned.pathname, "/admin/users/user/account-0001/activity/all");
  assert.deepEqual(Object.fromEntries(returned.searchParams), { tab: "searches", range: "today" });
  assert.equal(document.querySelectorAll('a[href^="/admin/searches/"]').length, 1);
  assert.match(document.querySelector('[data-testid="activity-event-details"]')?.textContent ?? "", /original search record retains that identity/);
});

test("unknown identity stays unlabelled and zero results never invent a failed search", () => {
  const document = renderDocument([{
    id: "s-unknown", at, stage: "SEARCH_COMPLETED", label: "Search completed", detail: "FLIGHT · Lagos", product: "FLIGHT", resultCount: 0,
  }, {
    id: "s-account", at: new Date(+at - 1000), stage: "SEARCH_COMPLETED", label: "Search completed", detail: "FLIGHT · Lagos · SUCCESS", product: "FLIGHT",
    originalSearchIdentity: "registered", searchOutcome: "SUCCESS",
  }]);
  const unknown = document.querySelector('[data-activity-id="s-unknown"]')!;
  assert.doesNotMatch(unknown.textContent ?? "", /Guest|guest|Search failed|Original search identity/);
  assert.equal(unknown.querySelectorAll("a").length, 0);
  assert.match(document.querySelector('[data-activity-id="s-account"]')?.textContent ?? "", /Registered account/);
  assert.doesNotMatch(document.querySelector('[data-activity-id="s-account"] summary')?.textContent ?? "", /guest/);
});

test("later journey steps distinguish source search platform from action platform and retain separate saves/removals", () => {
  const document = renderDocument([
    { id: "j-saved", at, stage: "RESULT_SAVED", label: "Saved to account", detail: "Flight · LOS → LHR", product: "FLIGHT", platform: "IOS", platformSource: "search" },
    { id: "e-unsaved", at: new Date(+at + 1000), stage: "ACCOUNT_ACTIVITY", label: "Unsaved item", detail: "Flight · Android · Reference: result-one", product: "FLIGHT", platform: "ANDROID", platformSource: "action" },
  ]);
  assert.equal(document.querySelectorAll("[data-activity-id]").length, 2);
  assert.equal(document.querySelector("[data-activity-id]")?.getAttribute("data-activity-id"), "e-unsaved");
  assert.match(document.querySelector('[data-activity-id="j-saved"] summary')?.textContent ?? "", /Search: iOS app/);
  assert.match(document.querySelector('[data-activity-id="j-saved"] dl')?.textContent ?? "", /Search platform/);
  assert.match(document.querySelector('[data-activity-id="e-unsaved"] summary')?.textContent ?? "", /Android app/);
  assert.doesNotMatch(document.querySelector('[data-activity-id="e-unsaved"] summary')?.textContent ?? "", /Search:|result-one/);
});
