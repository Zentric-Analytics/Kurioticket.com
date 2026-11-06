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
  const diagnosticsLink = component.indexOf('href="/admin/homepage-fares/diagnostics"');
  assert.ok(readiness >= 0 && refresh > readiness && markets > refresh && diagnosticsLink > markets);
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

test("advanced diagnostics keeps fallback and executor data available in a provider-style disclosure", () => {
  assert.match(component, /<section id="homepage-fare-advanced-diagnostics" aria-labelledby=/);
  assert.match(component, /<h3 id="homepage-fare-advanced-diagnostics-heading"/);
  assert.match(component, /Fallback coverage pools/);
  assert.match(component, /Executor details/);
  assert.match(component, /Configured routes/);
  assert.match(component, /Visible gaps attempted/);
  assert.doesNotMatch(component, /<details id="homepage-fare-advanced-diagnostics"|<summary|group-open:rotate-180/);
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
  assert.match(routesPage, /Back to Homepage Fare Operations/);
  assert.doesNotMatch(component, /scrollIntoView|routeInspectorRef|inspectMarketRoutes/);
});

test("dropdown and status selection update results without scrolling the page", () => {
  assert.match(component, /onValueChange=\{onSelectMarket\}/);
  assert.match(component, /onFilterChange\(next as AdminHomepageFareRouteGroupFilter\)/);
  assert.match(component, /onSelectMarket=\{selectRouteScope\}/);
  assert.match(component, /onFilterChange=\{selectRouteFilter\}/);
  assert.doesNotMatch(component, /scrollIntoView|window\.scrollTo/);
});

test("route pagination keeps columns and layout steady across short and long pages", () => {
  assert.match(component, /keepPageHeight=\{page\.totalPages > 1\}/);
  assert.match(component, /keepPageHeight \? "min-h-\[740px\]" : ""/);
  assert.match(component, /\[overflow-anchor:none\]/);
  assert.match(component, /table-fixed/);
  assert.doesNotMatch(component, /<colgroup>|min-w-\[1275px\]/);
  assert.match(component, /lg:block/);
  assert.match(component, /lg:hidden/);
  assert.match(component, /paginateAdminHomepageFareRoutes\(group\.routes, routePage\)/);
  assert.match(component, /disabled=\{!page\.hasNextPage\}/);
  assert.match(component, /disabled=\{!page\.hasPreviousPage\}/);
  assert.match(component, /setRoutePage\(1\)/);
});

