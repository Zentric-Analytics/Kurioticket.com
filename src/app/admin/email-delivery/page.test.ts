import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/email-delivery/page.tsx", "utf8");
const button = readFileSync("src/components/admin/EmailDeliveryTestButton.tsx", "utf8");
const service = readFileSync("src/services/emailDeliveryService.ts", "utf8");
const route = readFileSync("src/app/api/admin/email/health/route.ts", "utf8");
const adminNavigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("Email Delivery uses the compact white operational workspace instead of legacy cards", () => {
  assert.match(page, /title="Email Delivery Operations"/);
  assert.match(page, /aria-label="Email delivery summary"/);
  assert.match(page, /grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4/);
  assert.match(page, /aria-label="Email delivery controls"/);
  assert.match(page, /Recent deliveries/);
  assert.match(page, /Latest 10 deliveries/);
  assert.doesNotMatch(page, /AdminMetricCard|AdminSectionCard|AdminDataTable|AdminStatusBadge/);
  assert.doesNotMatch(page, /rounded-xl bg-slate-50/);
  assert.match(adminShell, /emailDeliveryWorkspace/);
  assert.match(adminShell, /auditLogsWorkspace \|\| emailDeliveryWorkspace/);
});

test("Email Delivery preserves truthful summary semantics and safe configuration checks", () => {
  for (const label of ["Last 24 hours", "Failures", "Delayed", "Suppressions"]) {
    assert.ok(page.includes(label));
  }
  assert.match(page, /Failed, bounced, complained or suppressed in 24 hours/);
  assert.match(page, /Provider-reported delays in 24 hours/);
  assert.match(page, /Current addresses protected from optional sends/);
  for (const label of ["Resend API key", "Sender address", "Webhook secret"]) {
    assert.ok(page.includes(label));
  }
  assert.match(page, /Credential values are never displayed/);
  assert.match(page, /function StatusIndicator/);
  assert.match(page, /inline-flex items-center gap-1\.5 text-\[12px\] font-medium/);
  assert.match(page, /h-1\.5 w-1\.5 shrink-0 rounded-full/);
  assert.doesNotMatch(page, /process\.env\.RESEND_API_KEY\s*\}/);
  assert.doesNotMatch(page, /providerMessageId|lastError|delivery\.subject/);
});

test("email delivery telemetry distinguishes unavailable storage from real zero activity", () => {
  assert.match(service, /dataAvailable: true/);
  assert.match(service, /dataAvailable: false/);
  assert.match(page, /health\.dataAvailable \? health\.last24Hours\.toLocaleString\(\) : "Unavailable"/);
  assert.match(page, /Email telemetry unavailable/);
  assert.match(page, /unavailable rather than shown as zero activity/);
  assert.match(page, /Delivery history unavailable/);
  assert.doesNotMatch(service, /subject: row\.subject/);
  assert.doesNotMatch(service, /providerMessageId:/);
  assert.doesNotMatch(service, /lastError:/);
  assert.match(service, /updated_at >= NOW\(\) - INTERVAL '24 hours'/);
  assert.match(service, /COALESCE\(e\.occurred_at, e\.created_at\) >= NOW\(\) - INTERVAL '24 hours'/);
});

test("Test transactional delivery stays constrained and replaces safety pills with one concise note", () => {
  assert.match(page, /Test transactional delivery/);
  assert.match(page, /Safety: only the current signed-in admin can receive this test/);
  assert.match(page, /arbitrary recipients and credential values are never exposed/);
  assert.doesNotMatch(page, /Recipient is current admin only|No arbitrary recipient input|No secrets shown/);

  assert.match(button, /fetch\("\/api\/admin\/email\/health"/);
  assert.match(button, /method: "POST"/);
  assert.match(button, /Send test email to me/);
  assert.match(button, /bg-\[#004BB8\]/);
  assert.doesNotMatch(button, /AdminButton/);
  assert.doesNotMatch(button, /recipient|toEmail|email:/);

  assert.match(route, /requireAdminApiSession\(\)/);
  assert.match(route, /checkAuthRateLimit/);
  assert.match(route, /admin-email-delivery-test/);
  assert.match(route, /limit: 5/);
  assert.match(route, /status: 429/);
  assert.match(route, /"Retry-After"/);
  assert.match(route, /sendTransactionalEmail/);
  assert.match(route, /Kurioticket transactional email test/);
  assert.doesNotMatch(route, /production email test/);
  assert.match(route, /to: email/);
  assert.match(route, /writeAdminAuditLog/);
  assert.match(route, /EMAIL_DELIVERY_TEST_SENT/);
  assert.match(route, /targetType: "EmailDelivery"/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true \}\)/);
  assert.doesNotMatch(route, /providerMessageId/);
});

test("Recent deliveries use readable dot statuses while preserving masked recipients and latest-10 scope", () => {
  assert.match(page, /<table className="w-full min-w-\[980px\] table-fixed text-\[13px\]">/);
  for (const heading of ["Template", "Recipient", "Status", "Created", "Sent", "Delivered"]) {
    assert.ok(page.includes(`>${heading}</th>`));
  }
  assert.match(page, /DELIVERED: "Delivered"/);
  assert.match(page, /DELIVERY_DELAYED: "Delayed"/);
  assert.match(page, /FAILED: "Failed"/);
  assert.match(page, /StatusIndicator value=\{statusLabels\[delivery\.status\] \|\| delivery\.status\}/);
  assert.match(page, /\{delivery\.toEmail\}/);
  assert.match(service, /ORDER BY created_at DESC\s+LIMIT 10/);
  assert.match(service, /toEmail: maskEmail\(row\.to_email\)/);
  assert.doesNotMatch(page, /filter|pagination|cursor|page size/i);
});

test("Email Delivery remains a protected contextual workspace without a duplicate System tab", () => {
  assert.match(adminNavigation, /href: "\/admin\/email-delivery"/);
  assert.doesNotMatch(adminNavigation, /href: "\/admin\/email-delivery", parentHref: "\/admin\/system"/);
});
