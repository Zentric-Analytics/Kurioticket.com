import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/email-delivery/page.tsx", "utf8");
const rangeFilter = readFileSync("src/components/admin/EmailDeliveryRangeFilter.tsx", "utf8");
const button = readFileSync("src/components/admin/EmailDeliveryTestButton.tsx", "utf8");
const service = readFileSync("src/services/emailDeliveryService.ts", "utf8");
const route = readFileSync("src/app/api/admin/email/health/route.ts", "utf8");
const adminNavigation = readFileSync("src/lib/adminNavigation.ts", "utf8");

test("Email Delivery uses a compact title and one page-level date range control", () => {
  assert.equal((page.match(/>Email Delivery<\/h1>/g) || []).length, 1);
  assert.match(page, /href="\/admin\/system"/);
  assert.match(page, /Back to System/);
  assert.match(page, /ArrowLeft size=\{14\}/);
  assert.doesNotMatch(page, /Admin operations|Email Delivery Operations|Monitor transactional email configuration/);
  assert.match(page, /EmailDeliveryRangeFilter/);
  for (const label of ["Last 24 hours", "Last 7 days", "Last 30 days", "Last 90 days", "Custom range"]) {
    assert.ok(rangeFilter.includes(label));
  }
  assert.match(rangeFilter, /onValueChange=\{changeRange\}/);
  assert.match(rangeFilter, /Email delivery custom start date UTC/);
  assert.match(rangeFilter, /Email delivery custom end date UTC/);
  assert.ok(rangeFilter.includes("Apply dates"));
  assert.match(rangeFilter, /setRangeSelectVersion/);
});

