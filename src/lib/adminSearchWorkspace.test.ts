import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchWorkspaceHref } from "./adminSearchWorkspace";

const activity = readFileSync("src/app/admin/searches/activity/page.tsx","utf8");
const redirects = readFileSync("src/app/admin/redirects/page.tsx","utf8");
const journeys = readFileSync("src/app/admin/journeys/page.tsx","utf8");
const attribution = readFileSync("src/app/admin/referral-attribution/page.tsx","utf8");
const referralWindow = readFileSync("src/components/admin/ReferralWindowFilter.tsx","utf8");
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
  assert.match(attribution,/ReferralWindowFilter days=\{days\} embedded=\{false\}/);
  assert.match(referralWindow,/action=\{embedded \? "\/admin\/providers" : "\/admin\/referral-attribution"\}/);
  assert.match(referralWindow,/router\.replace\(target, \{ scroll: false \}\)/);
  assert.match(redirects,/name="tab" value="handoffs"/);
  assert.match(journeys,/name="tab" value="journeys"/);
  assert.match(referralWindow,/name="view" value="attribution"/);
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

test("Search Activity filters use one consistent boxed dropdown treatment and explicit Apply", () => {
  const controls = ["Outcome", "Identity", "Provider", "Platform"];
  for (const label of controls) {
    assert.match(activity, new RegExp(`label="${label}"[^>]*appearance="fare"|label="${label}"[^>]*\\n[^>]*appearance="fare"`));
  }
  assert.doesNotMatch(activity, /<ApplicationSourceSelect/);
  assert.doesNotMatch(activity, /autoSubmit/);
  assert.match(activity, /\{ value: "", label: "All platforms" \}/);
  assert.match(activity, /clearFieldNamesOnChange=\{\["userId", "visitorId", "botId"\]\}/);
  assert.match(activity, /name="botId" value=\{one\(raw\.botId\)\}/);
  assert.match(activity, /action="\/admin\/searches\/activity"/);
  assert.match(activity, /bg-\[#004BB8\] px-3/);
  assert.match(activity, /data-testid="search-records-filter-row"/);
  assert.match(activity, /lg:grid-cols-\[repeat\(5,minmax\(0,1fr\)\)_120px\]/);
  assert.match(activity, /sm:grid-cols-2 md:grid-cols-3/);
  assert.equal((activity.match(/truncateLabel/g) || []).length, 4);
  assert.match(activity, /align="end" truncateLabel/);
  assert.match(activity, /name="applicationSource"/);
  // The range input is owned by AdminOperationalDateRangeFields, checked below.
  assert.match(activity, /testId="search-records-date-range"/);
  assert.match(activity, /<AdminOperationalDateRangeFields/);
  assert.match(readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8"), /<SearchMonitorSelect label="Date range" name="range"/);
  assert.match(activity, /data-testid="search-records-products-row"/);
  assert.ok(activity.indexOf('data-testid="search-records-filter-row"') < activity.indexOf('data-testid="search-records-products-row"'));
  assert.match(activity, /name="status"/);
  assert.match(activity, /name="identity"/);
  assert.match(activity, /name="provider"/);
  assert.match(activity, /w-full min-w-0 items-center justify-center whitespace-nowrap/);
  assert.match(activity, /href=\{productHref\(raw, item\.value, range\)\}/);
});

test("Search Activity owns Provider Handoffs navigation, without a misleading Provider reports return link", () => {
  const nav = readFileSync("src/lib/adminNavigation.ts", "utf8");
  assert.match(nav, /href: "\/admin\/redirects", parentHref: "\/admin\/searches\/activity"/);
  assert.doesNotMatch(redirects, /<SearchWorkspaceBackLink href="\/admin\/providers\?view=attribution" label="Provider reports"/);
  assert.match(redirects, /handoffDetailHref\(handoff\.id, handoff\.environment, scopedRaw\)/);
  assert.match(redirects, /handoffPreviousPageHref\(scopedRaw\)/);
});
