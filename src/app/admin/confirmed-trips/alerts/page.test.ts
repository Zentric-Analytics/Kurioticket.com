import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/admin/confirmed-trips/alerts/page.tsx", "utf8");
const operations = readFileSync("src/app/admin/confirmed-trips/operations/page.tsx", "utf8");
const inline = readFileSync("src/components/admin/ConfirmedTripDeliveryAlerts.tsx", "utf8");
const globalAlerts = readFileSync("src/app/admin/notifications/page.tsx", "utf8");
const core = readFileSync("src/services/adminAlertCore.ts", "utf8");
const service = readFileSync("src/services/adminAlertService.ts", "utf8");
const navigation = readFileSync("src/lib/adminNavigation.ts", "utf8");

test("Confirmation Delivery Health contains alerts instead of navigating to a duplicate page", () => {
  const start = operations.indexOf('<details id="confirmation-delivery-health-title"');
  const end = operations.indexOf("</details>", start);
  assert.ok(start >= 0 && end > start, "Delivery Health must exist");
  const deliveryHealth = operations.slice(start, end);
  assert.match(operations, /import \{ ConfirmedTripDeliveryAlerts \} from "@\/components\/admin\/ConfirmedTripDeliveryAlerts"/);
  assert.match(deliveryHealth, /\{readiness\.feedReady \? <ConfirmedTripDeliveryAlerts \/> : null\}/);
  assert.doesNotMatch(deliveryHealth, /href="\/admin\/confirmed-trips\/alerts"|href="\/admin\/notifications"|>Confirmation alerts<\/Link>/);
  assert.match(operations, /No provider confirmation feed is configured\. Monitoring is off/);
  assert.match(operations, /Delivery data is unavailable\. No counts are assumed/);
  assert.match(navigation, /href: "\/admin\/confirmed-trips", label: "Trips"/);
});

test("only genuine confirmed-trip alerts appear inline for a configured provider", () => {
  assert.match(inline, /await requireAdminSession\("\/admin\/confirmed-trips"\)/);
  assert.match(inline, /!isProtectedAdminEmail\(session\.user\.email\)/);
  assert.match(inline, /redirect\("\/dashboard"\)/);
  assert.match(operations, /\{readiness\.feedReady \? <ConfirmedTripDeliveryAlerts \/> : null\}/);
  assert.match(inline, /getAdminAlertSnapshot\(session\.user\.id\)/);
  assert.match(inline, /snapshot\.alerts\.filter\(\(alert\) => alert\.source === "CONFIRMED_TRIPS"\)/);
  assert.match(service, /confirmedTrips: \{/);
  assert.match(core, /source: "CONFIRMED_TRIPS"/);
  assert.match(core, /!signals\.system\.databaseConnected \|\| !signals\.confirmedTrips\?\.feedReady/);
  assert.match(core, /health\.rejectedLast24h <= 0/);
  assert.match(core, /Confirmation delivery telemetry unavailable/);
  assert.match(core, /Partner confirmation deliveries were rejected/);
  assert.doesNotMatch(inline, /mockData|placeholderAlerts|Math\.random|getDatabaseOutageAdminToken/);
});

test("inactive or zero-alert states do not create a duplicate informational card", () => {
  assert.match(operations, /readiness\.feedReady \? <ConfirmedTripDeliveryAlerts \/> : null/);
  assert.match(inline, /if \(alerts\.length === 0\) return null/);
  assert.doesNotMatch(inline, /No confirmation provider feed is configured|Monitoring inactive|No confirmation delivery alerts are currently reported/);
  assert.match(inline, /catch \(error\)/);
  assert.match(inline, /role="alert"/);
  assert.match(inline, /Confirmation alerts could not be checked\. Do not assume there are no alerts/);
  assert.doesNotMatch(inline, /No alerts reported|No alert count is assumed/);
});

test("genuine alerts expand in place and reuse protected acknowledgement", () => {
  assert.match(inline, /<details className="group mt-3/);
  assert.match(inline, /<summary className=/);
  assert.match(inline, /active confirmation alert/);
  assert.match(inline, /group-open:rotate-180/);
  assert.match(inline, /alerts\.map\(\(alert\) => \(/);
  assert.match(inline, /key=\{alert\.id\}/);
  assert.match(inline, /alert\.severity === "CRITICAL"/);
  assert.match(inline, /alert\.acknowledged/);
  assert.match(inline, /alert\.title/);
  assert.match(inline, /alert\.message/);
  assert.match(inline, /formatSignalTime\(alert\.signalAt\)/);
  assert.match(inline, /<AdminAlertAcknowledgeButton alertKey=\{alert\.key\} signalToken=\{alert\.signalToken\} acknowledged=\{alert\.acknowledged\} \/>/);
  assert.match(inline, /Acknowledging an alert does not resolve its cause/);
  assert.doesNotMatch(inline, /<form|method:\s*"(?:POST|PATCH|DELETE)"|providerConfirmationSecret/);
});

test("old Confirmation alerts links safely redirect to Delivery Health within Trip operations", () => {
  assert.match(route, /await requireAdminSession\("\/admin\/confirmed-trips\/alerts"\)/);
  assert.match(route, /redirect\("\/admin\/confirmed-trips\/operations#confirmation-delivery-health-title"\)/);
  assert.doesNotMatch(route, /<AdminPageShell|Monitoring inactive|No confirmation provider feed is configured|<AdminSectionCard/);
  assert.match(operations, /id="confirmation-delivery-health-title"/);
  assert.match(globalAlerts, /title="Notifications & Alerts"/);
  assert.match(globalAlerts, /<AdminAlertAcknowledgeButton/);
  assert.match(navigation, /href: "\/admin\/notifications", parentHref: "\/admin\/system"/);
});
