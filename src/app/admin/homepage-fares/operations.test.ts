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
  assert.match(component, /Provider calls/);
  assert.match(component, /No run yet/);
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
  assert.match(component, /Latest snapshot/);
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


test("homepage fare operations follows the production operator hierarchy", () => {
  const readiness = component.indexOf('title="Readiness overview"');
  const refresh = component.indexOf("<RefreshCronPanel");
  const markets = component.indexOf("<MarketReadinessDashboard");
  const routes = component.indexOf("<MarketRouteInspector");
  const diagnostics = component.indexOf("<DiagnosticsPanel");
  const advanced = component.indexOf("<AdvancedDiagnostics");

  assert.ok(readiness >= 0);
  assert.ok(refresh > readiness);
  assert.ok(markets > refresh);
  assert.ok(routes > markets);
  assert.ok(diagnostics > routes);
  assert.ok(advanced > diagnostics);
  assert.match(component, /title="Refresh operations"/);
  assert.match(component, /title="Public market coverage"/);
  assert.match(component, /title="Route inspector"/);
  assert.match(component, /title="Why markets are not ready"/);
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
  assert.match(component, /CompactDetail label="Provider calls"/);
  assert.match(component, /formatCronStatus\(statusPayload\)/);
});

test("advanced diagnostics keeps fallback and executor data available without dominating the main flow", () => {
  assert.match(component, /<details className="rounded-2xl border border-border bg-white p-4">/);
  assert.match(component, /Advanced diagnostics/);
  assert.match(component, /Fallback coverage pools/);
  assert.match(component, /Executor details/);
  assert.match(component, /Configured routes/);
  assert.match(component, /Visible gaps attempted/);
});

test("homepage fare refresh operations stay compact without an empty two-column panel", () => {
  assert.match(component, /xl:flex-row xl:items-center xl:justify-between/);
  assert.match(component, /xl:max-w-4xl xl:grid-cols-4/);
  assert.match(component, /Latest snapshot/);
  assert.match(component, /Provider calls/);
  assert.match(component, /Stopped reason/);
  assert.match(component, /Cron/);
  assert.doesNotMatch(component, /lg:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(18rem,0\.8fr\)\]/);
});

test("public market coverage renders compact scan rows instead of tall readiness cards", () => {
  assert.match(component, /lg:grid-cols-\[minmax\(160px,1\.2fr\)_110px_110px_110px_150px_90px\]/);
  assert.match(component, />Market<\/span>/);
  assert.match(component, />Popular<\/span>/);
  assert.match(component, />Discovery<\/span>/);
  assert.match(component, />Backup<\/span>/);
  assert.doesNotMatch(component, /function MarketReadinessCard/);
  assert.doesNotMatch(component, /function CoverageMetric/);
});

test("route inspector uses compact select controls while preserving every route filter", () => {
  assert.equal((component.match(/<select/g) || []).length, 2);
  assert.match(component, /<option value="">Select market<\/option>/);
  assert.match(component, /<option value=\{ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE\}>All routes<\/option>/);
  assert.match(component, /value=\{filter\}/);
  assert.match(component, /onFilterChange\(event\.target\.value as AdminHomepageFareRouteGroupFilter\)/);
  for (const label of ["All", "Ready", "Underfilled", "Failed", "Missing", "Stale", "Last-known-good", "Fresh", "Unavailable"]) {
    assert.match(component, new RegExp('label: "' + label + '"'));
  }
  assert.doesNotMatch(component, /aria-label="Route status filters"/);
});

test("market diagnostics use structured rows instead of repeated prose cards", () => {
  assert.match(component, /sm:grid-cols-\[minmax\(140px,1fr\)_110px_minmax\(220px,1\.5fr\)_120px\]/);
  assert.match(component, />Coverage gap<\/span>/);
  assert.match(component, />Next run<\/span>/);
  assert.match(component, /Popular \{market\.popularVisibleFresh\}\/\{market\.popularVisibleTarget\}/);
  assert.match(component, /Discovery \{market\.discoveryVisibleFresh\}\/\{market\.discoveryVisibleTarget\}/);
  assert.doesNotMatch(component, /function buildDiagnostics/);
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
  assert.match(component, /<span className="block">Needed<\/span>/);
  assert.match(component, /nextRunCause && nextRunCause !== "underfilled" \? <span className="mt-0\.5 block text-\[10px\] font-semibold text-muted">\{formatUnderfillCause\(nextRunCause\)\}<\/span> : null/);
});

test("homepage fare diagnostics use concise coverage rows with an action-oriented next-run state", () => {
  assert.match(component, /Popular \{market\.popularVisibleFresh\}\/\{market\.popularVisibleTarget\} · Discovery \{market\.discoveryVisibleFresh\}\/\{market\.discoveryVisibleTarget\} · Backup \{market\.backupFresh\}\/\{market\.backupTarget\}/);
  assert.doesNotMatch(component, /\{market\.underfillReason \? <span className="block text-amber">\{market\.underfillReason\}<\/span> : null\}/);
  assert.match(component, /<span className="block">Needed<\/span>/);
  assert.match(component, /formatUnderfillCause\(nextRunCause\)/);
  assert.match(component, /"Not required"/);
});

test("homepage fare diagnostics keeps only operator-relevant signals in the main flow", () => {
  assert.match(component, /sm:grid-cols-3/);
  assert.match(component, /label="Stopped reason"/);
  assert.match(component, /label="Provider budget"/);
  assert.match(component, /label="Route budget"/);
  assert.doesNotMatch(component, /<CompactDetail label="Candidate pool failed"/);
  assert.doesNotMatch(component, /<CompactDetail label="Fresh used publicly"/);
  assert.match(component, /MetricCard label="Candidate pool failed"/);
  assert.match(component, /MetricCard label="Fresh used publicly"/);
});

test("route inspector empty state stays compact", () => {
  assert.match(component, /Select a market or All routes\./);
  assert.match(component, /mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50\/60 px-3 py-2\.5/);
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