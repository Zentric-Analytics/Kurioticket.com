import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bindingExpression, jsxOpening, namedFunction } from "../../../test-support/sourceStructure";

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
const homepageFarePage = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
const fareRefreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");
const toggle = () => jsxOpening(featurePanel, "button").find(button => button.getText().includes("aria-checked={control.state.enabled}"))!.getText();
const confirmation = () => jsxOpening(featurePanel, "button").find(button => button.getText().includes("onClick={submit}"))!.getText();
const registry = readFileSync("src/lib/feature-controls/registry.ts", "utf8");

test("Settings is the authoritative workspace for persisted administrative controls", () => {
  assert.match(settingsPage, /<AdminPageShell title="Settings" hideHeader>/);
  assert.doesNotMatch(settingsPage, /Environment and access|ContextItem|Your access|Settings store/);
  assert.match(settingsNavigation, /label: "Feature controls"/);
  assert.match(settingsNavigation, /label: "Settings History"/);
  assert.doesNotMatch(settingsPage, /Managed outside Settings|Runtime & credentials/);
  assert.doesNotMatch(settingsPage, /Homepage Fare Operations|\/admin\/homepage-fares/);
  assert.doesNotMatch(settingsPage, /provider health|system health|email delivery health/i);
});

test("settings exposes only real persisted feature controls", () => {
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /listFeatureControls\(\)/);
  assert.match(featureService, /featureFlag\.findMany/);
  assert.match(featureService, /featureFlag\.update/);
  assert.match(featurePanel, /fetch\("\/api\/admin\/feature-controls"/);
  assert.match(featurePanel, /Array\.from\(new Set\(controls\.map\(\(control\) => control\.category\)\)\)/);
  assert.match(featurePanel, /Travel Search|category/);
  assert.match(featurePanel, /controls\s*\.filter\(\(control\) => control\.category === category\)/);
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
  assert.doesNotMatch(namedFunction(settingsPage, "AdminSettingsPage"), /timezone|default currency|preferred market|language preference/i);
});

test("settings starts directly with feature controls and retains authorization inputs", () => {
  assert.match(settingsLayout, /md:grid-cols-\[196px_minmax\(0,1fr\)\]/);
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
  assert.match(featurePanel, /controls\s*\.filter\(\(control\) => control\.category === category\)/);
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
  assert.match(toggle(), /disabled=\{!permitted \|\| saving\}/);
  assert.match(featureService, /dataAvailable = false/);
});

test("deployment secrets are explicitly outside admin Settings", () => {
  assert.doesNotMatch(settingsPage, /process\.env\./);
  assert.doesNotMatch(featurePanel, /API key|database URL|session secret/i);
});

test("homepage fare operations preserve the existing audited mutation path", () => {
  assert.match(homepageFarePage, /HomepageFaresRefreshCard/);
  assert.match(homepageFarePage, /title="Homepage Fare Operations"/);
  assert.match(fareRefreshApi, /requireAdminApiSession\(\)/);
  assert.match(fareRefreshApi, /writeAdminAuditLog/);
  assert.match(fareRefreshApi, /HOMEPAGE_FARES_REFRESHED/);
});