test("the selected range drives the whole time-based operational view without truncating history", () => {
  assert.match(page, /page: requestedHistoryPage/);
  assert.match(page, /aria-label="Email delivery summary"/);
  for (const label of ["Email deliveries", "Delivered", "Delayed", "Failed"]) {
    assert.ok(page.includes(label));
  }
  assert.doesNotMatch(page, /Tracked transactional email attempts|Provider-reported delays|Failed, bounced, complained or suppressed in 24 hours/);
  assert.match(page, /Delivery history/);
  assert.doesNotMatch(page, /Latest 10 in/);
  assert.doesNotMatch(page, /Showing .* deliveries in/);
  assert.doesNotMatch(page, /historyStart|historyEnd/);
  assert.match(service, /export async function getEmailDeliveryOperationsSnapshot/);
  assert.match(service, /history_total: bigint/);
  assert.match(service, /SELECT COUNT\(\*\)[\s\S]*FROM email_deliveries d/);
  assert.match(service, /created_at >= \$\{range\.from\} AND created_at < \$\{range\.to\}/);
  assert.match(service, /COALESCE\(e\.occurred_at, e\.created_at\) >= \$\{range\.from\}/);
  assert.match(service, /e\.type = 'email\.delivered'/);
  assert.match(service, /'internal\.send_failed'/);
  assert.match(service, /e\.type = 'email\.delivery_delayed'/);
  assert.match(service, /OR EXISTS \([\s\S]*FROM email_events e[\s\S]*COALESCE\(e\.occurred_at, e\.created_at\) >= \$\{range\.from\}/);
  assert.match(service, /EMAIL_DELIVERY_HISTORY_PAGE_SIZE = 100/);
  assert.match(service, /LIMIT \$\{EMAIL_DELIVERY_HISTORY_PAGE_SIZE\}/);
  assert.match(service, /OFFSET \$\{historyOffset\}/);
});

test("summary metrics use one compact four-column status band with no repeated range copy", () => {
  assert.match(page, /grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-\[#D8E1EC\]/);
  assert.match(page, /bg-\[#004BB8\]/);
  assert.match(page, /bg-emerald-500/);
  assert.match(page, /bg-amber-500/);
  assert.match(page, /bg-rose-500/);
  assert.doesNotMatch(page, /\(24h\)|Last 24 hours<\/p>/);
  assert.doesNotMatch(page, /metric\.hint/);
});

test("current setup hides healthy configuration details and surfaces only missing checks", () => {
  assert.match(page, /Current setup/);
  assert.match(page, /Suppressed addresses/);
  assert.match(page, /operations\.currentSuppressed\.toLocaleString\(\)/);
  assert.doesNotMatch(page, /label: "Suppressions"/);
  assert.match(page, /const configurationChecks = \[/);
  assert.match(page, /const missingConfiguration = configurationChecks\.filter\(\(\[, ready\]\) => !ready\)/);
  assert.match(page, /missingConfiguration\.length > 0/);
  assert.match(page, /missingConfiguration\.map\(\(\[label\]\)/);
  assert.match(page, /StatusIndicator value="Not configured" tone="warn"/);
  assert.doesNotMatch(page, /StatusIndicator value=\{ready \? "Configured" : "Not configured"\}/);
  assert.match(page, /Sending ready/);
  assert.match(page, /Setup required/);
});

test("range parsing defaults to 24 hours and constrains custom ranges to 90 days", () => {
  assert.match(page, /function normalizeRange/);
  assert.match(page, /: "24h"/);
  assert.match(page, /MAX_RANGE_MS = 90 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(page, /Custom ranges can cover up to 90 days/);
  assert.match(page, /Choose both a valid start date and end date/);
  assert.match(page, /The start date must be before the end of the selected range/);
  assert.match(page, /Math\.min\(requestedEnd\.getTime\(\), now\.getTime\(\)\)/);
  assert.match(page, /date\.getUTCFullYear\(\) === year/);
  assert.match(rangeFilter, /date\.getUTCFullYear\(\) === year/);
});

test("delivery history exposes every matching record through server-side pagination", () => {
  assert.match(page, /parseHistoryPage\(one\(raw\.historyPage\)\)/);
  assert.match(page, /historyPageHref\(raw, operations\.historyPage - 1\)/);
  assert.match(page, /historyPageHref\(raw, operations\.historyPage \+ 1\)/);
  assert.match(page, /aria-label="Delivery history pages"/);
  assert.match(page, /Page \{operations\.historyPage\.toLocaleString\(\)\} of \{operations\.historyTotalPages\.toLocaleString\(\)\}/);
  assert.match(page, /‹ Previous/);
  assert.match(page, /Next ›/);
  assert.match(service, /historyTotalPages = Math\.max\(1, Math\.ceil\(historyTotal \/ EMAIL_DELIVERY_HISTORY_PAGE_SIZE\)\)/);
  assert.match(service, /historyPage = Math\.min\(requestedPage, historyTotalPages\)/);
  assert.doesNotMatch(service.slice(service.indexOf("getEmailDeliveryOperationsSnapshot"), service.indexOf("getEmailDeliveryHealthSnapshot")), /LIMIT 10/);
});

test("range-aware reads preserve privacy and the alert-specific 24-hour health contract", () => {
  assert.match(service, /current_suppressed/);
  assert.match(service, /internal\.send_succeeded/);
  assert.match(service, /internal\.send_failed/);
  assert.match(service, /INSERT INTO email_events/);
  assert.match(service, /toEmail: maskEmail\(row\.to_email\)/);
  assert.doesNotMatch(service, /subject: row\.subject/);
  assert.doesNotMatch(service, /providerMessageId:/);
  assert.doesNotMatch(service, /lastError:/);

  // Global alerts/API still use the original fixed 24-hour health reader.
  assert.match(service, /export async function getEmailDeliveryHealthSnapshot\(\)/);
  assert.match(service, /NOW\(\) - INTERVAL '24 hours'/);
  assert.match(route, /getEmailDeliveryHealthSnapshot\(\)/);
});

test("Test email delivery stays concise while remaining constrained to the signed-in admin", () => {
  assert.match(page, /Test email delivery/);
  assert.match(page, /Send a test to your admin email\./);
  assert.doesNotMatch(page, /Successful sends are written to the admin audit log|Safety: only the current signed-in admin can receive this test|arbitrary recipients and credential values are never exposed/);
  assert.match(button, /fetch\("\/api\/admin\/email\/health"/);
  assert.match(button, /method: "POST"/);
  assert.match(button, /Send test email/);
  assert.doesNotMatch(button, /Send test email to me/);
  assert.doesNotMatch(button, /recipient|toEmail|email:/);
  assert.match(route, /requireAdminApiSession\(\)/);
  assert.match(route, /checkAuthRateLimit/);
  assert.match(route, /limit: 5/);
  assert.match(route, /sendTransactionalEmail/);
  assert.match(route, /to: email/);
  assert.match(route, /EMAIL_DELIVERY_TEST_SENT/);
  assert.doesNotMatch(route, /providerMessageId/);
});

test("Delivery history keeps readable dot statuses and masked recipients", () => {
  assert.match(page, /<table className="w-full min-w-\[980px\] table-fixed text-\[13px\]">/);
  for (const heading of ["Template", "Recipient", "Status", "Created", "Sent", "Delivered"]) {
    assert.ok(page.includes(`>${heading}</th>`));
  }
  assert.match(page, /DELIVERED: "Delivered"/);
  assert.match(page, /DELIVERY_DELAYED: "Delayed"/);
  assert.match(page, /FAILED: "Failed"/);
  assert.match(page, /StatusIndicator value=\{statusLabels\[delivery\.status\] \|\| delivery\.status\}/);
  assert.match(page, /\{delivery\.toEmail\}/);
});

test("Email Delivery remains a protected contextual workspace without a duplicate System tab", () => {
  assert.match(adminNavigation, /href: "\/admin\/email-delivery"/);
  assert.doesNotMatch(adminNavigation, /href: "\/admin\/email-delivery", parentHref: "\/admin\/system"/);
});
