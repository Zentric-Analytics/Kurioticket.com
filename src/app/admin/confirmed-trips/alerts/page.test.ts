import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/admin/confirmed-trips/alerts/page.tsx", "utf8");
const overview = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");
const globalAlerts = readFileSync("src/app/admin/notifications/page.tsx", "utf8");
const core = readFileSync("src/services/adminAlertCore.ts", "utf8");
const service = readFileSync("src/services/adminAlertService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");

test("delivery health opens dedicated Confirmation alerts rather than System notifications", () => {
  const start = overview.indexOf('<section aria-labelledby="confirmation-delivery-health-title"');
  const section = overview.slice(start);
  assert.ok(start >= 0);
  assert.match(section, /href="\/admin\/confirmed-trips\/alerts"/);
  assert.match(section, />Confirmation alerts<\/Link>/);
  assert.doesNotMatch(section, /href="\/admin\/notifications"|Operational alerts/);
  assert.match(route, /const deliveryHealthHref = "\/admin\/confirmed-trips#confirmation-delivery-health-title"/);
  assert.match(route, /href=\{deliveryHealthHref\}/);
  assert.match(navigation, /href: "\/admin\/confirmed-trips", label: "Trips"/);
  assert.match(navigation, /href: "\/admin\/notifications", parentHref: "\/admin\/system"/);
});

test("confirmation alerts are administrator-only and use the real alert service", () => {
  assert.match(route, /await requireAdminSession\("\/admin\/confirmed-trips\/alerts"\)/);
  assert.match(route, /!isProtectedAdminEmail\(session\.user\.email\)/);
  assert.match(route, /redirect\("\/dashboard"\)/);
  assert.match(route, /getPartnerConfirmationBinding\(\)/);
  assert.match(route, /if \(binding\.configured\) \{/);
  assert.match(route, /getAdminAlertSnapshot\(session\.user\.id\)/);
  assert.match(route, /snapshot\?\.alerts\.filter\(\(alert\) => alert\.source === "CONFIRMED_TRIPS"\)/);
  assert.match(service, /confirmedTrips: \{/);
  assert.match(core, /source: "CONFIRMED_TRIPS"/);
  assert.match(core, /!signals\.system\.databaseConnected \|\| !signals\.confirmedTrips\?\.feedReady/);
  assert.match(core, /health\.rejectedLast24h <= 0/);
  assert.match(core, /Confirmation delivery telemetry unavailable/);
  assert.match(core, /Partner confirmation deliveries were rejected/);
  assert.doesNotMatch(route, /getDatabaseOutageAdminToken|getDatabaseOutageAlertSnapshot/);
});

test("confirmation alerts distinguish inactive, unavailable and genuine zero-alert states", () => {
  assert.match(route, /!binding\.configured \? \(/);
  assert.match(route, /\) : alertsUnavailable \? \(/);
  assert.match(route, /\) : alerts\.length === 0 \? \(/);
  assert.match(route, /No confirmation provider feed is configured/);
  assert.match(route, /Confirmation alert monitoring is inactive/);
  assert.match(route, /Confirmation alerts could not be loaded\. No alert count is assumed/);
  assert.match(route, /No confirmation delivery alerts are currently reported/);
  assert.match(route, /This does not prove that provider callbacks are arriving/);
  assert.match(route, /alerts\.length === 0/);
  assert.match(route, /role="alert"/);
  assert.match(route, /role="status"/);
  assert.doesNotMatch(route, /mockData|placeholderAlerts|Math\.random/);
});

test("real confirmation alerts can be acknowledged with existing protected mutation", () => {
  assert.match(route, /alerts\.map\(\(alert\) => \(/);
  assert.match(route, /key=\{alert\.id\}/);
  assert.match(route, /alert\.severity === "CRITICAL"/);
  assert.match(route, /alert\.acknowledged/);
  assert.match(route, /<AdminAlertAcknowledgeButton alertKey=\{alert\.key\} signalToken=\{alert\.signalToken\} acknowledged=\{alert\.acknowledged\} \/>/);
  assert.match(route, /Acknowledging an alert does not resolve its cause/);
  assert.doesNotMatch(route, /<form|method:\s*"(?:POST|PATCH|DELETE)"|providerConfirmationSecret/);
  assert.match(globalAlerts, /<AdminAlertAcknowledgeButton/);
  assert.match(globalAlerts, /title="Notifications & Alerts"/);
  assert.match(route, /<AdminPageShell title="Confirmation alerts" hideHeader>/);
});
