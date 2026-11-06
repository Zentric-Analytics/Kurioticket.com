import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("src/services/homepageFareSnapshotService.ts", "utf8");
const component = readFileSync("src/components/admin/HomepageFaresRefreshCard.tsx", "utf8");
const adminRefresh = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");
const cronRefresh = readFileSync("src/app/api/internal/homepage-fares/refresh/route.ts", "utf8");
const lockService = readFileSync("src/services/homepageFareRefreshLock.ts", "utf8");

test("homepage fare status distinguishes loading, telemetry outage, and real missing fares", () => {
  assert.match(service, /dataAvailable: boolean/);
  assert.match(service, /let dataAvailable = Boolean\(db\)/);
  assert.match(service, /dataAvailable = false/);
  assert.match(component, /Loading status…/);
  assert.match(component, /initialStatusLoading/);
  assert.match(component, /telemetryUnavailable/);
  assert.match(component, /Telemetry unavailable/);
  assert.match(component, /Snapshot data could not be read; coverage counts are hidden/);
  assert.match(component, /operationsAvailable=\{statusPayload\.dataAvailable\}/);
});

test("homepage fare reload preserves snapshot-derived failure and unavailable counts", () => {
  assert.match(service, /failedByMarket,/);
  assert.match(service, /unavailableByMarket,/);
  assert.doesNotMatch(service, /failedByMarket: emptyMarketCounts,[\s\S]*unavailableByMarket: emptyMarketCounts/);
});

test("homepage fare operations does not present unknown executor history as zero", () => {
  assert.match(component, /Last manual run in this tab/);
  assert.match(component, /No manual refresh result in this tab/);
  assert.match(component, /value=\{refreshState\.counts\.providerCalls\}/);
  assert.doesNotMatch(component, /label="Provider calls used"/);
});

test("homepage fare cron copy keeps the primary operator view concise while retaining advanced verification", () => {
  assert.match(component, /Cron/);
  assert.match(component, /Configured · cadence missing|return "Configured"/);
  assert.doesNotMatch(component, /<span>Scheduler verification not observable from this service<\/span>/);
  assert.match(component, /MetricCard label="Scheduler cadence"/);
  assert.match(component, /MetricCard label="Scheduler verification"/);
  assert.match(component, /Not observable from this service/);
  assert.doesNotMatch(component, /label="Cron status"/);
});

test("homepage fare snapshot timestamp is not mislabeled as a completed refresh run", () => {
  assert.match(component, /Latest saved snapshot/);
  assert.match(component, /Includes snapshots saved by manual or scheduled refreshes/);
  assert.doesNotMatch(component, /label="Last refresh time"/);
});

test("all homepage fare refresh callers share the distributed lock", () => {
  assert.match(service, /withHomepageFareRefreshLock\(\(\) => runPhase3AHomepageFareRefresh\(input\)\)/);
  assert.match(lockService, /POSTGRES_URL_NON_POOLING/);
  assert.match(lockService, /pg_try_advisory_lock/);
  assert.match(lockService, /pg_advisory_unlock/);
  assert.doesNotMatch(cronRefresh, /refreshInProgress/);
  assert.match(adminRefresh, /HomepageFareRefreshInProgressError/);
  assert.match(cronRefresh, /HomepageFareRefreshInProgressError/);
  assert.match(adminRefresh, /status: 409/);
  assert.match(cronRefresh, /status: 409/);
});

test("homepage fare refresh refuses to run without an authoritative database", () => {
  assert.match(lockService, /Homepage fare refresh requires an available database/);
  assert.match(service, /error instanceof DatabaseUnavailableError/);
  assert.match(service, /Database is unavailable or misconfigured/);
});


test("homepage fare operations follows the provider-style operator hierarchy", () => {
  const readiness = component.indexOf('id="homepage-fare-readiness-heading"');
  const refresh = component.indexOf("<RefreshCronPanel");
  const markets = component.indexOf("<MarketReadinessDashboard");
  assert.ok(readiness >= 0 && refresh > readiness && markets > refresh);
  // The obsolete bottom diagnostics shortcut was removed; deep links are in the inspector tabs.
  assert.doesNotMatch(component, /href="\/admin\/homepage-fares\/diagnostics"/);
  assert.match(component, /view === "operations"/);
  assert.match(component, /title="Refresh operations"/);
  assert.match(component, /title="Market coverage"/);
  assert.match(component, /<MarketRouteInspector/);
  assert.doesNotMatch(component, /<DiagnosticsPanel|title="Markets requiring attention"|title="Public market coverage"/);
});

test("homepage fare operations removes duplicated market and fallback presentations", () => {
  assert.doesNotMatch(component, /Homepage fare readiness dashboard/);
  assert.doesNotMatch(component, /Global readiness at a glance/);
  assert.doesNotMatch(component, /Grouped Market Route Inspector/);
  assert.doesNotMatch(component, /Fallback-only coverage pools/);
  assert.doesNotMatch(component, /Fallback-only debugging pools/);
  assert.doesNotMatch(component, /Raw debug \/ View All details/);
  assert.doesNotMatch(component, /function MarketRouteGroupCard/);
  assert.doesNotMatch(component, /function FallbackPoolsSection/);
  assert.doesNotMatch(component, /function RawDebugDetails/);
});

