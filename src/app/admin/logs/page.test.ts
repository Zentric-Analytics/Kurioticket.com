import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/logs/page.tsx", "utf8");
const toolbar = readFileSync("src/components/admin/AdminAuditLogsToolbar.tsx", "utf8");
const nav = readFileSync("src/lib/adminNavigation.ts", "utf8");
const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("Audit Logs uses the compact Providers-style white workspace", () => {
  assert.doesNotMatch(page, /AdminPageShell/);
  assert.equal((page.match(/Audit Logs<\/h1>/g) || []).length, 1);
  assert.ok(page.includes("text-[18px] font-semibold"));
  assert.ok(page.includes("border-b border-[#D8E1EC]"));
  assert.ok(page.includes("text-[12px] font-medium uppercase text-[#475569]"));
  assert.ok(page.includes("text-[13px] font-medium text-[#020617]"));
  assert.doesNotMatch(page, /AdminDataTable|AdminFilterBar|AdminSectionCard|rounded-xl border border-slate-200 bg-white/);
  assert.doesNotMatch(page, /Security-sensitive admin and system actions/);
  assert.doesNotMatch(page, /newest records on this page|rangeLabel\(/);
  assert.ok(shell.includes("auditLogsWorkspace"));
});

test("Audit Logs presents readable actions while retaining technical audit values", () => {
  assert.ok(page.includes('CMS_CONTENT_PUBLISHED: "CMS content published"'));
  assert.ok(page.includes('ADMIN_ALERT_CMS_STATE: "CMS alert state changed"'));
  assert.ok(page.includes('PROVIDER_RETESTED: "Provider retested"'));
  assert.ok(page.includes("actionLabel(log.action)"));
  assert.ok(page.includes("title={log.action}>{log.action}</code>"));
  assert.ok(page.includes("identifierLabel(log.targetType)"));
  assert.ok(page.includes("title={log.targetId || undefined}"));
});

test("Target email stays out of the permanent columns and expandable rows own the extra detail", () => {
  assert.ok(toolbar.includes("Search target email"));
  assert.ok(toolbar.includes('placeholder="Search target email"'));
  assert.equal(page.includes("<span>Target email</span>"), false);
  assert.equal(page.includes(">Details</span>"), false);
  assert.equal(page.includes("View ›"), false);
  assert.equal(page.includes("Hide ‹"), false);
  assert.ok(page.includes("if (!log.targetEmail)"));
  assert.ok(page.includes("<details data-audit-row={log.id}"));
  assert.ok(page.includes('title="View target email details"'));
  assert.ok(page.includes("cursor-pointer"));
  assert.ok(page.includes("hover:bg-[#F8FAFC]"));
  assert.ok(page.includes("Additional target email details available"));
  assert.ok(page.includes("Target email</p>"));
  assert.ok(page.includes("{log.targetEmail}"));
});

test("Audit Logs search mirrors the Users auto-update pattern without an apply button", () => {
  assert.ok(toolbar.includes('role="search"'));
  assert.ok(toolbar.includes('aria-label="Search audit logs"'));
  assert.ok(toolbar.includes('placeholder="Search admin email"'));
  assert.ok(toolbar.includes('placeholder="Search target email"'));
  assert.ok(toolbar.includes("window.setTimeout"));
  assert.ok(toolbar.includes("}, 300);"));
  assert.ok(toolbar.includes("router.replace(href, { scroll: false })"));
  assert.ok(toolbar.includes("adminDraftRef"));
  assert.ok(toolbar.includes("targetDraftRef"));
  assert.ok(toolbar.includes("paramsRef"));
  assert.ok(toolbar.includes("new URLSearchParams(paramsRef.current)"));
  assert.ok(toolbar.includes("paramsRef.current = new URLSearchParams(query)"));
  assert.match(toolbar, /paramsRef\.current = new URLSearchParams\(pageHref\.split\("\?"\)\[1\] \|\| ""\);\s*\}, \[pageHref\]\);/);
  assert.ok(toolbar.includes('window.addEventListener("popstate", onHistoryNavigation)'));
  assert.ok(toolbar.includes("lastSubmittedSearchRef.current = committedSearchKey"));
  assert.ok(toolbar.includes("lastSubmittedSearchRef.current !== null && lastSubmittedSearchRef.current !== searchKey"));
  assert.ok(toolbar.includes("[adminDraft, targetDraft, adminEmail, targetEmail, pageHref, navigate]"));
  assert.ok(toolbar.includes("if (lastSubmittedSearchRef.current === searchKey)"));
  assert.doesNotMatch(toolbar, /Apply filters|Clear filters/);
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
  assert.ok(toolbar.includes("onValueChange={changeRange}"));
  assert.ok(toolbar.includes("onValueChange={next => navigate({ action: next || null })}"));
  assert.ok(toolbar.includes("onValueChange={next => navigate({ targetType: next || null })}"));
  assert.ok(toolbar.includes('aria-label="Custom start date UTC"'));
  assert.ok(toolbar.includes('aria-label="Custom end date UTC"'));
  assert.ok(toolbar.includes("Apply dates"));
  assert.ok(toolbar.includes("disabled={!validCustom || isPending}"));
  assert.doesNotMatch(toolbar, /Apply filters|Clear filters/);
  assert.ok(page.includes('params.set("limit", "100")'));
  assert.ok(page.includes('params.has("cursor")'));
  assert.ok(page.includes('range === "90d"'));
  assert.equal(page.includes('params.set("range"'), false);
});

test("Audit Logs forwards malformed reader parameters so the safe reader can reject them", () => {
  assert.ok(page.includes('const pageOnlyKeys = new Set(["range", "fromDate", "toDate"])'));
  assert.ok(page.includes("for (const [key, value] of Object.entries(raw))"));
  assert.ok(page.includes("if (pageOnlyKeys.has(key) || value === undefined) continue"));
  assert.ok(page.includes("if (Array.isArray(value)) value.forEach(item => params.append(key, item))"));
  assert.ok(page.includes("else params.append(key, value)"));
  assert.ok(page.includes('if (!params.has("limit")) params.set("limit", "100")'));
});

test("Canceling custom date editing restores the applied range selector", () => {
  assert.ok(toolbar.includes("rangeSelectVersion"));
  assert.ok(toolbar.includes('key={range + ":" + rangeSelectVersion}'));
  assert.ok(toolbar.includes("setRangeSelectVersion(version => version + 1)"));
});

test("Audit Logs keeps cursor pagination explicit and distinguishes empty, invalid, forbidden and unavailable reads", () => {
  assert.ok(page.includes("Back to newest"));
  assert.ok(page.includes("Older records ›"));
  assert.ok(page.includes("Newest first · up to 100 records per page."));
  assert.ok(page.includes("No audit entries found"));
  assert.ok(page.includes("Invalid audit filters"));
  assert.ok(page.includes("Admin access required"));
  assert.ok(page.includes("Audit logs unavailable"));
  assert.ok(page.includes("An unavailable read is not shown as an empty history"));
});

test("Audit Logs, CMS Health and Email Delivery are contextual destinations rather than System header children", () => {
  assert.ok(nav.includes('href: "/admin/logs", label: "Audit Logs"'));
  for (const href of ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]) {
    assert.ok(nav.includes(`href: "${href}"`));
    assert.equal(nav.includes(`href: "${href}", parentHref: "/admin/system"`), false);
  }
  assert.doesNotMatch(shell, /SystemSectionTabs|aria-label="System sections"/);
  assert.ok(shell.includes('{ href: "/admin/logs", label: "Audit Logs", icon: ShieldCheck }'));
});
