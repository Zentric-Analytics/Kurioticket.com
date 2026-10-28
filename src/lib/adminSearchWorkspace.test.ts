import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchWorkspaceHref, searchWorkspaceTab } from "./adminSearchWorkspace";

const activity = readFileSync("src/app/admin/searches/activity/page.tsx","utf8");
const redirects = readFileSync("src/app/admin/redirects/page.tsx","utf8");
const journeys = readFileSync("src/app/admin/journeys/page.tsx","utf8");
const attribution = readFileSync("src/app/admin/referral-attribution/page.tsx","utf8");
const searchDetail = readFileSync("src/app/admin/searches/[id]/page.tsx","utf8");

test("all four sections render within one Search Activity route", () => {
  for (const tab of ["searches","journeys","handoffs","attribution"] as const) {
    assert.equal(searchWorkspaceTab(tab),tab);
  }
  assert.match(activity, /<SearchWorkspaceTabs active=/);
  assert.match(activity, /AdminJourneysPage\(\{ searchParams: Promise\.resolve\(sectionParams\), embedded: true \}\)/);
  assert.match(activity, /AdminRedirectsPage\(\{ searchParams: Promise\.resolve\(sectionParams\), embedded: true \}\)/);
  assert.match(activity, /AdminReferralAttributionPage\(\{ searchParams: Promise\.resolve\(sectionParams\), embedded: true \}\)/);
});
test("tab destinations cannot carry incompatible backend filter keys", () => {
  assert.equal(searchWorkspaceHref("handoffs",{status:"FAILED",product:"HOTEL",environment:"staging"}),"/admin/searches/activity?tab=handoffs&environment=staging&product=HOTEL");
  assert.equal(searchWorkspaceHref("attribution",{days:"30",userId:"account-001",stage:"OFFER_SELECTED"}),"/admin/searches/activity?tab=attribution&days=30");
  assert.equal(searchWorkspaceHref("searches", {stage:"OFFER_SELECTED",identity:"guest"}),"/admin/searches/activity?identity=guest");
});
test("filtered sections submit back to the unified route and keep their reporting contracts", () => {
  assert.match(journeys,/action=\{embedded \? "\/admin\/searches\/activity"/);
  assert.match(redirects,/action=\{embedded \? "\/admin\/searches\/activity"/);
  assert.match(attribution,/action=\{embedded \? "\/admin\/searches\/activity"/);
  assert.match(redirects,/name="tab" value="handoffs"/);
  assert.match(journeys,/name="tab" value="journeys"/);
  assert.match(attribution,/name="tab" value="attribution"/);
  assert.match(searchDetail,/No verified identity link is available/);
  assert.match(searchDetail,/These links do not imply that another record belongs to this exact search/);
});

test("Search Activity has one navigation label, a Search records tab, and an accessible heading", () => {
  const nav = readFileSync("src/lib/adminNavigation.ts","utf8");
  const workspace = readFileSync("src/lib/adminSearchWorkspace.ts","utf8");
  const frame = readFileSync("src/components/admin/SearchWorkspacePanelFrame.tsx","utf8");
  assert.match(nav, /href: "\/admin\/searches\/activity", label: "Search Activity"/);
  assert.match(workspace, /id: "searches", label: "Search records"/);
  assert.match(frame, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(searchDetail, /"&environment=" \+ encodeURIComponent\(search\.environment\)/);
});