test("homepage fare readiness keeps only core customer-facing summary metrics", () => {
  assert.match(component, /label="Fresh fares"/);
  assert.match(component, /label="Last-known-good"/);
  assert.match(component, /label="Missing routes"/);
  assert.match(component, /label="Failed \/ unavailable"/);
  assert.match(component, /label="Markets needing attention"/);
  assert.doesNotMatch(component, /SummaryMetricCard label="Provider calls \(manual run\)"/);
  assert.doesNotMatch(component, /SummaryMetricCard label="Cron credential"/);
  assert.match(component, /CompactDetail label="Provider calls" value=\{refreshState\.counts\.providerCalls\}/);
  assert.match(component, /formatCronStatus\(statusPayload\)/);
});

test("fare diagnostics uses four standalone sections rather than redundant wrapper headings", () => {
  const page = readFileSync("src/app/admin/homepage-fares/diagnostics/page.tsx", "utf8");
  const diagnostics = component.slice(component.indexOf("function FareDiagnosticsSections("), component.indexOf("function MarketRouteInspector("));
  assert.match(page, /<h1 className="sr-only">Fare Diagnostics<\/h1>/);
  assert.match(page, /<HomepageFareSubpageNavigation active="diagnostics"/);
  for (const heading of ["Fallback coverage pools", "Refresh execution", "Public fare eligibility", "Scheduling and market targets"]) {
    assert.ok(diagnostics.includes(">" + heading + "</h2>"), "Missing heading " + heading);
  }
  assert.equal((diagnostics.match(/<section aria-labelledby=/g) || []).length, 4);
  assert.doesNotMatch(diagnostics, /Advanced diagnostics|Executor details|Snapshot health and the latest logged manual refresh are shown separately/);
  assert.match(diagnostics, /Configured routes/);
  assert.match(diagnostics, /Visible gaps attempted/);
  assert.doesNotMatch(diagnostics, /<details|<summary/);
});

