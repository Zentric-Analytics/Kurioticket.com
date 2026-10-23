import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const core = readFileSync("src/services/adminAlertCore.ts", "utf8");
const service = readFileSync("src/services/adminAlertService.ts", "utf8");
const emailDelivery = readFileSync("src/services/emailDeliveryService.ts", "utf8");
const flightStatus = readFileSync("src/services/adminFlightStatusOperationsService.ts", "utf8");
const page = readFileSync("src/app/admin/notifications/page.tsx", "utf8");
const readApi = readFileSync("src/app/api/admin/notifications/route.ts", "utf8");
const ackApi = readFileSync("src/app/api/admin/notifications/acknowledge/route.ts", "utf8");
const acknowledgeButton = readFileSync("src/components/admin/AdminAlertAcknowledgeButton.tsx", "utf8");
const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
const adminLib = readFileSync("src/lib/admin.ts", "utf8");

test("admin alerts derive only from authoritative operational sources", () => {
  for (const source of [
    "getSafeSystemStatus",
    "getProviderOperationalStatuses",
    "getEmailDeliveryHealthSnapshot",
    "getCmsHealthOverview",
    "readHomepageFareSnapshotStatus",
    "getFlightStatusOperationsSnapshot",
  ]) {
    assert.match(service, new RegExp(source));
  }
  assert.match(core, /readinessState !== "READY"/);
  assert.match(core, /!signals\.flightStatus\.feedReady/);
  assert.match(core, /metrics\.missingSnapshots > 0/);
  assert.match(core, /cms-integrity:\$\{signals\.cms\.unhealthyFingerprint\}/);
  assert.match(service, /cmsUnhealthyFingerprint/);
  assert.match(service, /createHash\("sha256"\)/);
  assert.match(emailDelivery, /MAX\(updated_at\)/);
  assert.match(emailDelivery, /latestProblemAt/);
  assert.match(core, /signals\.email\.latestProblemAt/);
  assert.match(flightStatus, /missingSnapshotFingerprint/);
  assert.match(flightStatus, /staleSnapshotFingerprint/);
  assert.match(core, /flight-status-missing:\$\{metrics\.missingSnapshotFingerprint\}/);
  assert.match(core, /flight-status-stale:\$\{metrics\.staleSnapshotFingerprint\}/);
  assert.doesNotMatch(core, /confirmedLast24h|booking confirmations recently/i);
});

test("admin alerts distinguish telemetry outages from real healthy zeroes", () => {
  assert.match(core, /Provider telemetry is unavailable/);
  assert.match(core, /Email delivery telemetry is unavailable/);
  assert.match(core, /CMS health could not be verified/);
  assert.match(core, /Homepage fare telemetry is unavailable/);
  assert.match(core, /Flight-status telemetry is unavailable/);
  assert.match(core, /signals\.email\.failures === 0 && signals\.email\.delayed === 0/);
  assert.match(service, /TELEMETRY_STATE_ACTION/);
  assert.match(service, /readTelemetryOutageTokens/);
  assert.match(service, /state: "AVAILABLE"/);
  assert.match(service, /state: "OUTAGE"/);
  assert.match(service, /recoveryBoundary/);
  assert.match(core, /signals\.telemetryOutageTokens\.providers/);
  assert.match(core, /signals\.telemetryOutageTokens\.email/);
  assert.match(core, /signals\.telemetryOutageTokens\.cms/);
  assert.match(core, /signals\.telemetryOutageTokens\.homepageFares/);
  assert.match(core, /signals\.telemetryOutageTokens\.flightStatus/);
});

test("acknowledgements are per-admin, signal-specific, temporary, and must persist", () => {
  assert.match(service, /adminUserId/);
  assert.match(service, /ADMIN_ALERT_ACKNOWLEDGED/);
  assert.match(service, /24 \* 60 \* 60 \* 1_000/);
  assert.match(service, /acknowledgementKey\(candidate\.key, candidate\.signalToken\)/);
  assert.match(ackApi, /getCurrentAdminAlertByKey/);
  assert.match(ackApi, /alert\.signalToken !== signalToken/);
  assert.match(acknowledgeButton, /JSON\.stringify\(\{ alertKey, signalToken \}\)/);
  assert.match(ackApi, /alert\.acknowledged/);
  assert.match(ackApi, /writeAdminAuditLog/);
  assert.match(ackApi, /if \(!persisted\)/);
  assert.match(ackApi, /status: 503/);
  assert.match(adminLib, /return true/);
  assert.match(adminLib, /return false/);
});

test("acknowledgement mutation is authenticated, rate-limited, and safe", () => {
  assert.match(ackApi, /requireAdminApiSession\(\)/);
  assert.match(ackApi, /checkAuthRateLimit/);
  assert.match(ackApi, /admin-alert-acknowledgement/);
  assert.match(ackApi, /status: 429/);
  assert.match(ackApi, /"Retry-After"/);
  assert.doesNotMatch(ackApi, /title|message|actionHref/);
});

test("notifications page explains acknowledgement semantics and monitored boundaries", () => {
  assert.match(page, /title="Notifications & Alerts"/);
  assert.match(page, /does not resolve the underlying condition/);
  assert.match(page, /Phase 1 monitoring boundaries/);
  assert.match(page, /does not fabricate alerts/);
  assert.match(page, /AdminAlertAcknowledgeButton/);
  assert.match(page, /isProtectedAdminEmail\(session\.user\.email\)/);
  assert.match(page, /signalToken=\{alert\.signalToken\}/);
  assert.doesNotMatch(
    core,
    /markets\.join\(","\),\s*signals\.homepageFares\.lastRefreshAt/,
  );
});

test("admin bell is live and reads only the summary endpoint", () => {
  assert.match(shell, /fetch\("\/api\/admin\/notifications\?summary=1"/);
  assert.match(shell, /href="\/admin\/notifications"/);
  assert.match(shell, /unreadAlertCount > 99 \? "99\+" : unreadAlertCount/);
  assert.match(shell, /admin-alerts-updated/);
  assert.match(shell, /setInterval\(refreshIfVisible, 60_000\)/);
  assert.match(shell, /addEventListener\("focus", refreshIfVisible\)/);
  assert.match(shell, /addEventListener\("visibilitychange", refreshIfVisible\)/);
  assert.doesNotMatch(shell, /aria-label="Notifications unavailable"/);
});

test("notifications read API supports cached safe summary mode", () => {
  assert.match(readApi, /requireAdminApiSession\(\)/);
  assert.match(readApi, /summaryOnly/);
  assert.match(readApi, /getAdminAlertSummary/);
  assert.match(service, /CANDIDATE_CACHE_TTL_MS = 30_000/);
  assert.match(service, /candidateCache/);
  assert.match(service, /forceRefreshCandidates: true/);
  assert.doesNotMatch(readApi, /process\.env|errorMessage|providerMessageId/);
});