test("route inspector uses one saved fare and responsive table/cards without horizontal scroll", () => {
  const table = component.slice(component.indexOf("function RouteDetailsTable("), component.indexOf("function MarketGroupStatusBadge("));
  assert.match(table, /<th scope="col" className="w-\[12%\] px-2 py-3 2xl:w-\[8%\]">Saved fare<\/th>/);
  assert.match(table, /\{formatRoutePrice\(route\)\}/);
  assert.doesNotMatch(table, /Provider native|Display price|formatProviderNativePrice|overflow-x-auto|min-w-\[1275px\]/);
  assert.match(table, /<table className="w-full table-fixed/);
  assert.match(table, /aria-label="Routes on this page"/);
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

test("route page places pagination beneath results, separates readiness, and retains responsive detail", () => {
  const details = component.slice(component.indexOf("function SelectedRouteDetails("), component.indexOf("function MarketMiniMetric("));
  const table = component.slice(component.indexOf("function RouteDetailsTable("), component.indexOf("function MarketGroupStatusBadge("));
  assert.ok(details.indexOf("<RouteDetailsTable") < details.indexOf('<nav aria-label="Route pages"'));
  assert.ok(details.indexOf("<MarketGroupStatusBadge") < details.indexOf("<RouteDetailsTable"));
  assert.match(details, /aria-live="polite" aria-atomic="true"/);
  assert.match(details, /disabled=\{!page\.hasPreviousPage\}/);
  assert.match(details, /disabled=\{!page\.hasNextPage\}/);
  assert.match(table, /\{route\.origin\}/);
  assert.match(table, /\{route\.destination\}/);
  assert.match(table, /\{route\.provider \?\? "—"\}/);
  assert.match(table, /\{route\.replacementCandidateUsed\}/);
  assert.match(table, /formatSnapshotTime\(route\.searchedAt\)/);
  assert.match(table, /formatDateTime\(route\.expiresAt\)/);
  assert.match(component, /bg-amber-500/);
  assert.match(component, /status === "Fallback only"/);
  assert.match(component, /\{status\}/);
});

test("route inspector defaults to All routes with seven distinct status options", () => {
  assert.equal((component.match(/<SearchMonitorSelect/g) || []).length, 2);
  assert.match(component, /initialMarket = ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(component, /useState<string>\(\s*initialMarket === ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE/);
  assert.match(component, /value: ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE, label: "All routes"/);
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
  assert.match(component, /\{" · Status: "\}\{filterLabel\}/);
  assert.match(component, /Across all markets/);
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
  assert.match(component, /outsidePublicCount/);
  assert.match(component, /additional market/);
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

test("fare diagnostics preserve operator and engineering signals without duplicating public fare metrics", () => {
  assert.match(component, /sm:grid-cols-3/);
  assert.match(component, /label="Stopped reason"/);
  assert.match(component, /label="Provider calls \/ limit \(last run\)"/);
  assert.match(component, /label="Route attempts \/ limit \(last run\)"/);
  assert.doesNotMatch(component, /<CompactDetail label="Candidate pool failed"/);
  assert.match(component, /MetricCard label="Candidate pool failed"/);
  assert.match(component, /MetricCard label="Fresh eligible snapshots"/);
  assert.match(component, /MetricCard label="Last-known-good eligible snapshots"/);
  assert.doesNotMatch(component, /MetricCard label="Fresh used publicly"/);
  assert.doesNotMatch(component, /MetricCard label="LKG used publicly"/);
});

test("route inspector empty state stays compact", () => {
  assert.match(component, /No route group is available for this market\. Choose All routes or another market\./);
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

test("readiness metric tone logic remains unchanged", () => {
  assert.match(component, /label="Fresh fares"[\s\S]*tone=\{statusPayload\.dataAvailable \? "good" : "danger"\}/);
  assert.match(component, /label="Last-known-good"[\s\S]*tone=\{statusPayload\.dataAvailable \? "info" : "danger"\}/);
  assert.match(component, /label="Missing routes"[\s\S]*statusPayload\.summary\.missing \? "warning" : "neutral"/);
  assert.match(component, /label="Failed \/ unavailable"[\s\S]*statusPayload\.summary\.failed \+ statusPayload\.summary\.unavailable \? "warning" : "neutral"/);
  assert.match(component, /label="Markets needing attention"[\s\S]*marketsNeedingAnotherRun\.some\(\(market\) => market\.needed\) \? "warning" : "good"/);
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

test("Market coverage retains public market inspection and reports counts outside the public table", () => {
  assert.match(component, /<ul aria-label="Public market coverage"/);
  assert.match(component, /displayedCodes = new Set\(markets\.map/);
  assert.match(component, /outsidePublicCount = marketsNeedingAnotherRun\.filter/);
  assert.match(component, /outside the public country table/);
  assert.match(component, /hidden=\{!showDetails\}/);
  assert.match(component, /href=\{onInspectMarket\(market\.marketCode\)\}/);
  assert.match(component, /href=\{onInspectMarket\(pool\.marketCode\)\}/);
  assert.match(component, /<MarketRouteInspector/);
  assert.match(component, /onSelectMarket=\{selectRouteScope\}/);
  assert.match(component, /onFilterChange=\{selectRouteFilter\}/);
  assert.match(component, /view === "diagnostics"/);
  assert.match(component, /<AdvancedDiagnostics/);
  assert.match(component, /Provider calls \/ limit \(last run\)/);
  assert.match(component, /Route attempts \/ limit \(last run\)/);
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
  assert.match(component, /outside the public country table/);
});

test("advanced diagnostics groups long executor details without removing operational facts", () => {
  assert.match(component, /mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2/);
  assert.match(component, /Execution and budgets/);
  assert.match(component, /Public fare outcomes/);
  assert.match(component, /Scheduling and market targets/);
  const labels = [
    "Configured routes", "Stopped reason", "Provider calls / limit (last run)", "Route attempts / limit (last run)",
    "Candidate pool failed", "Candidate pool unavailable", "Replacement candidates used (last run)",
    "Timeouts (last run)", "Fresh eligible snapshots", "Last-known-good eligible snapshots", "Exact route mismatch",
    "Visible gaps attempted (last run)", "Immediate replacements attempted (last run)", "Scheduler cadence",
    "Scheduler verification", "Executor targets (last run)", "Markets needing another run (current snapshot)",
  ];
  for (const label of labels) assert.ok(component.includes('label="' + label + '"'), "Missing metric: " + label);
  assert.match(component, /lg:grid-cols-2/);
  assert.doesNotMatch(component, /<details id="homepage-fare-advanced-diagnostics"/);
});

test("dedicated route page validates market hints and keeps white admin workspace", () => {
  const page = readFileSync("src/app/admin/homepage-fares/routes/page.tsx", "utf8");
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  assert.match(page, /<AdminPageShell title="Route inspector" hideHeader>/);
  assert.match(page, /searchParams: SearchParams/);
  assert.match(page, /Back to Homepage Fare Operations/);
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
  assert.match(diagnosticsPage, /Back to Homepage Fare Operations/);
  assert.match(diagnosticsPage, /href="\/admin\/homepage-fares\/routes"/);
  assert.match(routesPage, /href="\/admin\/homepage-fares\/diagnostics"/);
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