test("manual fare refresh and read-only status check have distinct labels and data sources", () => {
  assert.match(component, /Run fare refresh/);
  assert.match(component, /Check latest status/);
  assert.match(component, /Run fare refresh requests new fares from providers and saves the results/);
  assert.match(component, /Check latest status only reads saved records/);
  assert.match(component, /onClick=\{onRefresh\}/);
  assert.match(component, /onClick=\{onReload\}/);
  assert.match(component, /fetch\("\/api\/admin\/homepage-fares\/refresh", \{/);
  assert.match(component, /method: "POST"/);
  assert.match(component, /fetch\("\/api\/admin\/homepage-fares\/status", \{/);
  assert.match(component, /await loadStatus\(\)/);
  assert.match(component, /aria-label="Saved fare status"/);
  assert.match(component, /aria-label="Last manual fare refresh"/);
  assert.match(component, /No manual refresh result in this tab/);
  assert.match(component, /Checking status does not start a run or change these results/);
  assert.doesNotMatch(component, /"Reload status"|"Refresh homepage fares"/);
  assert.match(adminRefresh, /writeAdminAuditLog/);
});

test("homepage fare refresh operations use the same compact fact layout as Providers", () => {
  assert.match(component, /className="mt-4 flex flex-wrap items-center gap-2\.5"/);
  assert.match(component, /grid gap-5 border-t border-\[#E7ECF5\] pt-4 lg:grid-cols-2/);
  assert.match(component, /border-t border-\[#E7ECF5\] pt-3/);
  assert.match(component, /Latest saved snapshot/);
  assert.match(component, /Last manual run in this tab/);
  assert.match(component, /Provider calls/);
  assert.match(component, /Stopped reason/);
  assert.match(component, /Scheduler setup/);
  assert.match(component, /Manual run outcomes/);
  assert.doesNotMatch(component, /rounded-xl border border-border bg-slate-50\/70 p-3/);
});

test("public market coverage uses the compact Providers table treatment", () => {
  assert.match(component, /lg:grid-cols-\[minmax\(150px,1\.5fr\)_70px_85px_72px_minmax\(120px,1fr\)_minmax\(240px,auto\)\]/);
  assert.match(component, /border-y border-\[#D8E1EC\]/);
  assert.match(component, />Market<\/span>/);
  assert.match(component, />Popular<\/span>/);
  assert.match(component, />Discovery<\/span>/);
  assert.match(component, />Backup<\/span>/);
  assert.match(component, /href=\{onInspectMarket\(market\.marketCode\)\}/);
  assert.match(component, />\s*Inspect routes\s*<\/Link>/);
});

test("Inspect routes navigates reliably even when selecting the same market again", () => {
  const routesPage = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  assert.match(component, /function homepageFareRoutesHref\(marketCode: string\)/);
  assert.match(component, /\/admin\/homepage-fares\/routes\?market=/);
  assert.match(component, /href=\{onInspectMarket\(market\.marketCode\)\}/);
  assert.match(component, /href=\{onInspectMarket\(pool\.marketCode\)\}/);
  assert.match(routesPage, /view="routes" initialMarket=\{initialMarket\}/);
  assert.match(routesPage, /<HomepageFareSubpageNavigation active="routes"/);
  assert.doesNotMatch(component, /scrollIntoView|routeInspectorRef|inspectMarketRoutes/);
});

test("dropdown and status selection update results without scrolling the page", () => {
  assert.match(component, /onValueChange=\{onSelectMarket\}/);
  assert.match(component, /onFilterChange\(next as AdminHomepageFareRouteGroupFilter\)/);
  assert.match(component, /onSelectMarket=\{selectRouteScope\}/);
  assert.match(component, /onFilterChange=\{selectRouteFilter\}/);
  assert.doesNotMatch(component, /scrollIntoView|window\.scrollTo/);
});

test("route inspector renders every filtered route without pagination or fixed page height", () => {
  const details = component.slice(component.indexOf("function SelectedRouteDetails("), component.indexOf("function MarketMiniMetric("));
  const table = component.slice(component.indexOf("function RouteDetailsTable("), component.indexOf("function MarketGroupStatusBadge("));
  assert.match(details, /routes=\{group\.routes\}/);
  assert.match(details, /const totalRoutes = group\.routes\.length/);
  assert.doesNotMatch(details, /Showing |<nav aria-label="Route pages"|Page \{|paginateAdminHomepageFareRoutes/);
  assert.doesNotMatch(component, /routePage|setRoutePage|keepPageHeight|onPreviousPage|onNextPage/);
  assert.doesNotMatch(table, /min-h-\[740px\]|overflow-x-auto|min-w-\[1275px\]/);
  assert.match(table, /table-fixed/);
  assert.match(table, /lg:block/);
  assert.match(table, /lg:hidden/);
});

test("route inspector uses one saved fare and responsive table/cards without horizontal scroll", () => {
  const table = component.slice(component.indexOf("function RouteDetailsTable("), component.indexOf("function MarketGroupStatusBadge("));
  assert.match(table, /<th scope="col" className="w-\[12%\] px-2 py-3 2xl:w-\[8%\]">Saved fare<\/th>/);
  assert.match(table, /\{formatRoutePrice\(route\)\}/);
  assert.doesNotMatch(table, /Provider native|Display price|formatProviderNativePrice|overflow-x-auto|min-w-\[1275px\]/);
  assert.match(table, /<table className="w-full table-fixed/);
  assert.match(table, /aria-label="Route results"/);
  assert.match(table, /2xl:table-cell/);
  assert.match(table, /2xl:hidden/);
  assert.match(table, /lg:hidden/);
  assert.equal((table.match(/<th scope="col"/g) || []).length, 11);
  assert.equal((table.match(/<td className=/g) || []).length, 11);
  assert.doesNotMatch(component, /providerNativePrice|providerNativeCurrency|function formatProviderNativePrice/);
  assert.match(component, /last_known_good: "Last-known-good"/);
  assert.match(component, /\{STATUS_BADGE_LABELS\[status\]\}/);
  assert.match(component, /whitespace-nowrap rounded-full/);
  assert.match(service, /providerNativePrice: price/);
  assert.match(service, /providerNativeCurrency: snapshot\.currency/);
});

test("route inspector keeps the market badge and full responsive route details", () => {
  const details = component.slice(component.indexOf("function SelectedRouteDetails("), component.indexOf("function MarketMiniMetric("));
  const table = component.slice(component.indexOf("function RouteDetailsTable("), component.indexOf("function MarketGroupStatusBadge("));
  assert.ok(details.indexOf("<MarketGroupStatusBadge") < details.indexOf("<RouteDetailsTable"));
  assert.match(details, /routes=\{group\.routes\}/);
  assert.doesNotMatch(details, /Showing |Route pages|Previous|Next/);
  assert.match(table, /\{route\.origin\}/);
  assert.match(table, /\{route\.destination\}/);
  assert.match(table, /\{route\.provider \?\? "—"\}/);
  assert.match(table, /\{route\.replacementCandidateUsed\}/);
  assert.match(table, /formatSnapshotTime\(route\.searchedAt\)/);
  assert.match(table, /formatDateTime\(route\.expiresAt\)/);
  assert.match(component, /status === "Fallback only"/);
});

test("single Route inspector heading is supplied by page, not duplicated above Market", () => {
  const page = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  const inspector = component.slice(component.indexOf("function MarketRouteInspector("), component.indexOf("function SelectedRouteDetails("));
  assert.match(page, /<h1 className="sr-only">Route inspector<\/h1>/);
  assert.match(inspector, /<section aria-label="Route inspection filters and results"/);
  assert.doesNotMatch(inspector, /<DashboardSection|title="Route inspector"|>Route inspector<\/h3>/);
  assert.match(inspector, /label="Market"/);
  assert.match(inspector, /label="Status"/);
});

test("route inspector defaults to All with seven distinct status options", () => {
  assert.equal((component.match(/<SearchMonitorSelect/g) || []).length, 2);
  assert.match(component, /initialMarket = ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(component, /useState<string>\(\s*initialMarket === ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(component, /value: ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE, label: "All"/);
  assert.doesNotMatch(component, /value: "", label: "Select market"/);
  assert.match(component, /value=\{selectedRouteScope\}/);
  assert.match(component, /value=\{filter\}/);
  assert.match(component, /onFilterChange\(next as AdminHomepageFareRouteGroupFilter\)/);
  const options = component.slice(component.indexOf("const ROUTE_FILTERS:"), component.indexOf("function SummaryMetricCard"));
  const expected = [
    ["all", "All statuses"],
    ["fresh", "Fresh"],
    ["last_known_good", "Last-known-good"],
    ["stale", "Expired"],
    ["missing", "Missing"],
    ["failed", "Failed"],
    ["unavailable", "Unavailable"],
  ];
  for (const [key, label] of expected) {
    assert.ok(options.includes(`{ key: "${key}", label: "${label}" }`));
  }
  assert.equal((options.match(/\{ key: "/g) || []).length, 7);
  assert.doesNotMatch(options, /\{ key: "(ready|underfilled)"/);
  assert.doesNotMatch(options, /label: "(Ready|Underfilled|Stale|All)"/);
  assert.doesNotMatch(component, /aria-label="Route status filters"/);
});

test("All routes summary shows the current status and does not display fallback-only badge", () => {
  assert.match(component, /filterLabel=\{ROUTE_FILTERS\.find\(\(option\) => option\.key === filter\)\?\.label \?\? "All statuses"\}/);
  assert.doesNotMatch(component, /\{" · Status: "\}\{filterLabel\}/);
  assert.doesNotMatch(component, /Across all markets|Showing \{page\.start\}/);
  assert.match(component, /!isViewAll \? <MarketGroupStatusBadge status=\{group\.status\} \/> : null/);
  assert.match(component, /No routes match the selected status/);
  assert.doesNotMatch(component, /Debug view across all markets/);
});

test("market coverage combines the affected market diagnostics with the public table", () => {
  assert.match(component, /title="Market coverage"/);
  assert.match(component, /<ul aria-label="Public market coverage"/);
  assert.match(component, /markets\.map\(\(market\) =>/);
  assert.match(component, /aria-expanded=\{showDetails\}/);
  assert.match(component, /Coverage details/);
  assert.match(component, /\{market\.popularVisibleFresh\}\/\{market\.popularVisibleTarget\}/);
  assert.match(component, /\{market\.discoveryVisibleFresh\}\/\{market\.discoveryVisibleTarget\}/);
  assert.match(component, /\{market\.backupFresh\}\/\{market\.backupTarget\}/);
  assert.match(component, /<CompactDetail label="Next run" value=\{nextRunNeeded \? "Needed" : "Not required"\}/);
  assert.match(component, /formatUnderfillCause\(nextRunCause\)/);
  assert.match(component, /label="Current gaps"/);
  assert.match(component, /href=\{onInspectMarket\(market\.marketCode\)\}/);
  assert.doesNotMatch(component, /outsidePublicCount|Review fallback diagnostics|View fare diagnostics/);
  assert.doesNotMatch(component, /function DiagnosticsPanel|title="Markets requiring attention"/);
});

test("homepage fare status returns snapshot-derived next-run metadata before a manual refresh", () => {
  assert.match(service, /marketsNeedingAnotherRun: HomepageFareMarketNextRunNeed\[\]/);
  assert.match(service, /underfillCauseByMarket: Record<string, HomepageFareUnderfillCause>/);
  assert.match(service, /buildHomepageFareStatusUnderfillMetadata\(marketTargets\)/);
  assert.match(service, /needed: !target\.targetMet/);
  assert.match(service, /target\.targetMet \? "none" : "underfilled"/);
  assert.match(component, /latestCounts\?\.marketsNeedingAnotherRun \?\? statusPayload\.marketsNeedingAnotherRun/);
});

test("homepage fare global readiness excludes fallback-only pools from public readiness", () => {
  assert.match(service, /target\.marketVisibility === "country"/);
  assert.match(service, /target\.popularVisibleTarget \+ target\.discoveryVisibleTarget > 0/);
  assert.match(service, /Some public markets have usable fares; coverage is incomplete/);
  assert.doesNotMatch(service, /At least one market has fresh provider-backed homepage fares/);
});

test("homepage fare readiness cannot be promoted by fallback-route freshness alone", () => {
  assert.doesNotMatch(service, /globalReadinessStatus === "partial" \|\| visibleFresh > 0/);
  assert.match(service, /if \(globalReadinessStatus === "partial"\)/);
});

test("underfilled diagnostics never default missing next-run metadata to not required", () => {
  assert.match(component, /const nextRunNeeded = nextRun \? nextRun\.needed : !market\.targetMet/);
  assert.match(component, /label="Next run" value=\{nextRunNeeded \? "Needed" : "Not required"\}/);
  assert.match(component, /nextRunCause && nextRunCause !== "underfilled" \? formatUnderfillCause\(nextRunCause\) : formatMarketStatus\(market\.status\)/);
});

test("homepage fare diagnostics keep concise coverage summaries with action-oriented next-run details", () => {
  assert.match(component, /\{market\.popularVisibleFresh\}\/\{market\.popularVisibleTarget\}/);
  assert.match(component, /\{market\.discoveryVisibleFresh\}\/\{market\.discoveryVisibleTarget\}/);
  assert.match(component, /\{market\.backupFresh\}\/\{market\.backupTarget\}/);
  assert.doesNotMatch(component, /\{market\.underfillReason \? <span className="block text-amber">\{market\.underfillReason\}<\/span> : null\}/);
  assert.match(component, /label="Next run"/);
  assert.match(component, /formatUnderfillCause\(nextRunCause\)/);
  assert.match(component, /"Not required"/);
});

test("fare diagnostics differentiate manual refresh execution from snapshot eligibility", () => {
  const diagnostics = component.slice(component.indexOf("function FareDiagnosticsSections("), component.indexOf("function MarketRouteInspector("));
  assert.match(diagnostics, /xl:grid-cols-4/);
  assert.match(diagnostics, /label="Stopped reason"/);
  assert.match(diagnostics, /label="Provider calls \/ limit"/);
  assert.match(diagnostics, /label="Route attempts \/ limit"/);
  assert.match(diagnostics, /Latest logged manual refresh:/);
  assert.match(diagnostics, /label="Markets targeted"/);
  assert.doesNotMatch(diagnostics, /label="Provider calls \/ limit \(last run\)"/);
  assert.match(diagnostics, /MetricCard label="Candidate pool failed"/);
  assert.match(diagnostics, /MetricCard label="Fresh eligible snapshots"/);
  assert.match(diagnostics, /MetricCard label="Last-known-good eligible snapshots"/);
  assert.doesNotMatch(diagnostics, /MetricCard label="Fresh used publicly"|MetricCard label="LKG used publicly"/);
});

test("route inspector empty state stays compact", () => {
  assert.match(component, /No route group is available for this market\. Choose All or another market\./);
  assert.match(component, /mt-3 border-b border-\[#E7ECF5\] py-3 text-\[12px\]/);
  assert.doesNotMatch(component, /Route rows stay hidden until a market context is selected/);
  assert.doesNotMatch(component, /mt-5 rounded-2xl border border-dashed border-slate-300 bg-white\/55 p-6 text-center/);
});

test("homepage fare production view removes redundant explanatory copy", () => {
  const page = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
  assert.doesNotMatch(page, /Monitor and refresh provider-backed homepage fare coverage/);
  assert.doesNotMatch(component, /Customer-facing homepage fare health across public markets/);
  assert.doesNotMatch(component, /Refresh provider-backed homepage fares or reload the current snapshot status/);
  assert.doesNotMatch(component, /Customer-facing country markets and their homepage coverage targets/);
  assert.doesNotMatch(component, /Coverage gaps and executor signals for public markets that need attention/);
  assert.doesNotMatch(component, /Select a market and status to inspect individual homepage fare routes/);
});

test("homepage fare primary market health suppresses repeated zero-value copy", () => {
  assert.match(component, /market\.freshCount \?\? 0\) > 0/);
  assert.match(component, /market\.missingCount \?\? 0\) > 0/);
  assert.match(component, /market\.failed > 0/);
  assert.match(component, /\.filter\(Boolean\)\.join\(" · "\) \|\| "No issues"/);
  assert.doesNotMatch(component, /Fresh \{market\.freshCount \?\? 0\} · Missing \{market\.missingCount \?\? 0\} · Failed \{market\.failed\}/);
});

test("homepage fares uses the same flat section language as Providers", () => {
  assert.match(component, /className="min-w-0 bg-white text-\[#020617\]"/);
  assert.match(component, /className="border-b border-\[#D8E1EC\] pb-5 pt-5"/);
  assert.match(component, /text-\[15px\] font-semibold text-\[#020617\]/);
  assert.match(component, /focus-visible:outline-\[#004BB8\]/);
  assert.match(component, /aria-controls=\{detailsId\}/);
  assert.doesNotMatch(component, /rounded-2xl border border-border bg-white p-3\.5 shadow-sm/);
  assert.doesNotMatch(component, /Card className=/);
});

test("homepage fare readiness copy stays short and state-focused", () => {
  assert.match(service, /message: "All public markets meet homepage fare targets\."/);
  assert.match(service, /message: "Some public markets have usable fares; coverage is incomplete\."/);
  assert.match(service, /message: "No fresh provider-backed fares available\."/);
});

test("homepage fare operator warnings remain concise but truthful", () => {
  assert.match(component, /Telemetry unavailable\. Snapshot data could not be read; coverage counts are hidden\./);
  assert.match(component, /Manual refresh unavailable while the snapshot store is offline\./);
  assert.match(component, /Cron credential not configured\./);
  assert.match(component, /Configured · cadence missing/);
  assert.doesNotMatch(component, /authoritative homepage fare snapshot store is unavailable/);
  assert.doesNotMatch(component, /Set HOMEPAGE_FARES_CRON_SECRET before configuring an external scheduler/);
});

test("homepage fare operations links directly to content and flight providers without a Flight Operations parent", () => {
  const page = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
  const flights = readFileSync("src/app/admin/flights/page.tsx", "utf8");
  const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");

  assert.doesNotMatch(page, /Homepage content|<Link/);
  assert.doesNotMatch(page, /Flight providers|href="\/admin\/providers\?product=flights"/);
  assert.doesNotMatch(page, /href="\/admin\/flights"/);
  assert.match(flights, /redirect\("\/admin\/searches\/activity\?product=FLIGHT"\)/);
  assert.match(navigation, /\{ href: "\/admin\/homepage-fares", label: "Homepage Fares"/);
  assert.doesNotMatch(navigation, /\{ href: "\/admin\/flights", label: "Flights"/);
  assert.doesNotMatch(navigation, /href: "\/admin\/homepage-fares", parentHref:/);
});

test("homepage fare page header follows the compact Providers treatment", () => {
  const page = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
  assert.match(page, /<AdminPageShell title="Homepage Fare Operations" hideHeader>/);
  assert.match(page, /border-b border-\[#D8E1EC\] pb-4/);
  assert.match(page, /text-\[20px\] font-semibold leading-7 tracking-\[-0\.02em\] text-\[#020617\]/);
  assert.match(page, /<header className="border-b border-\[#D8E1EC\] pb-4 pt-1">/);
  assert.doesNotMatch(page, /rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black/);
});

test("readiness overview is flat like Providers while preserving status and metrics", () => {
  assert.match(component, /<section aria-labelledby="homepage-fare-readiness-heading" className="pb-5 pt-5">/);
  assert.match(component, /id="homepage-fare-readiness-heading"/);
  assert.match(component, />Readiness overview<\/h2>/);
  assert.match(component, /<DisplayReadinessSummary readiness=\{statusPayload\.displayReadiness\} \/>/);
  assert.doesNotMatch(component, /<Card className=/);
  assert.doesNotMatch(component, /shadow-sm/);
});

test("readiness summary metrics use flat neutral rows with semantic dots", () => {
  assert.match(component, /className="min-h-\[88px\] min-w-0 bg-white px-3 py-4 sm:px-4 xl:px-5"/);
  assert.match(component, /h-1\.5 w-1\.5 shrink-0 rounded-full/);
  assert.match(component, /text-\[24px\] font-medium leading-7 tracking-\[-0\.03em\] tabular-nums/);
  assert.match(component, /return "bg-teal"/);
  assert.match(component, /return "bg-sky-500"/);
  assert.match(component, /return "bg-amber"/);
  assert.match(component, /return "bg-danger"/);
  assert.match(component, /return "bg-slate-300"/);
  assert.doesNotMatch(component, /summaryToneClass/);
  assert.doesNotMatch(component, /border-teal\/20 bg-teal\/10 text-teal-dark/);
  assert.doesNotMatch(component, /border-sky-100 bg-sky-50 text-sky-700/);
  assert.doesNotMatch(component, /border-amber\/20 bg-amber\/10 text-amber/);
  assert.doesNotMatch(component, /border-red-100 bg-red-50 text-danger/);
});

test("readiness metrics display loading instead of Unavailable while status is pending", () => {
  const from = component.indexOf('<dl aria-label="Fare readiness metrics"');
  const readiness = component.slice(from, component.indexOf("</dl>", from));
  const labels = ["Fresh fares", "Last-known-good", "Missing routes", "Failed / unavailable", "Markets needing attention"];
  assert.ok(from >= 0);
  assert.match(component, /const readinessLoading = statusState\.loading && !statusPayload\.dataAvailable/);
  assert.match(component, /const readinessFallbackValue = readinessLoading \? "Loading…" : "Unavailable"/);
  assert.match(component, /const readinessFallbackTone: SummaryTone = readinessLoading \? "neutral" : "danger"/);
  assert.match(component, /const telemetryUnavailable = !statusState\.loading && !statusPayload\.dataAvailable/);
  assert.match(component, /aria-busy=\{readinessLoading\}/);
  assert.equal((readiness.match(/readinessFallbackValue/g) || []).length, 5);
  assert.equal((readiness.match(/readinessFallbackTone/g) || []).length, 5);
  for (const label of labels) {
    assert.ok(readiness.includes('label="' + label + '"'), "Missing readiness label: " + label);
    const line = readiness.split("\n").find((entry) => entry.includes('label="' + label + '"'));
    assert.ok(line?.includes(": readinessFallbackValue"), label + " must use a loading-aware fallback");
    assert.ok(line?.includes("readinessFallbackTone"), label + " must use a neutral loading dot");
  }
  assert.match(readiness, /tone=\{statusPayload\.dataAvailable \? "good" : readinessFallbackTone\}/);
  assert.match(readiness, /tone=\{statusPayload\.dataAvailable \? "info" : readinessFallbackTone\}/);
  assert.match(readiness, /statusPayload\.summary\.missing \? "warning" : "neutral"/);
  assert.match(readiness, /statusPayload\.summary\.failed \+ statusPayload\.summary\.unavailable \? "warning" : "neutral"/);
  assert.match(readiness, /marketsNeedingAnotherRun\.some\(\(market\) => market\.needed\) \? "warning" : "good"/);
});

test("saved status and scheduler wait for the result, while real outages stay visible", () => {
  const panel = component.slice(component.indexOf("function RefreshCronPanel("), component.indexOf("function homepageFareRoutesHref("));
  assert.match(component, /initialStatusLoading=\{readinessLoading\}/);
  assert.match(component, /value=\{readinessLoading \? "Loading…" : statusPayload\.dataAvailable \? formatSnapshotTime/);
  assert.match(component, /value=\{readinessLoading \? "Loading…" : statusPayload\.dataAvailable \? formatCronStatus/);
  assert.match(panel, /\{!loading && !operationsAvailable \? \(/);
  assert.match(panel, /\{!loading && operationsAvailable && !statusPayload\.cronConfigured \? \(/);
  assert.match(component, /setStatusState\(\(current\) => \(\{ \.\.\.current, loading: true, error: "" \}\)\)/);
  assert.match(component, /Telemetry unavailable\. Snapshot data could not be read; coverage counts are hidden\./);
  assert.match(component, /Could not load homepage fare snapshot status/);
});

test("Homepage Fare Operations shares the white Notifications workspace without global header changes", () => {
  const page = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  assert.match(shell, /const homepageFaresWorkspace = pathname === "\/admin\/homepage-fares"/);
  assert.match(shell, /notificationsWorkspace \|\| homepageFaresWorkspace/);
  assert.match(page, /max-w-\[1500px\] bg-white/);
  assert.match(page, /<AdminPageShell title="Homepage Fare Operations" hideHeader>/);
  assert.doesNotMatch(page, /href="\/admin\/content\/homepage"/);
  assert.doesNotMatch(page, /href="\/admin\/providers\?product=flights"/);
});

test("Readiness is a flat metrics strip with neutral status dots and authoritative counts", () => {
  assert.match(component, /aria-label="Fare readiness metrics"/);
  assert.match(component, /aria-label="Readiness metrics \(scroll horizontally on narrow screens\)"/);
  assert.match(component, /max-w-full overflow-x-auto overscroll-x-contain/);
  assert.match(component, /grid min-w-\[920px\] grid-cols-5 gap-px border-y border-\[#D8E1EC\] bg-\[#E7ECF5\]/);
  assert.match(component, /tabIndex=\{0\}/);
  assert.doesNotMatch(component, /grid-cols-2 gap-px border-y border-\[#D8E1EC\] bg-\[#E7ECF5\] sm:grid-cols-3 xl:grid-cols-5/);
  assert.match(component, /whitespace-nowrap text-\[11px\] font-medium leading-5/);
  assert.doesNotMatch(component, /rounded-lg border border-\[#D8E1EC\] bg-white px-3 py-2\.5/);
  assert.match(component, /summary\.fresh/);
  assert.match(component, /summary\.last_known_good/);
  assert.match(component, /summary\.missing/);
  assert.match(component, /summary\.failed \+ statusPayload\.summary\.unavailable/);
  assert.match(component, /marketsNeedingAnotherRun\.filter\(\(market\) => market\.needed\)\.length/);
  assert.match(component, /Telemetry unavailable\. Snapshot data could not be read; coverage counts are hidden\./);
});

test("Market coverage retains public market inspection without redundant diagnostics notices", () => {
  assert.match(component, /<ul aria-label="Public market coverage"/);
  assert.doesNotMatch(component, /displayedCodes = new Set\(markets\.map|outsidePublicCount|outside the public country table/);
  assert.doesNotMatch(component, /Review fallback diagnostics|View fare diagnostics|For fallback coverage, refresh execution and scheduler diagnostics/);
  assert.match(component, /marketsNeedingAnotherRun\.filter\(\(market\) => market\.needed\)\.length/);
  assert.match(component, /hidden=\{!showDetails\}/);
  assert.match(component, /href=\{onInspectMarket\(market\.marketCode\)\}/);
  assert.match(component, /href=\{onInspectMarket\(pool\.marketCode\)\}/);
  assert.match(component, /<MarketRouteInspector/);
  assert.match(component, /onSelectMarket=\{selectRouteScope\}/);
  assert.match(component, /onFilterChange=\{selectRouteFilter\}/);
  assert.match(component, /view === "diagnostics"/);
  assert.match(component, /<FareDiagnosticsSections/);
  assert.match(component, /Provider calls \/ limit/);
  assert.match(component, /Route attempts \/ limit/);
});


test("homepage fare route filters use bounded accessible menus and preserve route selection", () => {
  const select = readFileSync("src/components/admin/SearchMonitorSelect.tsx", "utf8");
  const routesPage = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  assert.match(component, /sm:grid-cols-\[minmax\(0,320px\)_minmax\(0,240px\)\]/);
  assert.match(component, /appearance="fare"/);
  assert.match(component, /onValueChange=\{onSelectMarket\}/);
  assert.match(component, /value=\{selectedRouteScope\}/);
  assert.match(component, /ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(routesPage, /initialMarket/);
  assert.equal((component.match(/<select/g) || []).length, 0);
  assert.match(select, /aria-haspopup="listbox"/);
  assert.match(select, /aria-expanded=\{open\}/);
  assert.match(select, /max-h-64/);
  assert.match(select, /case "Escape"/);
});

test("coverage actions remain on the same row with expandable details that preserve factual gaps", () => {
  assert.match(component, /lg:grid-cols-\[minmax\(150px,1\.5fr\)_70px_85px_72px_minmax\(120px,1fr\)_minmax\(240px,auto\)\]/);
  assert.match(component, /expandedMarket, setExpandedMarket/);
  assert.match(component, /aria-expanded=\{showDetails\}/);
  assert.match(component, /aria-controls=\{detailsId\}/);
  assert.match(component, /hidden=\{!showDetails\}/);
  assert.match(component, /role="region"/);
  assert.match(component, /aria-label=\{"Inspect routes for " \+ market\.marketLabel\}/);
  assert.match(component, /whitespace-nowrap text-\[12px\] font-semibold text-\[#004BB8\]/);
  assert.match(component, /label="Next run"/);
  assert.match(component, /label="Current gaps"/);
  assert.doesNotMatch(component, /outside the public country table/);
});

test("fare diagnostics preserve every metric while condensing zero-count fallback pools", () => {
  const diagnostics = component.slice(component.indexOf("function FareDiagnosticsSections("), component.indexOf("function MarketRouteInspector("));
  const labels = [
    "Provider calls / limit", "Stopped reason", "Route attempts / limit",
    "Visible gaps attempted", "Immediate replacements attempted",
    "Replacement candidates used", "Timeouts", "Markets targeted",
    "Configured routes", "Fresh eligible snapshots",
    "Last-known-good eligible snapshots", "Exact route mismatch",
    "Candidate pool failed", "Candidate pool unavailable",
    "Scheduler cadence", "Scheduler verification",
    "Markets needing another run (current snapshot)",
  ];
  for (const label of labels) assert.ok(diagnostics.includes('label="' + label + '"'), "Missing metric: " + label);
  assert.equal((diagnostics.match(/<MetricCard /g) || []).length, labels.length);
  assert.match(diagnostics, /const noCountedOutcomes = fresh === 0 && missing === 0 && failed === 0/);
  assert.match(diagnostics, /No fresh, missing or failed routes recorded/);
  assert.match(diagnostics, /href=\{onInspectMarket\(pool\.marketCode\)\}/);
  const pools = diagnostics.slice(diagnostics.indexOf('section aria-labelledby="fallback-pools-heading"'), diagnostics.indexOf('section aria-labelledby="refresh-execution-heading"'));
  assert.match(pools, /key=\{pool\.marketCode\}/);
  assert.match(pools, /aria-label=\{"Inspect routes for " \+ pool\.marketLabel\}/);
  assert.match(pools, /href=\{onInspectMarket\(pool\.marketCode\)\}/);
  assert.match(pools, /\{pool\.marketLabel\}/);
  assert.doesNotMatch(pools, />\{pool\.marketCode\}<\/span>/);
  assert.match(pools, /md:grid-cols-2/);
  assert.match(diagnostics, /No completed manual fare refresh is recorded/);
  assert.match(diagnostics, /Logged manual refresh data is unavailable/);
  assert.match(diagnostics, /Not recorded/);
  assert.match(diagnostics, /sm:grid-cols-2/);
  assert.doesNotMatch(diagnostics, /min-w-\[920px\]|overflow-x-auto|<details/);
});

test("dedicated route page validates market hints and keeps white admin workspace", () => {
  const page = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  assert.match(page, /<AdminPageShell title="Route inspector" hideHeader>/);
  assert.match(page, /searchParams: SearchParams/);
  assert.match(page, /<HomepageFareSubpageNavigation active="routes"/);
  assert.match(page, /ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(shell, /pathname.startsWith\("\/admin\/homepage-fares\/"\)/);
  assert.match(component, /view === "operations"/);
  assert.match(component, /<MarketRouteInspector/);
  assert.doesNotMatch(component, /scrollIntoView/);
});

test("fare operations, route inspector and diagnostics are separate navigable views", () => {
  const diagnosticsPage = readFileSync("src/app/admin/homepage-fares/diagnostics/page.tsx", "utf8");
  const routesPage = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  const operationsPart = component.slice(component.indexOf('{view === "operations"'), component.indexOf('view === "diagnostics"'));
  assert.match(component, /view\?: "operations" \| "routes" \| "diagnostics"/);
  assert.match(component, /view === "diagnostics"/);
  assert.match(component, /href="\/admin\/homepage-fares\/diagnostics"/);
  assert.doesNotMatch(operationsPart, /<AdvancedDiagnostics/);
  assert.match(diagnosticsPage, /<HomepageFaresRefreshCard view="diagnostics"/);
  assert.match(diagnosticsPage, /<HomepageFareSubpageNavigation active="diagnostics"/);
  assert.match(routesPage, /<HomepageFareSubpageNavigation active="routes"/);
});

test("fare subpages share Providers-style tabs with back navigation above the tabs", () => {
  const nav = readFileSync("src/components/admin/HomepageFareSubpageNavigation.tsx", "utf8");
  const routes = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  const diagnostics = readFileSync("src/app/admin/homepage-fares/diagnostics/page.tsx", "utf8");
  const provider = readFileSync("src/app/admin/providers/page.tsx", "utf8");
  assert.match(nav, /aria-label="Homepage fare sections"/);
  assert.match(nav, /href="\/admin\/homepage-fares"/);
  assert.match(nav, /Back to Homepage Fare Operations/);
  assert.match(nav, /key: "routes", href: "\/admin\/homepage-fares\/routes", label: "Route Inspector"/);
  assert.match(nav, /key: "diagnostics", href: "\/admin\/homepage-fares\/diagnostics", label: "Fare Diagnostics"/);
  assert.match(nav, /aria-current=\{active === tab\.key \? "page" : undefined\}/);
  assert.match(nav, /active === tab\.key \? "border-\[#004BB8\]"/);
  assert.match(nav, /flex min-w-0 flex-wrap items-end gap-x-6 border-b/);
  assert.match(provider, /aria-label="Provider reporting sections"/);
  assert.match(provider, /border-b-2 px-1 text-\[13px\]/);
  assert.ok(nav.indexOf("Back to Homepage Fare Operations") < nav.indexOf('aria-label="Homepage fare sections"'));
  for (const page of [routes, diagnostics]) {
    assert.doesNotMatch(page, /<nav aria-label="Homepage fares pages"|<header className="flex flex-wrap items-start justify-between/);
    assert.match(page, /<h1 className="sr-only">/);
  }
  assert.match(routes, /view="routes" initialMarket=\{initialMarket\}/);
  assert.match(diagnostics, /view="diagnostics"/);
});

test("logged diagnostics come from protected no-cache audit reads, never invented from snapshot zeros", () => {
  const endpoint = readFileSync("src/app/api/admin/homepage-fares/diagnostics/route.ts", "utf8");
  assert.match(endpoint, /requireAdminApiSession\(\)/);
  assert.match(endpoint, /getOptionalPrisma\(\)/);
  assert.match(endpoint, /action: REFRESH_ACTION, targetType: REFRESH_TARGET/);
  assert.match(endpoint, /createdAt: "desc"/);
  assert.match(endpoint, /"Cache-Control": "no-store"/);
  assert.match(endpoint, /status: 503/);
  assert.match(endpoint, /dataAvailable: false, lastManualRun: null/);
  assert.match(endpoint, /metadata: true/);
  assert.doesNotMatch(endpoint, /adminEmail: true|ipAddress: true|userAgent: true/);
  assert.match(component, /fetch\("\/api\/admin\/homepage-fares\/diagnostics", \{ credentials: "include", cache: "no-store" \}\)/);
  assert.match(component, /No completed manual fare refresh is recorded/);
  assert.match(component, /Logged manual refresh data is unavailable/);
  assert.match(component, /value=\{recorded\(run\?\.visibleGapsAttempted\)\}/);
  assert.match(component, /value=\{recorded\(run\?\.immediateReplacementsAttempted\)\}/);
  assert.match(component, /Markets needing another run \(current snapshot\)/);
  assert.doesNotMatch(component, /refreshCounts\?\.visibleGapsAttempted\.length \?\? 0/);
});
