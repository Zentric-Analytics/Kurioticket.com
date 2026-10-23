import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/email-delivery/page.tsx", "utf8");
const button = readFileSync("src/components/admin/EmailDeliveryTestButton.tsx", "utf8");
const service = readFileSync("src/services/emailDeliveryService.ts", "utf8");
const route = readFileSync("src/app/api/admin/email/health/route.ts", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");

test("Email Delivery Operations exposes safe operational health without secret values", () => {
  assert.match(page, /title="Email Delivery Operations"/);
  assert.match(page, /Email telemetry unavailable/);
  assert.match(page, /Last 24 hours/);
  assert.match(page, /Failures/);
  assert.match(page, /Delayed/);
  assert.match(page, /Suppressions/);
  assert.match(page, /Resend API key/);
  assert.match(page, /Sender address/);
  assert.match(page, /Webhook secret/);
  assert.match(page, /Credential values are never displayed/);
  assert.doesNotMatch(page, /process\.env\.RESEND_API_KEY\s*\}/);
  assert.doesNotMatch(page, /providerMessageId|lastError|delivery\.subject/);
});

test("email delivery telemetry distinguishes unavailable storage from real zero activity", () => {
  assert.match(service, /dataAvailable: true/);
  assert.match(service, /dataAvailable: false/);
  assert.match(page, /health\.dataAvailable \? health\.last24Hours : "Unavailable"/);
  assert.doesNotMatch(service, /subject: row\.subject/);
  assert.doesNotMatch(service, /providerMessageId:/);
  assert.doesNotMatch(service, /lastError:/);
  assert.match(service, /updated_at >= NOW\(\) - INTERVAL '24 hours'/);
  assert.match(service, /COALESCE\(e\.occurred_at, e\.created_at\) >= NOW\(\) - INTERVAL '24 hours'/);
});

test("admin email test send is constrained, audited, and provider-neutral", () => {
  assert.match(button, /fetch\("\/api\/admin\/email\/health"/);
  assert.match(button, /method: "POST"/);
  assert.match(button, /Send test email to me/);
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

test("System links to the Email Delivery Operations workspace", () => {
  assert.match(systemPage, /href="\/admin\/email-delivery"/);
  assert.match(systemPage, />Email delivery</);
});
