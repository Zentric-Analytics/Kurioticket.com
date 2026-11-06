import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPaths = [
  "src/app/admin/settings/layout.tsx",
  "src/app/admin/settings/page.tsx",
  "src/app/admin/settings/travel-automation/page.tsx",
  "src/app/admin/settings/notifications/page.tsx",
  "src/app/admin/settings/recent-changes/page.tsx",
  "src/components/admin/SettingsFeatureSection.tsx",
];
const settingsPage = settingsPaths.map((path) => readFileSync(path, "utf8")).join("\n");
const settingsLayout = readFileSync("src/app/admin/settings/layout.tsx", "utf8");
const settingsNavigation = readFileSync("src/components/admin/AdminSettingsNavigation.tsx", "utf8");
const featurePanel = readFileSync("src/components/admin/FeatureControlsPanel.tsx", "utf8");
const featureApi = readFileSync("src/app/api/admin/feature-controls/route.ts", "utf8");
const featureService = readFileSync("src/lib/feature-controls/service.ts", "utf8");
const registry = readFileSync("src/lib/feature-controls/registry.ts", "utf8");

test("Settings is the authoritative workspace for persisted administrative controls", () => {
  assert.match(settingsPage, /<AdminPageShell title="Settings" hideHeader>/);
  assert.doesNotMatch(settingsPage, /Environment and access|ContextItem|Your access|Settings store/);
  assert.match(settingsNavigation, /label: "Feature controls"/);
  assert.match(settingsPage, />Recent changes<\/h2>/);
  assert.doesNotMatch(settingsPage, /Managed outside Settings|Runtime & credentials|Administrator access/);
  assert.doesNotMatch(settingsPage, /Homepage Fare Operations|\/admin\/homepage-fares/);
  assert.doesNotMatch(settingsPage, /provider health|system health|email delivery health/i);
});