test("settings retains control permissions and current environment context", () => {
  assert.match(settingsPage, /canControlProduction=\{canControlProduction\}/);
  assert.match(settingsPage, /environment=\{featureControls\.environment\}/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.match(settingsPage, /getFeatureControlProductionAdmins/);
});

test("settings keeps related operations and deployment-owned boundaries compact instead of duplicating System", () => {
  assert.doesNotMatch(settingsPage, /href="\/admin\/homepage-fares"|Managed outside Settings|Runtime & credentials|Deployment managed/);
  assert.doesNotMatch(settingsPage, /View system status|View admin configuration status|href="\/admin\/system"/);
});

test("settings feature controls remain grouped and mutation-safe after UI polish", () => {
  assert.match(featurePanel, /role="dialog"/);
  assert.match(featurePanel, /aria-modal="true"/);
  assert.match(toggle(), /disabled=\{!permitted \|\| saving\}/);
  assert.match(featurePanel, /environment === "STAGING" \|\| canControlProduction/);
  assert.match(featurePanel, /type="button"/);
  assert.match(featurePanel, /onClick=\{submit\}/);
  assert.doesNotMatch(featurePanel, /process\.env|ADMIN_EMAILS/);
});

test("feature-control interaction states stay explicit and safe", () => {
  assert.match(featurePanel, /role="switch"/);
  assert.match(featurePanel, /aria-checked=\{control\.state\.enabled\}/);
  assert.match(featurePanel, /aria-label=\{\(control\.state\.enabled \? "Disable " : "Enable "\) \+ control\.name\}/);
  assert.match(featurePanel, /Production controls are view only for your account/);
  assert.match(featurePanel, /event\.key === "Escape" && !saving/);
  assert.match(featurePanel, /Reason for change \(required\)/);
  assert.match(featurePanel, /Add a note \(optional\)/);
  assert.match(featurePanel, /hidden=\{!showOptionalNote\}/);
  assert.match(featurePanel, /disabled=\{saving \|\| !permitted \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
  assert.match(featurePanel, /disabled=\{saving\}[\s\S]*onClick=\{closePending\}/);
  assert.match(featurePanel, /aria-busy=\{saving\}/);
  assert.match(confirmation(), /disabled=\{saving \|\| !permitted \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
  assert.match(featurePanel, /disabled=\{saving\}[\s\S]*value=\{reason\}/);
});

test("successful feature-control changes refresh from persisted server state", () => {
  assert.match(featureApi, /updatedAt: result\.state\.updatedAt\.toISOString\(\)/);
  assert.match(featurePanel, /typeof body\.updatedAt === "string" \? body\.updatedAt : control\.state\.updatedAt/);
  assert.match(featurePanel, /router\.refresh\(\)/);
  assert.equal(bindingExpression(featurePanel, "serverScope"), "JSON.stringify([environment, canControlProduction, operationsAvailable, initialControls])");
  assert.match(featurePanel, /if \(snapshot\.scope !== serverScope\) \{\s*setSnapshot\(\{ scope: serverScope, environment, controls: initialControls \}\)/);
  assert.match(namedFunction(featurePanel, "submit"), /current\.scope !== serverScope \? current/);
  assert.doesNotMatch(featurePanel, /updatedAt: new Date\(\)\.toISOString\(\)/);
});

test("feature-control network failures remain retryable without closing the dialog", () => {
  assert.match(featurePanel, /try \{/);
  assert.match(featurePanel, /catch \{/);
  assert.match(featurePanel, /The control could not be changed\. Please try again\./);
  assert.match(featurePanel, /finally \{/);
  assert.match(featurePanel, /setSaving\(false\)/);
  assert.match(namedFunction(featurePanel, "submit"), /if \(!pending \|\| saving \|\| !permitted\) return/);
});
test("settings uses a single administrative workspace instead of dashboard cards", () => {
  assert.equal(jsxOpening(settingsPage, "AdminPageShell").length, 1);
  assert.match(settingsPage, /<section aria-labelledby="settings-section-title"/);
  assert.doesNotMatch(settingsPage, /SummaryItem|Recent control updates|Related operations|Change safeguards|Protected changes/);
});

test("Settings History uses polished accessible shared dropdowns and a 24-hour default", () => {
  const history = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  const dropdown = readFileSync("src/components/admin/AdminDirectorySelect.tsx", "utf8");
  assert.match(history, /requestedRange as SettingsHistoryRange : "24h"/);
  assert.match(history, /limit: 25/);
  assert.match(history, /<form action=\{fullHistoryPath\} method="get" aria-label="Settings history filters"/);
  assert.doesNotMatch(history, /View full history|Show recent records|Latest recorded changes in the last 24 hrs/);
  assert.match(history, /data-testid="settings-history-filter-row"/);
  assert.match(history, /lg:grid-cols-\[190px_220px_136px\]/);
  assert.match(history, /<SettingsHistoryRangeControl range=\{range\}/);
  assert.match(history, /data-testid="settings-history-filter-row"/);
  assert.match(history, /data-testid="settings-history-category-control"/);
  const rangeControl = readFileSync("src/components/admin/SettingsHistoryRangeControl.tsx", "utf8");
  assert.match(rangeControl, /data-testid="settings-history-range-control"/);
  assert.match(rangeControl, /ADMIN_REPORTING_RANGE_OPTIONS/);
  assert.match(rangeControl, /name="fromDate"/);
  assert.match(rangeControl, /name="toDate"/);
  assert.match(history, /<AdminDirectorySelect label="Section" name="category" value=\{category\}/);
  assert.equal((history.match(/compact attached \/>/g) || []).length, 1);
  assert.doesNotMatch(history, /<select id="settings-history-(range|category)"/);
  assert.match(dropdown, /role="combobox"/);
  assert.match(dropdown, /role="listbox"/);
  assert.match(dropdown, /role="option"/);
  assert.match(dropdown, /<input ref=\{hiddenRef\} type="hidden" name=\{name\}/);
  assert.match(dropdown, /<select\s+id=\{listboxId \+ "-native"\}/);
  assert.match(history, /type="submit" className="focus-ring h-10/);
  assert.match(history, /<SettingsHistoryRow key=\{item.id\} item=\{item\}/);
});

test("Settings History permanently shows its filters and paginated read-only details", () => {
  const recent = readFileSync("src/app/admin/settings/recent-changes/page.tsx", "utf8");
  const reader = readFileSync("src/services/adminSettingsHistoryCore.ts", "utf8");
  assert.match(recent, /cursor: single\(raw.cursor\), limit: 25/);
  assert.match(recent, /<form action=\{fullHistoryPath\} method="get"/);
  assert.doesNotMatch(recent, /\{full \?|View full history|Show recent records/);
  assert.match(recent, /<SettingsHistoryRow key=\{item\.id\} item=\{item\}/);
  assert.match(recent, /<details data-settings-history-record=\{item\.id\}/);
  assert.match(recent, /Read-only change record/);
  assert.match(recent, /name="range"/);
  assert.match(recent, /name="category"/);
  assert.match(recent, /Older records/);
  assert.match(recent, /Back to newest/);
  assert.match(reader, /require|authorize/);
  assert.match(reader, /FEATURE_CONTROL_UPDATED/);
  assert.match(reader, /TEAM_ACCESS_MEMBER_APPROVED/);
  assert.match(reader, /ADMIN_NOTIFICATION_PREFERENCE_UPDATED/);
  assert.match(reader, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(reader, /take: limit \+ 1/);
  assert.match(reader, /Previous state/);
  assert.match(reader, /New state/);
  assert.doesNotMatch(recent, /\/admin\/logs\?|href="\/admin\/logs/);
  assert.doesNotMatch(reader, /ipAddress|userAgent|password|secret/);
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
  assert.match(featureSection, /controls\s*\.filter\(\(control\) => control\.category === category\)/);
  assert.match(featureSection, /hideCategoryHeading/);
  assert.match(featurePanel, /hideCategoryHeading \? undefined/);
  assert.match(notifications, /<AdminAlertAcknowledgeButton/);
  assert.match(notifications, /getAdminAlertSnapshot/);
  assert.match(changes, /result.items.map/);
  assert.match(changes, /adminSettingsHistory\.list/);
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
  assert.match(settingsLayout, /md:grid-cols-\[196px_minmax\(0,1fr\)\]/);
  assert.match(settingsNavigation, /space-y-4/);
  for (const section of [featureSection, notifications, recent]) {
    assert.match(section, /border-b border-\[#D8E1EC\] pb-4/);
    assert.match(section, /text-\[17px\] font-semibold leading-6/);
  }
  assert.doesNotMatch(featureSection, />Feature controls<\/p>/);
  assert.match(featurePanel, /sm:min-w-\[128px\] sm:justify-end/);
  assert.match(notificationPanel, /const visibleAlerts = snapshot\?\.alerts \?\? \[\]/);
  assert.match(recent, /lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,1\.2fr\)_minmax\(0,1\.3fr\)_minmax\(145px,0\.8fr\)\]/);
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
  assert.match(featurePanel, /disabled=\{saving \|\| !permitted \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
});
