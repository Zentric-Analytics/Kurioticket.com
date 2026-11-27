import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

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
  assert.match(html, /Screen route/);
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
  assert.match(html,/Activity history/);
  assert.equal((html.match(/data-activity-id="latest-access-summary"/g)??[]).length,1);
  assert.match(html,/Latest verified access/);
  assert.doesNotMatch(html,/View access history|View original search|View pages visited|No recorded activity matches/);
});
