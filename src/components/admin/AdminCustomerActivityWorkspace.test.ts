import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url,{jsx:{runtime:"automatic"},fsCache:false});
const {AdminCustomerActivityWorkspace}=jiti("./AdminCustomerActivityWorkspace") as typeof import("./AdminCustomerActivityWorkspace");

const at=new Date("2026-11-26T12:00:00Z");
const common={backHref:"/admin/users",avatar:"G",lastSeenAt:at,timeZone:"UTC",children:createElement("p",null,"Recent activity fixture")};
test("same workspace preserves six measured summary values for recorded identities",()=>{
  const html=renderToStaticMarkup(createElement(AdminCustomerActivityWorkspace,{
    ...common,title:"QA customer",badge:"Active",firstLabel:"Joined",firstSeenAt:at,eventCount:11,
    summary:{searches:3,resultsViewed:0,offersSelected:2,providerHandoffs:1,journeysTracked:5,pagesVisited:6},
  }));
  assert.equal((html.match(/data-testid="activity-metric-value"/g)??[]).length,6);
  assert.doesNotMatch(html,/aria-label="Unavailable"/);
  for(const label of ["Searches","Results viewed","Offers selected","Provider handoffs","Journeys tracked","Pages visited"])assert.ok(html.includes(label),label);
  assert.match(html,/data-testid="activity-info-grid"/);
  assert.match(html,/data-testid="activity-identity-dividers"/);
  assert.ok(html.indexOf('aria-label="Activity summary"')<html.indexOf("Recent activity fixture"));
});
test("unlinked live session shows identical six metrics but never manufactures zero or first access",()=>{
  const html=renderToStaticMarkup(createElement(AdminCustomerActivityWorkspace,{
    ...common,title:"Guest session",badge:"Live session",firstLabel:"First seen",firstSeenAt:null,eventCount:null,summary:null,
  }));
  assert.equal((html.match(/data-testid="activity-metric-value"/g)??[]).length,6);
  assert.equal((html.match(/aria-label="Unavailable"/g)??[]).length,8);
  assert.match(html,/data-testid="activity-info-grid"/);
  assert.match(html,/data-testid="activity-identity-dividers"/);
  assert.doesNotMatch(html,/Copy guest ID|Manage account|Manage guest/);
});
