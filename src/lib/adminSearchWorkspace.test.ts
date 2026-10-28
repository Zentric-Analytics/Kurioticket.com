import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchWorkspaceHref, searchWorkspaceTab } from "./adminSearchWorkspace";

const activity = readFileSync("src/app/admin/searches/activity/page.tsx","utf8");
const redirects = readFileSync("src/app/admin/redirects/page.tsx","utf8");
const journeys = readFileSync("src/app/admin/journeys/page.tsx","utf8");
const attribution = readFileSync("src/app/admin/referral-attribution/page.tsx","utf8");
const searchDetail = readFileSync("src/app/admin/searches/[id]/page.tsx","utf8");

test("Search Activity retains independent search monitoring and redirects old section links", () => {
  assert.match(activity, /redirect\(target/);
  assert.doesNotMatch(activity, /<SearchWorkspaceTabs active=/);
  assert.doesNotMatch(activity, /AdminJourneysPage\(\{/);
});
test("tab destinations cannot carry incompatible backend filter keys", () => {
  assert.equal(searchWorkspaceHref("handoffs",{status:"FAILED",product:"HOTEL",environment:"staging"}),"/admin/searches/activity?tab=handoffs&environment=staging&product=HOTEL");
  assert.equal(searchWorkspaceHref("attribution",{days:"30",userId:"account-001",stage:"OFFER_SELECTED"}),"/admin/searches/activity?tab=attribution&days=30");
  assert.equal(searchWorkspaceHref("searches", {stage:"OFFER_SELECTED",identity:"guest"}),"/admin/searches/activity?identity=guest");
});
test("legacy section routes retain their own safe filter contracts", () => {
  assert.match(journeys,/action=\{embedded \? "\/admin\/searches\/activity"/);
  assert.match(redirects,/action=\{embedded \? "\/admin\/searches\/activity"/);
  assert.match(attribution,/action=\{embedded \? "\/admin\/providers"/);
  assert.match(redirects,/name="tab" value="handoffs"/);
  assert.match(journeys,/name="tab" value="journeys"/);
  assert.match(attribution,/name="view" value="attribution"/);
  assert.doesNotMatch(searchDetail,/No verified identity link is available/);
  assert.doesNotMatch(searchDetail,/These links do not imply that another record belongs to this exact search/);
});

test("Search Activity has one navigation label, a Search records tab, and an accessible heading", () => {
  const nav = readFileSync("src/lib/adminNavigation.ts","utf8");
  const workspace = readFileSync("src/lib/adminSearchWorkspace.ts","utf8");
  const frame = readFileSync("src/components/admin/SearchWorkspacePanelFrame.tsx","utf8");
  assert.match(nav, /href: "\/admin\/searches\/activity", label: "Search Activity"/);
  assert.match(workspace, /id: "searches", label: "Search records"/);
  assert.match(frame, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.doesNotMatch(searchDetail, /Related activity/);
});

test("registered account searches link to journeys and filter forms retain scoped identity", () => {
  assert.doesNotMatch(searchDetail, /tab=journeys/);
  assert.match(journeys, /name="userId" value=\{one\(raw\.userId\)\}/);
  assert.match(journeys, /name="visitorId" value=\{one\(raw\.visitorId\)\}/);
  assert.match(redirects, /name="userId" value=\{one\(raw\.userId\)\}/);
  assert.match(redirects, /name="visitorId" value=\{one\(raw\.visitorId\)\}/);
});

test("changing identity clears stale deep-linked customer IDs without dropping them on other filter changes", () => {
  for (const source of [journeys, redirects]) {
    assert.match(source, /clearFieldNamesOnChange=\{\["userId", "visitorId"\]\}/);
    assert.match(source, /name="identity"/);
    assert.match(source, /name="userId" value=\{one\(raw\.userId\)\}/);
    assert.match(source, /name="visitorId" value=\{one\(raw\.visitorId\)\}/);
  }
});
