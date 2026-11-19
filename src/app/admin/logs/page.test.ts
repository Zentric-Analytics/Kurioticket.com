import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { namedFunction } from "../../../test-support/sourceStructure";

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

test("Audit Logs keeps the main rows readable and moves technical audit values into expandable details", () => {
  assert.ok(page.includes('CMS_CONTENT_PUBLISHED: "CMS content published"'));
  assert.ok(page.includes('ADMIN_ALERT_CMS_STATE: "CMS alert state changed"'));
  assert.ok(page.includes('PROVIDER_RETESTED: "Provider retested"'));
  assert.ok(page.includes("actionLabel(log.action)"));
  assert.ok(page.includes("identifierLabel(log.targetType)"));
  assert.equal(page.includes('title={log.action}>{log.action}</code>'), false);
  assert.equal(page.includes('title={log.targetId || undefined}'), false);
  assert.ok(page.includes('<AuditTechnicalDetail label="Admin ID" value={log.adminUserId || "System event"} />'));
  assert.ok(page.includes('<AuditTechnicalDetail label="Action code" value={log.action} />'));
  assert.ok(page.includes('<AuditTechnicalDetail label="Target ID" value={log.targetId || "Not provided"} />'));
});

test("Audit Logs fits its four columns into the sidebar workspace and keeps full emails readable", () => {
  assert.ok(page.includes('minmax(0,0.85fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.95fr)'));
  assert.equal(page.includes('minmax(210px,1.15fr)'), false);
  assert.equal(page.includes('minmax(240px,1.35fr)'), false);
  assert.equal(page.includes('min-w-[1080px]'), false);
  assert.ok(page.includes('w-full min-w-0'));
  assert.ok(page.includes('break-all text-[13px]'));
  assert.ok(page.includes('title={log.adminEmail}'));
});

test("Every audit row is expandable while target email stays out of the permanent columns", () => {
  assert.ok(toolbar.includes('placeholder="Search admin or target email"'));
  assert.doesNotMatch(toolbar, /placeholder="Search target email"|placeholder="Search admin email"/);
  assert.equal(page.includes("<span>Target email</span>"), false);
  assert.equal(page.includes(">Details</span>"), false);
  assert.equal(page.includes("View ›"), false);
  assert.equal(page.includes("Hide ‹"), false);
  assert.equal(page.includes("if (!log.targetEmail)"), false);
  assert.ok(page.includes("<details data-audit-row={log.id}"));
  assert.ok(page.includes('title="View audit details"'));
  assert.ok(page.includes("cursor-pointer"));
  assert.ok(page.includes("hover:bg-[#F8FAFC]"));
  assert.ok(page.includes('<AuditTechnicalDetail label="Target email" value={log.targetEmail} />'));
});

test("Audit Logs toolbar keeps readable balanced filter columns at 100% zoom", () => {
  assert.ok(toolbar.includes('data-testid="audit-filters-toolbar"'));
  assert.ok(toolbar.includes("sm:grid-cols-2"));
  assert.ok(toolbar.includes("lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_120px]"));
  assert.ok(toolbar.includes("sm:col-span-2 lg:col-span-1"));
  assert.equal((toolbar.match(/type="search"/g) || []).length, 1);
  assert.ok(toolbar.includes("compact attached"));
});

test("Audit Logs search, range, action and target filters wait for explicit Apply", () => {
  assert.ok(toolbar.includes('role="search"'));
  assert.ok(toolbar.includes('aria-label="Search audit logs"'));
  assert.ok(toolbar.includes('placeholder="Search admin or target email"'));
  assert.ok(toolbar.includes('searchEmail: emailDraft.trim() || null'));
  assert.ok(toolbar.includes('adminEmail: null'));
  assert.ok(toolbar.includes('targetEmail: null'));
  assert.ok(toolbar.includes('onClick={applyFilters}'));
  assert.ok(toolbar.includes("Apply filters"));
  assert.ok(toolbar.includes("setDraftRange(next as AuditRange)"));
  assert.ok(toolbar.includes("onValueChange={setDraftAction}"));
  assert.ok(toolbar.includes("onValueChange={setDraftTargetType}"));
  assert.doesNotMatch(toolbar, /window\.setTimeout|onValueChange=\{next => navigate/);
  assert.ok(toolbar.includes("if (isPending || (draftRange === \"custom\" && !validCustom)) return;"));
  assert.ok(toolbar.includes("router.push(href, { scroll: false })"));
});

test("Audit Logs uses four standard ranges and retains legacy custom-date deep links", () => {
  for (const label of ["Last 24 hrs", "Last 7 days", "Last 30 days", "All time", "Custom range"]) {
    assert.ok((toolbar + readFileSync("src/lib/adminReportingRanges.ts", "utf8")).includes(label));
  }
  assert.ok(toolbar.includes("Last 90 days (legacy)"));
  assert.ok(toolbar.includes("ADMIN_REPORTING_RANGE_OPTIONS"));
  for (const label of ["All actions", "CMS actions", "Provider actions", "User actions", "Support actions", "Email actions", "Alert actions"]) {
    assert.ok((toolbar + readFileSync("src/lib/adminReportingRanges.ts", "utf8")).includes(label));
  }
  for (const label of ["All target types", "User", "Visitor", "Provider", "Support ticket", "Email delivery", "CMS content item"]) {
    assert.ok((toolbar + readFileSync("src/lib/adminReportingRanges.ts", "utf8")).includes(label));
  }
  assert.ok(toolbar.includes('ariaLabel="Custom start date UTC"'));
  assert.ok(toolbar.includes('ariaLabel="Custom end date UTC"'));
  assert.ok(toolbar.includes("Set custom dates"));
  assert.ok(page.includes('params.set("limit", "100")'));
  assert.ok(page.includes('params.has("cursor")'));
  assert.ok(page.includes('range === "all"'));
  assert.ok(page.includes('params.set("from", "1970-01-01T00:00:00.000Z")'));
  assert.equal(namedFunction(page, "auditParams").includes('params.set("range"'), false);
  assert.match(namedFunction(page, "currentHref"), /params\.set\("range", range\)/);
  assert.ok(page.includes('searchEmail={one(raw.searchEmail)}'));
  assert.ok(page.includes('"action", "searchEmail", "adminEmail", "targetType", "targetEmail"'));
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
  assert.ok(toolbar.includes('key={draftRange + ":" + rangeSelectVersion}'));
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

test("Audit Logs, CMS Health and Email Delivery are grouped under System without becoming top-level header destinations", () => {
  assert.ok(nav.includes('href: "/admin/logs", parentHref: "/admin/system", label: "Audit Logs"'));
  for (const href of ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]) {
    assert.ok(nav.includes(`href: "${href}"`));
    assert.equal(nav.includes(`href: "${href}", parentHref: "/admin/system"`), true);
  }
  assert.doesNotMatch(shell, /SystemSectionTabs|aria-label="System sections"/);
  assert.doesNotMatch(shell, /\{ href: "\/admin\/logs", label: "Audit Logs", icon: ShieldCheck \}/);
});
