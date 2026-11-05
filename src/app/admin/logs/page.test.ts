import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/logs/page.tsx", "utf8");
const toolbar = readFileSync("src/components/admin/AdminAuditLogsToolbar.tsx", "utf8");
const nav = readFileSync("src/lib/adminNavigation.ts", "utf8");
const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("Audit Logs uses the compact Providers-style white workspace", () => {
  assert.match(page, /title="Audit Logs" hideHeader/);
  assert.match(page, />Audit Logs<\/h1>/);
  assert.match(page, /text-\[18px\] font-semibold/);
  assert.match(page, /border-b border-\[#D8E1EC\]/);
  assert.match(page, /text-\[12px\] font-medium uppercase text-\[#475569\]/);
  assert.match(page, /text-\[13px\] font-medium text-\[#020617\]/);
  assert.doesNotMatch(page, /AdminDataTable|AdminFilterBar|AdminSectionCard|rounded-xl border border-slate-200 bg-white/);
  assert.match(shell, /auditLogsWorkspace/);
});

test("Audit Logs presents readable actions while retaining technical audit values", () => {
  assert.match(page, /CMS_CONTENT_PUBLISHED: "CMS content published"/);
  assert.match(page, /ADMIN_ALERT_CMS_STATE: "CMS alert state changed"/);
  assert.match(page, /PROVIDER_RETESTED: "Provider retested"/);
  assert.match(page, /actionLabel\(log\.action\)/);
  assert.match(page, /<code[^>]*title=\{log\.action\}>\{log\.action\}<\/code>/);
  assert.match(page, /identifierLabel\(log\.targetType\)/);
  assert.match(page, /title=\{log\.targetId \|\| undefined\}/);
});

test("Target email is filterable but not a permanent table column", () => {
  assert.match(toolbar, />Target email\s*<input/);
  assert.doesNotMatch(page, /<span>Target email<\/span>/);
  assert.match(page, /if \(!log\.targetEmail\)/);
  assert.match(page, /<details data-audit-row=\{log\.id\}/);
  assert.match(page, />Target email<\/p>/);
  assert.match(page, /\{log\.targetEmail\}/);
});

test("Audit Logs filters preserve the safe reader contract and user-page custom-date rules", () => {
  for (const label of ["Last 24 hours", "Last 7 days", "Last 30 days", "Last 90 days", "Custom range"]) {
    assert.ok(toolbar.includes(label));
  }
  for (const label of ["All actions", "CMS actions", "Provider actions", "User actions", "Support actions", "Email actions", "Alert actions"]) {
    assert.ok(toolbar.includes(label));
  }
  for (const label of ["All target types", "User", "Visitor", "Provider", "Support ticket", "Email delivery", "CMS content item"]) {
    assert.ok(toolbar.includes(label));
  }
  assert.match(toolbar, /onValueChange=\{changeRange\}/);
  assert.match(toolbar, /onValueChange=\{next => navigate\(\{ action: next \|\| null \}\)\}/);
  assert.match(toolbar, /onValueChange=\{next => navigate\(\{ targetType: next \|\| null \}\)\}/);
  assert.match(toolbar, /aria-label="Custom start date UTC"/);
  assert.match(toolbar, /aria-label="Custom end date UTC"/);
  assert.match(toolbar, />Apply dates<\/button>/);
  assert.match(toolbar, /disabled=\{!validCustom \|\| isPending\}/);
  assert.match(toolbar, />Apply filters<\/button>/);
  assert.match(toolbar, /href="\/admin\/logs\?range=7d"/);
  assert.match(page, /for \(const key of \["action", "adminEmail", "targetType", "targetEmail"\]/);
  assert.match(page, /params\.set\("limit", "100"\)/);
  assert.match(page, /if \(cursor\)/);
  assert.match(page, /range === "90d"/);
  assert.doesNotMatch(page, /params\.set\("range"/);
});

test("Audit Logs keeps cursor pagination explicit and distinguishes empty, invalid, forbidden and unavailable reads", () => {
  assert.match(page, />Back to newest<\/Link>/);
  assert.match(page, />Older records ›<\/Link>/);
  assert.match(page, /Newest first · up to 100 records per page\./);
  assert.match(page, /No audit entries found/);
  assert.match(page, /Invalid audit filters/);
  assert.match(page, /Admin access required/);
  assert.match(page, /Audit logs unavailable/);
  assert.match(page, /An unavailable read is not shown as an empty history/);
});

test("Audit Logs, CMS Health and Email Delivery are contextual destinations rather than System header children", () => {
  assert.match(nav, /href: "\/admin\/logs", label: "Audit Logs"/);
  for (const href of ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]) {
    assert.ok(nav.includes(`href: "${href}"`));
    assert.equal(nav.includes(`href: "${href}", parentHref: "/admin/system"`), false);
  }
  assert.doesNotMatch(shell, /SystemSectionTabs|aria-label="System sections"/);
  assert.match(shell, /href="\/admin\/logs", label: "Audit Logs"/);
});
