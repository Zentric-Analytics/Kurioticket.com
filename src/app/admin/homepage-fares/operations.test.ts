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
  assert.match(component, /Coverage counts below are hidden rather than replaced with zeroes/);
  assert.match(component, /operationsAvailable=\{statusPayload\.dataAvailable\}/);
});

test("homepage fare reload preserves snapshot-derived failure and unavailable counts", () => {
  assert.match(service, /failedByMarket,/);
  assert.match(service, /unavailableByMarket,/);
  assert.doesNotMatch(service, /failedByMarket: emptyMarketCounts,[\s\S]*unavailableByMarket: emptyMarketCounts/);
});

test("homepage fare operations does not present unknown executor history as zero", () => {
  assert.match(component, /Provider calls \(manual run\)/);
  assert.match(component, /No manual run in this session/);
  assert.doesNotMatch(component, /label="Provider calls used"/);
});

test("homepage fare cron copy separates credential presence from scheduler verification", () => {
  assert.match(component, /Cron credential/);
  assert.match(component, /Scheduler cadence note/);
  assert.match(component, /Scheduler verification/);
  assert.match(component, /Not observable from this service/);
  assert.match(component, /Credential configured/);
  assert.doesNotMatch(component, /label="Cron status"/);
});

test("homepage fare snapshot timestamp is not mislabeled as a completed refresh run", () => {
  assert.match(component, /Latest snapshot search/);
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
  assert.match(component, /CompactDetail label="Provider calls \(manual run\)"/);
  assert.match(component, /CompactDetail label="Cron credential"/);
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
  assert.match(component, /sm:grid-cols-\[minmax\(140px,1fr\)_110px_minmax\(220px,1\.5fr\)_100px\]/);
  assert.match(component, />Coverage gap<\/span>/);
  assert.match(component, />Next run<\/span>/);
  assert.match(component, /Popular \{market\.popularVisibleFresh\}\/\{market\.popularVisibleTarget\}/);
  assert.match(component, /Discovery \{market\.discoveryVisibleFresh\}\/\{market\.discoveryVisibleTarget\}/);
  assert.doesNotMatch(component, /function buildDiagnostics/);
});