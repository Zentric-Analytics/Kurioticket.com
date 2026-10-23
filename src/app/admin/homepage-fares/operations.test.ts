import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("src/services/homepageFareSnapshotService.ts", "utf8");
const component = readFileSync("src/components/admin/HomepageFaresRefreshCard.tsx", "utf8");
const adminRefresh = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");
const cronRefresh = readFileSync("src/app/api/internal/homepage-fares/refresh/route.ts", "utf8");
const lockService = readFileSync("src/services/homepageFareRefreshLock.ts", "utf8");

test("homepage fare status distinguishes telemetry outage from real missing fares", () => {
  assert.match(service, /dataAvailable: boolean/);
  assert.match(service, /let dataAvailable = Boolean\(db\)/);
  assert.match(service, /dataAvailable = false/);
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
