import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { journeyWindow } from "./adminJourneyDateRange";

const list = readFileSync("src/app/admin/journeys/page.tsx", "utf8");
const detail = readFileSync("src/app/admin/journeys/[id]/page.tsx", "utf8");
const dates = readFileSync("src/lib/adminJourneyDateRange.ts", "utf8");
const controls = readFileSync("src/components/admin/JourneyDateRangeFields.tsx", "utf8");
const sharedControls = readFileSync("src/components/admin/AdminOperationalDateRangeFields.tsx", "utf8");

test("journey metrics are scoped to one returned list reporting window", () => {
  assert.match(list, /adminJourneys\.summary\(\{ \.\.\.withoutPagination\(raw\), \.\.\.list\.data\.scope, environment \}, calendarTimeZone\)/);
  assert.match(list, /adminJourneys\.list\(input, calendarTimeZone\)/);
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
  const from = "2026-11-19T13:24:11.357Z";
  assert.deepEqual(journeyWindow({ from }, new Date("2026-11-25T12:00:00Z"), "Asia/Dubai"), { from });
  assert.match(controls, /<AdminOperationalDateRangeFields/);
  assert.match(sharedControls, /ADMIN_REPORTING_RANGE_OPTIONS/);
});

test("custom dates are editable and preset selection does not submit stale bounds", () => {
  assert.match(sharedControls, /<AdminCalendarInput mode=\{clock \? "datetime-local"/);
  assert.match(sharedControls, /name="from"/);
  assert.match(sharedControls, /name="to"/);
  assert.match(sharedControls, /\{range === "custom" \? \(/);
  assert.match(sharedControls, /onValueChange=/);
  assert.match(list, /<JourneyDateRangeFields/);
});

test("equal custom clock endpoints block native form submission", () => {
  assert.match(sharedControls, /startMs < endMs/);
  assert.match(sharedControls, /form\.addEventListener\("submit", blockInvalidRange\)/);
});
test("detail event pagination retains the display preset without forwarding it to backend", () => {
  assert.match(detail, /key !== "cursor"\) p\.set\(key, value\)/);
  assert.match(detail, /delete backendRaw\.range; delete backendRaw\.activityReturn;/);
});

test("Journeys directory shares Users styling without modifying consent-aware data reads", () => {
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  const history = readFileSync("src/components/admin/JourneyEventHistory.tsx", "utf8");
  assert.match(shell, /const visitorJourneysWorkspace = pathname === "\/admin\/journeys"/);
  assert.match(shell, /\|\| visitorJourneysWorkspace \|\| searchesWorkspace/);
  assert.match(list, /bg-white text-\[#020617\]/);
  assert.match(list, /aria-label="Visitor journeys directory"/);
  assert.match(list, /border-b border-\[#D8E1EC\] bg-white/);
  assert.match(list, /<SearchMonitorSelect label="Provider" name="provider" appearance="fare"/);
  assert.match(list, /buildAdminSearchProviderOptions\(getProviderIntegrationStatuses\(\), one\(raw\.provider\) \|\| null\)/);
  assert.doesNotMatch(list, /name="environment" label="Environment"|name="provider" type="search"/);
  assert.match(list, /clearFieldNamesOnChange=\{\["userId", "visitorId"\]\}/);
  assert.match(list, /adminJourneys\.list\(input, calendarTimeZone\)/);
  assert.match(list, /Only eligible consented journeys are included/);
  assert.match(sharedControls, /<SearchMonitorSelect label="Date range"/);
  assert.match(controls, /align="end"/);
  assert.match(sharedControls, /mode=\{clock \? "datetime-local"/);
  assert.match(history, /aria-label="Journey event history"/);
  assert.match(history, /events\.map\(\(event, index\) =>/);
  assert.match(history, /Step \{index \+ 1\}/);
});

test("Visitor Journeys defaults to local Today, keeps responsive filters on one desktop row and isolates environment", () => {
  assert.match(dates, /return one\(raw\.from\) \|\| one\(raw\.to\) \|\| one\(raw\.cursor\) \? "custom" : "today"/);
  assert.match(dates, /JOURNEY_ALL_TIME_FROM/);
  assert.match(list, /getPublicEnvironment\(\)/);
  assert.match(list, /\.\.\.withoutPagination\(raw\), \.\.\.fixed, environment/);
  assert.match(list, /<JourneyDateRangeFields initialRange=\{range\}/);
  assert.match(list, /data-testid="journey-filters-toolbar"/);
  assert.ok(list.indexOf('data-testid="journey-filters-toolbar"') < list.indexOf('<JourneyDateRangeFields'));
  assert.match(controls, /testId="journey-date-range"/);
  assert.match(controls, /customTestId="journey-custom-date-fields"/);
  assert.match(sharedControls, /order-last col-span-full/);
  assert.match(list, /grid w-full min-w-0 grid-cols-1 items-center gap-2/);
  assert.match(list, /lg:grid-cols-\[repeat\(5,minmax\(0,1fr\)\)_120px\]/);
  assert.match(list, /h-10 w-full min-w-0/);
  assert.match(list, /sm:grid-cols-2 md:grid-cols-3/);
  assert.doesNotMatch(list, /xl:flex-nowrap|sm:col-span-2|w-full items-center justify-center whitespace-nowrap rounded-lg bg-\[#004BB8\]/);
  assert.match(list, /align="end" truncateLabel/);
  assert.match(list, /name="product" appearance="fare"/);
  assert.match(list, /name="identity"/);
  assert.match(list, /name="stage" appearance="fare"/);
  assert.match(list, /name="provider" appearance="fare"/);
  assert.match(list, /Apply filters/);
  assert.match(list, /for \(const key of \["identity","product","stage","provider"/);
  assert.doesNotMatch(list, /<AdminDirectorySelect|name="environment" label="Environment"|type="search" defaultValue=\{one\(raw\.provider\)\}/);
});

test("Journey Details shares clean directory layout and preserves event chronology", () => {
  const history = readFileSync("src/components/admin/JourneyEventHistory.tsx", "utf8");
  assert.match(detail, /className="min-w-0 space-y-6 bg-white py-3/);
  assert.match(detail, /<JourneyEventHistory events=\{result\.data\.events\} timeZone=\{timeZone\}/);
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
  assert.match(list, /admin-responsive-records admin-journey-records min-w-0 max-w-full/);
  assert.doesNotMatch(list, /admin-responsive-records min-w-0 max-w-full overflow-x-auto/);
  assert.match(list, /<table className="w-full min-w-0 table-fixed text-left/);
  assert.doesNotMatch(list, /min-w-\[1060px\]/);
  for (const name of ["Last activity", "Identity", "Products", "Providers", "Searches", "Observed stages", "Events", "Action"]) {
    assert.ok(list.includes(`data-label="${name}"`), `Journey rows need responsive ${name} data`);
  }
  assert.match(list, /href=\{detailHref\(journey\.id, list\.data\.scope, range, calendarDates, partialLastDay\)\}/);
  assert.match(list, /aria-label=\{`View activity for/);
  assert.match(list, /View activity/);
  assert.match(list, /CopyIdentityId id=\{identityId\}/);
  assert.match(responsiveCss, /@container \(max-width: 800px\)/);
});

test("Visitor Journeys SEARCHES heading is complete, not broken or clipped", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(list, /<col className="w-\[10%\]" \/><col className="w-\[22%\]"/);
  assert.match(list, /label === "Searches" \? " whitespace-nowrap" : ""/);
  assert.doesNotMatch(list, /whitespace-nowrap overflow-hidden text-ellipsis" : ""/);
  assert.match(css, /\.admin-journey-records thead th/);
  assert.ok(css.includes('.admin-journey-records td[data-label="Searches"]'));
  assert.match(list, /data-label="Searches"/);
  assert.doesNotMatch(list, /admin-journey-records[^"]*overflow-x-auto/);
});
