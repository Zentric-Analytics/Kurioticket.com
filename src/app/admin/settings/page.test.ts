import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bindingExpression, jsxOpening, namedFunction } from "../../../test-support/sourceStructure";

const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
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
  assert.match(settingsPage, /aria-label="Environment and access"/);
  assert.match(settingsPage, /ContextItem label="Environment"/);
  assert.match(settingsPage, /ContextItem label="Your access"/);
  assert.match(settingsPage, /ContextItem label="Settings store"/);
  assert.match(settingsPage, />Feature controls<\/h2>/);
  assert.match(settingsPage, />Recent settings changes<\/h2>/);
  assert.match(settingsPage, />Managed outside Settings<\/h2>/);
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

test("settings makes environment, edit access and store availability explicit", () => {
  assert.match(settingsPage, /featureControls\.environment === "PRODUCTION" \? "Production" : "Staging"/);
  assert.match(settingsPage, /const canEditControls =/);
  assert.match(settingsPage, /featureControls\.dataAvailable/);
  assert.match(settingsPage, /featureControls\.environment === "STAGING" \|\| canControlProduction/);
  assert.match(settingsPage, /const accessLabel = canEditControls \? "Can edit" : featureControls\.dataAvailable \? "View only" : "Unavailable"/);
  assert.match(settingsPage, /const storeLabel = featureControls\.dataAvailable \? "Available" : "Read-only fallback"/);
});

test("feature controls distinguish product availability from travel automation", () => {
  assert.match(featurePanel, /"Travel Search": "Product availability"/);
  assert.match(featurePanel, /"Travel Automation": "Travel automation"/);
  assert.match(featurePanel, /Controls whether customer-facing travel products are available/);
  assert.match(featurePanel, /Controls background and customer automation without changing saved state/);
  assert.match(featurePanel, /controls\s*\.filter\(\(control\) => control\.category === category\)/);
  assert.match(featurePanel, /Controls flight search availability\./);
  assert.match(featurePanel, /Controls hotel search availability\./);
  assert.match(featurePanel, /Controls car search availability\./);
  assert.match(featurePanel, /Controls Packages availability\./);
  assert.match(featurePanel, /Controls price-alert creation and reactivation\./);
  assert.match(featurePanel, /Controls automatic price checks and alert delivery\./);
});

test("Settings explains that enabled controls do not claim operational health", () => {
  assert.match(settingsPage, /Persisted controls determine whether Kurioticket capabilities may operate/);
  assert.match(settingsPage, /Operational health is monitored in Providers and the relevant operational workspaces/);
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
  assert.match(settingsPage, /Administrator allowlists and production feature-control permissions remain server-managed/);
  assert.match(settingsPage, /Database URLs, API keys, session secrets, provider credentials and server environment variables remain deployment-owned and are not editable here/);
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
  assert.match(settingsPage, /<AdminPageShell title="Settings" hideHeader>/);
  assert.match(settingsPage, /aria-label="Environment and access"/);
  assert.match(settingsPage, /featureControls\.dataAvailable/);
  assert.match(settingsPage, /canControlProduction/);
  assert.match(settingsPage, /environment=\{featureControls\.environment\}/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.match(settingsPage, /recentControlUpdates/);
  assert.match(settingsPage, /No persisted control updates yet/);
  assert.doesNotMatch(settingsPage, /updatedBy|change reason|admin email address/i);
});

test("settings keeps related operations and deployment-owned boundaries compact instead of duplicating System", () => {
  assert.doesNotMatch(settingsPage, /href="\/admin\/homepage-fares"/);
  assert.match(settingsPage, /Managed outside Settings/);
  assert.match(settingsPage, /Administrator access/);
  assert.match(settingsPage, /Deployment managed/);
  assert.match(settingsPage, /Runtime & credentials/);
  assert.match(settingsPage, /Access managed separately/);
  assert.doesNotMatch(settingsPage, /View system status|View admin configuration status|href="\/admin\/system"/);
});

test("settings feature controls remain grouped and mutation-safe after UI polish", () => {
  assert.match(featurePanel, /role="dialog"/);
  assert.match(featurePanel, /aria-modal="true"/);
  assert.match(featurePanel, /Reason \{environment === "PRODUCTION" \? "\(required\)" : "\(optional\)"\}/);
  assert.match(toggle(), /disabled=\{!permitted \|\| saving\}/);
  assert.match(featurePanel, /environment === "STAGING" \|\| canControlProduction/);
  assert.match(featurePanel, /type="button"/);
  assert.match(featurePanel, /Confirm change/);
  assert.doesNotMatch(featurePanel, /process\.env|ADMIN_EMAILS/);
});

test("feature-control interaction states stay explicit and safe", () => {
  assert.match(featurePanel, /role="switch"/);
  assert.match(featurePanel, /aria-checked=\{control\.state\.enabled\}/);
  assert.match(featurePanel, /aria-label=\{\(control\.state\.enabled \? "Disable " : "Enable "\) \+ control\.name\}/);
  assert.match(featurePanel, /Production controls are view only for your account/);
  assert.match(featurePanel, /event\.key === "Escape" && !saving/);
  assert.match(featurePanel, /disabled=\{saving\}[\s\S]*onClick=\{closePending\}/);
  assert.match(featurePanel, /aria-busy=\{saving\}/);
  assert.match(confirmation(), /disabled=\{saving \|\| !permitted \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
  assert.match(featurePanel, /disabled=\{saving\}[\s\S]*value=\{reason\}/);
  assert.match(featurePanel, /Reason \{environment === "PRODUCTION" \? "\(required\)" : "\(optional\)"\}/);
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
  assert.match(settingsPage, /<section aria-labelledby="feature-controls-heading"/);
  assert.equal((settingsPage.match(/id="feature-controls-heading"/g) || []).length, 1);
  assert.match(settingsPage, /border-b border-\[#D8E1EC\]/);
  assert.doesNotMatch(settingsPage, /SummaryItem|Recent control updates|Related operations|Change safeguards|Protected changes|Turn major travel functions on or off/);
  assert.match(settingsPage, /Recent settings changes/);
});

test("recent settings changes link to the authoritative filtered audit trail", () => {
  assert.match(settingsPage, /href="\/admin\/logs\?range=30d&action=FEATURE_CONTROL_UPDATED&targetType=FeatureFlag"/);
  assert.match(settingsPage, />\s*View settings audit history\s*<\/Link>/);
  assert.match(settingsPage, /recentControlUpdates/);
  assert.match(settingsPage, /No persisted control updates yet/);
  assert.doesNotMatch(settingsPage, /updatedBy|admin email address/i);
});

test("deployment secrets and access ownership stay outside Settings", () => {
  assert.match(settingsPage, /Managed outside Settings/);
  assert.match(settingsPage, /Runtime & credentials/);
  assert.match(settingsPage, /Database URLs, API keys, session secrets, provider credentials and server environment variables remain deployment-owned and are not editable here/);
  assert.match(settingsPage, /Administrator access/);
  assert.match(settingsPage, /Administrator allowlists and production feature-control permissions remain server-managed/);
  assert.match(settingsPage, /Team Access/);
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
