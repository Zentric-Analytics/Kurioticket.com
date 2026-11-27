import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url,{jsx:{runtime:"automatic"},fsCache:false});
const {AdminCustomerActivityWorkspace}=jiti("./AdminCustomerActivityWorkspace") as typeof import("./AdminCustomerActivityWorkspace");
const at=new Date("2026-11-26T12:00:00Z");
const common={backHref:"/admin/users",avatar:"G",lastSeenAt:at,timeZone:"UTC",children:createElement("p",null,"Recent activity fixture")};
const summary={searches:3,resultsViewed:0,offersSelected:2,providerHandoffs:1,journeysTracked:5,pagesVisited:6};
const render=(props:ComponentProps<typeof AdminCustomerActivityWorkspace>) => new JSDOM(renderToStaticMarkup(createElement(AdminCustomerActivityWorkspace,props))).window.document;

test("recorded identities show exact six metrics and meaningful zero with usable count shortcuts",()=>{
  const document=render({...common,title:"QA customer",badge:"Registered account",accountStatus:"Account enabled",firstLabel:"Identity created",firstSeenAt:at,eventCount:11,summary,
    metricLinks:{searches:"/admin/users/user/qa-account/activity/all?range=all&tab=searches&stage=SEARCH_COMPLETED",pagesVisited:"/admin/users/user/qa-account/pages?range=all"}});
  const metrics=Array.from(document.querySelectorAll('[data-testid="activity-metric"]'),node=>[
    node.querySelector('[data-testid="activity-metric-label"]')?.textContent,
    node.querySelector('[data-testid="activity-metric-value"]')?.textContent,
  ]);
  assert.deepEqual(metrics,[["Searches","3"],["Results viewed","0"],["Offers selected","2"],["Provider handoffs","1"],["Journeys tracked","5"],["Pages visited","6"]]);
  assert.equal(document.querySelectorAll('[data-testid="activity-metric"][href]').length,2);
  assert.equal(document.querySelectorAll('[aria-label="Unavailable"]').length,0);
  assert.equal(document.querySelector('[data-testid="activity-events-fact"] dd')?.textContent,"11");
  assert.match(document.querySelector('[aria-label="Customer identity"]')?.textContent ?? "",/Identity created.*Last seen.*Recorded actions in period/);
  assert.match(document.body.textContent ?? "",/Reporting period: All time/);
  assert.equal(document.querySelector('[aria-label="Activity summary"]')?.compareDocumentPosition(document.querySelector('[data-testid="activity-page-card"] > p')!),4);
});

test("essential guests retain measurable actions and clearly mark unsupported metrics",()=>{
  const document=render({...common,title:"Guest session",badge:"Essential guest session",coverage:"operational",firstLabel:"First recorded",firstSeenAt:at,eventCount:4,summary,
    metricLinks:{searches:"/searches",resultsViewed:"/unsupported",offersSelected:"/unsupported",providerHandoffs:"/handoffs",journeysTracked:"/unsupported",pagesVisited:"/unsupported"},
    unavailableMetrics:{resultsViewed:"Not collected",offersSelected:"Not collected",journeysTracked:"Not collected",pagesVisited:"Not collected"}});
  assert.equal(document.querySelectorAll('[data-testid="activity-metric"] [aria-label="Unavailable"]').length,4);
  assert.equal(document.querySelectorAll('[data-testid="activity-metric"][href]').length,2);
  assert.equal(document.querySelectorAll('a[href="/unsupported"]').length,0);
  assert.equal(document.querySelectorAll('[data-testid="activity-metric-value"]').length,6);
});

test("unlinked live sessions use the shared workspace without fabricated zero or first access",()=>{
  const document=render({...common,title:"Guest session",badge:"Live session",coverage:"live",firstLabel:"First observed",firstSeenAt:null,eventCount:null,summary:null});
  assert.equal(document.querySelectorAll('[data-testid="activity-metric-value"]').length,6);
  assert.equal(document.querySelectorAll('[aria-label="Unavailable"]').length,8);
  assert.equal(document.querySelectorAll('[data-testid="activity-metric"][href]').length,0);
  assert.ok(document.querySelector('[data-testid="activity-info-grid"]'));
  assert.doesNotMatch(document.body.textContent ?? "",/Copy guest ID|Manage account|Manage guest/);
});