test("settings exposes only real persisted feature controls", () => {
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /listFeatureControls\(\)/);
  assert.match(featureService, /featureFlag\.findMany/);
  assert.match(featureService, /featureFlag\.update/);
  assert.match(featurePanel, /fetch\("\/api\/admin\/feature-controls"/);
  assert.equal((registry.match(/_ENABLED: control\(/g) || []).length, 6);
  for (const key of [
    "FLIGHT_SEARCH_ENABLED",
    "HOTEL_SEARCH_ENABLED",
    "CAR_SEARCH_ENABLED",
    "DEALS_ENABLED",
    "PRICE_ALERTS_ENABLED",
    "PRICE_ALERT_PROCESSING_ENABLED",
  ]) {
    assert.match(registry, new RegExp(key));
  }
  assert.doesNotMatch(settingsPage, /timezone|default currency|preferred market|language preference/i);
});

test("settings starts directly with feature controls and retains authorization inputs", () => {
  assert.match(settingsLayout, /md:grid-cols-\[232px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(settingsPage, /Environment and access|ContextItem|canEditControls|accessLabel|storeLabel/);
  assert.match(settingsPage, /canControlProduction=\{canControlProduction\}/);
  assert.match(settingsPage, /environment=\{featureControls\.environment\}/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.match(settingsPage, /getFeatureControlProductionAdmins/);
});

test("feature controls use concise product and automation descriptions", () => {
  assert.match(featurePanel, /"Travel Search": "Product availability"/);
  assert.match(featurePanel, /"Travel Automation": "Travel automation"/);
  assert.match(featurePanel, /Manage travel search and Packages\./);
  assert.match(featurePanel, /Manage price alerts and automatic checks\./);
  assert.match(featurePanel, /controls\.filter\(\(control\) => control\.category === category\)/);
  assert.match(featurePanel, /Allow flight searches\./);
  assert.match(featurePanel, /Allow hotel searches\./);
  assert.match(featurePanel, /Allow car searches\./);
  assert.match(featurePanel, /Show or hide Packages\./);
  assert.match(featurePanel, /Allow new and reactivated price alerts\./);
  assert.match(featurePanel, /Run automatic price checks and send alerts\./);
  assert.doesNotMatch(featurePanel, /\{control\.risk\} · \{control\.kind\}/);
});

test("Settings starts with a short instruction without implying service health", () => {
  assert.match(settingsPage, /Manage travel search and Packages\./);
  assert.doesNotMatch(settingsPage, /Operational health is monitored in Providers and the relevant operational workspaces/);
});

test("production feature-control changes keep strong authorization", () => {
  assert.match(featureApi, /getFeatureControlProductionAdmins/);
  assert.match(featureApi, /A reason is required for production changes/);
  assert.match(featureApi, /hasRecentReauthentication/);
  assert.match(featureApi, /RECENT_REAUTHENTICATION_REQUIRED/);
  assert.match(featureApi, /requireAdminApiSession\(\)/);
});

test("feature-control mutations remain transactionally audited", () => {
  assert.match(featureService, /\$transaction/);
  assert.match(featureService, /TransactionIsolationLevel\.Serializable/);
  assert.match(featureService, /adminAuditLog\.create/);
  assert.match(featureService, /FEATURE_CONTROL_UPDATED/);
  assert.match(featureService, /targetType: "FeatureFlag"/);
  assert.match(featureService, /previousEnabled/);
  assert.match(featureService, /nextEnabled/);
  assert.match(featureService, /reason: input\.reason \|\| null/);
});

test("settings disables mutation when authoritative feature store is unavailable", () => {
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.match(featurePanel, /read-only fallback mode/);
  assert.match(featurePanel, /disabled=\{!permitted\}/);
  assert.match(featureService, /dataAvailable = false/);
});

test("feature-control interaction states remain explicit and safe", () => {
  assert.match(featurePanel, /role="switch"/);
  assert.match(featurePanel, /aria-checked=\{control\.state\.enabled\}/);
  assert.match(featurePanel, /aria-label=\{\(control\.state\.enabled \? "Disable " : "Enable "\) \+ control\.name\}/);
  assert.match(featurePanel, /Production controls are view only for your account/);
  assert.match(featurePanel, /event\.key === "Escape" && !saving/);
  assert.match(featurePanel, /Reason for change \(required\)/);
  assert.match(featurePanel, /Add a note \(optional\)/);
  assert.match(featurePanel, /hidden=\{!showOptionalNote\}/);
  assert.match(featurePanel, /disabled=\{saving \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
  assert.match(featurePanel, /aria-busy=\{saving\}/);
});

test("successful feature-control changes refresh from persisted server state", () => {
  assert.match(featureApi, /updatedAt: result\.state\.updatedAt\.toISOString\(\)/);
  assert.match(featurePanel, /typeof body\.updatedAt === "string" \? body\.updatedAt : control\.state\.updatedAt/);
  assert.match(featurePanel, /router\.refresh\(\)/);
  assert.match(featurePanel, /setControls\(initialControls\)/);
  assert.doesNotMatch(featurePanel, /updatedAt: new Date\(\)\.toISOString\(\)/);
});

test("feature-control network failures remain retryable without closing the dialog", () => {
  assert.match(featurePanel, /try \{/);
  assert.match(featurePanel, /catch \{/);
  assert.match(featurePanel, /The control could not be changed\. Please try again\./);
  assert.match(featurePanel, /finally \{/);
  assert.match(featurePanel, /setSaving\(false\)/);
  assert.match(featurePanel, /if \(!pending \|\| saving\) return/);
});

test("Recent changes opens unfiltered audit history within the reader's supported 90-day window", () => {
  const recent = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  const auditLogs = readFileSync("src/app/admin/logs/page.tsx", "utf8");
  const auditReader = readFileSync("src/services/adminAuditReadContract.ts", "utf8");
  assert.match(recent, /href="\/admin\/logs\?range=90d"/);
  assert.doesNotMatch(recent, /href="\/admin\/logs\?[^"]*(?:action=|targetType=|range=30d)/);
  assert.match(recent, />\s*View audit history\s*<\/Link>/);
  assert.match(auditLogs, /range === "90d"/);
  assert.match(auditReader, /end - start > 90 \* dayMs/);
});

test("Recent changes reads real settings audit events instead of initialization timestamps", () => {
  const recent = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  assert.match(recent, /adminAuditReads\.list/);
  assert.match(recent, /FEATURE_CONTROL_UPDATED/);
  assert.match(recent, /ADMIN_NOTIFICATION_PREFERENCE_UPDATED/);
  assert.match(recent, /history\.map/);
  assert.match(recent, /Administrator/);
  assert.match(recent, /No recorded Settings changes in the last 90 days/);
  assert.match(recent, /Settings audit history is temporarily unavailable/);
  assert.doesNotMatch(recent, /listFeatureControls|recentControlUpdates|featureControls\.controls/);
});

test("Settings omits nonactionable deployment and access documentation", () => {
  assert.doesNotMatch(settingsPage, /Managed outside Settings|Runtime & credentials|Deployment managed|Access managed separately/);
  assert.doesNotMatch(settingsPage, /process\.env\./);
  assert.doesNotMatch(featurePanel, /API key|database URL|session secret/i);
});

test("settings uses a flat administrative layout rather than dashboard cards", () => {
  assert.doesNotMatch(settingsPage, /AdminSectionCard/);
  assert.match(settingsPage, /border-b border-\[#D8E1EC\]/);
  assert.match(featurePanel, /divide-y divide-\[#E7ECF5\] border-b border-\[#D8E1EC\]/);
  assert.doesNotMatch(settingsPage, /SummaryItem|Protected changes|Persisted feature state|Turn major travel functions on or off/);
});

test("the Deals feature flag is presented as Packages without changing the internal key", () => {
  assert.match(registry, /DEALS_ENABLED: control\("Packages", "Controls Packages entry points/);
  assert.match(featurePanel, /DEALS_ENABLED: "Show or hide Packages\."/);
  assert.doesNotMatch(featurePanel, /Controls Deals availability\./);
  assert.match(registry, /DEALS_ENABLED/);
});

test("Settings sidebar offers four deep-linkable sections without changing the global header", () => {
  assert.match(settingsLayout, /<AdminPageShell title="Settings" hideHeader>/);
  assert.match(settingsLayout, /<AdminSettingsNavigation \/>/);
  assert.match(settingsNavigation, /usePathname\(\)/);
  assert.match(settingsNavigation, /aria-label="Settings sections"/);
  assert.match(settingsNavigation, /aria-current=\{active \? "page" : undefined\}/);
  for (const href of [
    "/admin/settings", "/admin/settings/travel-automation",
    "/admin/settings/notifications", "/admin/settings/recent-changes",
  ]) assert.ok(settingsNavigation.includes('href: "' + href + '"'));
  assert.match(settingsLayout, /min-w-0/);
  assert.doesNotMatch(settingsLayout, /<AdminHorizontalShell|<AdminHeader/);
});

test("settings routes isolate the right-side content but preserve the working controls", () => {
  const availability = readFileSync("src/app/admin/settings/page.tsx", "utf8");
  const automation = readFileSync("src/app/admin/settings/travel-automation/page.tsx", "utf8");
  const notifications = readFileSync("src/app/admin/settings/notifications/page.tsx", "utf8");
  const changes = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  const featureSection = readFileSync("src/components/admin/SettingsFeatureSection.tsx", "utf8");
  assert.match(availability, /category="Travel Search"/);
  assert.match(automation, /category="Travel Automation"/);
  assert.match(featureSection, /controls\.filter\(\(control\) => control\.category === category\)/);
  assert.match(featureSection, /hideCategoryHeading/);
  assert.match(featurePanel, /hideCategoryHeading \? undefined/);
  assert.match(notifications, /<AdminAlertAcknowledgeButton/);
  assert.match(notifications, /getAdminAlertSnapshot/);
  assert.match(changes, /history\.map/);
  assert.match(changes, /FEATURE_CONTROL_UPDATED/);
  assert.doesNotMatch(notifications, /FeatureControlsPanel|listFeatureControls/);
  assert.doesNotMatch(changes, /AdminAlertAcknowledgeButton/);
});

test("nested Settings pages keep the existing white admin workspace", () => {
  const horizontalShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  const globalNavigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
  assert.match(horizontalShell, /const settingsWorkspace = pathname === "\/admin\/settings" \|\| pathname\.startsWith\("\/admin\/settings\/"\)/);
  assert.match(globalNavigation, /return pathname === itemHref \|\| pathname\.startsWith/);
});


test("Settings sections share restrained desktop widths, headings, and consistent separators", () => {
  const featureSection = readFileSync("src/components/admin/SettingsFeatureSection.tsx", "utf8");
  const notifications = readFileSync("src/app/admin/settings/notifications/page.tsx", "utf8");
  const notificationPanel = readFileSync("src/components/admin/AdminNotificationsPanel.tsx", "utf8");
  const recent = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  assert.match(settingsLayout, /max-w-\[1040px\]/);
  assert.match(settingsLayout, /md:grid-cols-\[232px_minmax\(0,1fr\)\]/);
  assert.match(settingsNavigation, /space-y-4/);
  for (const section of [featureSection, notifications, recent]) {
    assert.match(section, /border-b border-\[#D8E1EC\] pb-4/);
    assert.match(section, /text-\[17px\] font-semibold leading-6/);
  }
  assert.doesNotMatch(featureSection, />Feature controls<\/p>/);
  assert.match(featurePanel, /sm:min-w-\[128px\] sm:justify-end/);
  assert.match(notificationPanel, /const visibleAlerts = snapshot\?\.alerts \?\? \[\]/);
  assert.match(recent, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.1fr\)_minmax\(0,1\.1fr\)_150px\]/);
  assert.doesNotMatch(settingsLayout, /<AdminHorizontalShell|<AdminHeader/);
});


test("Settings feature dialogs show outcomes, not staging or risk metadata", () => {
  assert.match(featurePanel, /controlChangeDescriptions: Record<FeatureControlKey/);
  for (const key of [
    "FLIGHT_SEARCH_ENABLED", "HOTEL_SEARCH_ENABLED", "CAR_SEARCH_ENABLED",
    "DEALS_ENABLED", "PRICE_ALERTS_ENABLED", "PRICE_ALERT_PROCESSING_ENABLED",
  ]) assert.ok(featurePanel.includes(key + ": {"), "Missing outcome copy for " + key);
  assert.doesNotMatch(featurePanel, /<span>\{environment\}<\/span>/);
  assert.doesNotMatch(featurePanel, /\{pending\.control\.risk\} risk/);
  assert.doesNotMatch(featurePanel, /\{control\.risk\} · \{control\.kind\}/);
  assert.match(featurePanel, /isProduction \? \(/);
  assert.match(featurePanel, /This change affects the live website/);
  assert.match(featurePanel, /aria-describedby="feature-control-dialog-description"/);
  assert.match(featurePanel, /Add a note \(optional\)/);
  assert.match(featurePanel, /aria-expanded=\{showOptionalNote\}/);
  assert.ok(featurePanel.includes('if (showOptionalNote) setReason("");'));
  assert.match(featurePanel, /\{saving \? "Saving…" : \(pending\.enabled \? "Enable " : "Disable "\) \+ pending\.control\.name\}/);
  assert.match(featurePanel, /dialogRef\.current\?\.querySelector/);
  assert.match(featurePanel, /triggerRef\.current\?\.focus\(\)/);
  assert.match(featurePanel, /event\.key !== "Tab"/);
  assert.match(featurePanel, /disabled=\{saving \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
});

