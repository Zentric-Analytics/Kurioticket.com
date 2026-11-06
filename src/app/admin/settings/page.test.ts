import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const featurePanel = readFileSync("src/components/admin/FeatureControlsPanel.tsx", "utf8");
const featureApi = readFileSync("src/app/api/admin/feature-controls/route.ts", "utf8");
const featureService = readFileSync("src/lib/feature-controls/service.ts", "utf8");
const registry = readFileSync("src/lib/feature-controls/registry.ts", "utf8");

test("Settings is the authoritative workspace for persisted administrative controls", () => {
  assert.match(settingsPage, /<AdminPageShell title="Settings" hideHeader>/);
  assert.doesNotMatch(settingsPage, /Environment and access|ContextItem|Your access|Settings store/);
  assert.match(settingsPage, />Feature controls<\/h2>/);
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
  assert.match(settingsPage, /<div className="w-full min-w-0 bg-white text-\[#020617\]">\s*<section aria-labelledby="feature-controls-heading" className="border-b border-\[#D8E1EC\] pb-5">/);
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
  assert.match(featurePanel, /\{control\.risk\} · \{control\.kind\}/);
});

test("Settings starts with a short instruction without implying service health", () => {
  assert.match(settingsPage, /Turn Kurioticket features on or off\./);
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
  assert.match(featurePanel, /Reason \{environment === "PRODUCTION" \? "\(required\)" : "\(optional\)"\}/);
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

test("recent settings changes link to the authoritative filtered audit trail", () => {
  assert.match(settingsPage, /href="\/admin\/logs\?range=30d&action=FEATURE_CONTROL_UPDATED&targetType=FeatureFlag"/);
  assert.match(settingsPage, />\s*View audit history\s*<\/Link>/);
  assert.match(settingsPage, /recentControlUpdates/);
  assert.match(settingsPage, /No persisted control updates yet/);
  assert.doesNotMatch(settingsPage, /updatedBy|admin email address/i);
});

test("Settings omits nonactionable deployment and access documentation", () => {
  assert.doesNotMatch(settingsPage, /Managed outside Settings|Runtime & credentials|Administrator access|Deployment managed|Access managed separately/);
  assert.doesNotMatch(settingsPage, /process\.env\./);
  assert.doesNotMatch(featurePanel, /API key|database URL|session secret/i);
});

test("settings uses a flat administrative layout rather than dashboard cards", () => {
  assert.doesNotMatch(settingsPage, /AdminSectionCard/);
  assert.match(settingsPage, /border-b border-\[#D8E1EC\]/);
  assert.match(settingsPage, /border-y border-\[#D8E1EC\]/);
  assert.doesNotMatch(settingsPage, /SummaryItem|Protected changes|Persisted feature state|Turn major travel functions on or off/);
});

test("the Deals feature flag is presented as Packages without changing the internal key", () => {
  assert.match(registry, /DEALS_ENABLED: control\("Packages", "Controls Packages entry points/);
  assert.match(featurePanel, /DEALS_ENABLED: "Controls Packages availability\."/);
  assert.doesNotMatch(featurePanel, /Controls Deals availability\./);
  assert.match(registry, /DEALS_ENABLED/);
});
