import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const list = readFileSync("src/app/admin/journeys/page.tsx", "utf8");
const detail = readFileSync("src/app/admin/journeys/[id]/page.tsx", "utf8");
const dates = readFileSync("src/lib/adminJourneyDateRange.ts", "utf8");
const controls = readFileSync("src/components/admin/JourneyDateRangeFields.tsx", "utf8");

test("journey metrics are scoped to one returned list reporting window", () => {
  assert.match(list, /adminJourneys\.summary\(\{ \.\.\.withoutPagination\(raw\), \.\.\.list\.data\.scope \}\)/);
  assert.match(list, /adminJourneys\.list\(input\)/);
  assert.doesNotMatch(list, /Promise\.all\(\[\s*adminJourneys\.list/);
});
test("headline metrics report recorded funnel stages, not correlation as a journey stage", () => {
  for (const key of ["RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"]) {
    assert.ok(list.includes("summary.data.stages." + key + ".events"));
  }
  assert.match(list, /Only eligible consented journeys are included/);
  assert.doesNotMatch(list, /<AdminMetricCard/);
});
test("detail back link preserves scoped filters, not an untrusted destination", () => {
  assert.match(detail, /<SearchWorkspaceBackLink href=\{returnHref\(raw\)\}/);
  assert.match(detail, /for \(const key of \["range", "from", "to", "environment"/);
  assert.match(detail, /return "\/admin\/journeys"/);
});

test("journey detail is valid JSX and strips view-only range from backend input", () => {
  assert.match(detail, /return \(\s*<>\s*<SearchWorkspaceBackLink/);
  assert.match(detail, /<\/AdminPageShell>\s*<\/>/);
  assert.match(detail, /delete backendRaw\.range; delete backendRaw\.activityReturn;/);
});
test("journey date presets are passed to detail and single-ended historical bounds survive", () => {
  assert.match(list, /p\.set\("range", range\)/);
  assert.match(dates, /if \(one\(raw\.cursor\) \|\| one\(raw\.from\) \|\| one\(raw\.to\)\) return \{\}/);
  assert.match(controls, /value: "custom", label: "Custom dates"/);
});

test("custom dates are editable and preset selection does not submit stale bounds", () => {
  assert.match(controls, /type="datetime-local"/);
  assert.match(controls, /name="from"/);
  assert.match(controls, /name="to"/);
  assert.match(controls, /\{custom \? \(/);
  assert.match(controls, /onValueChange=/);
  assert.match(list, /<JourneyDateRangeFields/);
});

test("equal custom UTC endpoints block native form submission", () => {
  assert.match(controls, /setCustomValidity\(valid \? "" :/);
  assert.match(controls, /offsetUtcDateTime\(from, 1\)/);
  assert.match(controls, /offsetUtcDateTime\(to, -1\)/);
  assert.match(controls, /Date\.parse\(startIso\) < Date\.parse\(endIso\)/);
});
test("detail event pagination retains the display preset without forwarding it to backend", () => {
  assert.match(detail, /key !== "cursor"\) p\.set\(key, value\)/);
  assert.match(detail, /delete backendRaw\.range; delete backendRaw\.activityReturn;/);
});

test("Journeys directory shares Users styling without modifying consent-aware data reads", () => {
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  const datesView = readFileSync("src/components/admin/JourneyDateRangeFields.tsx", "utf8");
  const history = readFileSync("src/components/admin/JourneyEventHistory.tsx", "utf8");
  assert.match(shell, /const visitorJourneysWorkspace = pathname === "\/admin\/journeys"/);
  assert.match(shell, /\|\| visitorJourneysWorkspace \|\| searchesWorkspace/);
  assert.match(list, /bg-white text-\[#020617\]/);
  assert.match(list, /aria-label="Visitor journeys directory"/);
  assert.match(list, /border-b border-\[#D8E1EC\] bg-white/);
  assert.match(list, /name="provider" type="search"/);
  assert.match(list, /clearFieldNamesOnChange=\{\["userId", "visitorId"\]\}/);
  assert.match(list, /adminJourneys\.list\(input\)/);
  assert.match(list, /Only eligible consented journeys are included/);
  assert.match(datesView, /<AdminDirectorySelect label="Date range"/);
  assert.match(datesView, /setCustomValidity\(valid \? "" :/);
  assert.match(history, /aria-label="Journey event history"/);
  assert.match(history, /events\.map\(event =>/);
});

test("Journey Details shares clean directory layout and preserves event chronology", () => {
  const history = readFileSync("src/components/admin/JourneyEventHistory.tsx", "utf8");
  assert.match(detail, /className="min-w-0 space-y-6 bg-white py-3/);
  assert.match(detail, /<JourneyEventHistory events=\{result\.data\.events\} \/>/);
  assert.match(detail, /<SearchWorkspaceBackLink href=\{returnHref\(raw\)\}/);
  assert.match(detail, /result\.data\.nextCursor/);
  assert.match(history, /key=\{event\.id\}/);
  assert.match(history, /dateTime=\{event\.createdAt\}/);
  assert.match(history, /event\.handoff\.searchCorrelation === "exact"/);
});

test("Visitor Journeys keeps all eight records fields and the Action link visible without a 1060px table", () => {
  const users = readFileSync("src/components/admin/AdminIdentityTable.tsx", "utf8");
  const responsiveCss = readFileSync("src/app/globals.css", "utf8");
  assert.match(users, /admin-responsive-records/);
  assert.match(list, /admin-responsive-records min-w-0 max-w-full overflow-x-auto/);
  assert.match(list, /<table className="w-full min-w-0 table-fixed text-left/);
  assert.doesNotMatch(list, /min-w-\[1060px\]/);
  for (const name of ["Last activity", "Identity", "Products", "Providers", "Searches", "Observed stages", "Events", "Action"]) {
    assert.ok(list.includes(`data-label="${name}"`), `Journey rows need responsive ${name} data`);
  }
  assert.match(list, /href=\{detailHref\(journey\.id, list\.data\.scope, range\)\}/);
  assert.match(list, /aria-label=\{`View activity for/);
  assert.match(list, /View activity/);
  assert.match(list, /CopyIdentityId id=\{identityId\}/);
  assert.match(responsiveCss, /@container \(max-width: 800px\)/);
});
