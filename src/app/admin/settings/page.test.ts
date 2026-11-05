import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const homepageFarePage = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
const featurePanel = readFileSync("src/components/admin/FeatureControlsPanel.tsx", "utf8");
const featureApi = readFileSync("src/app/api/admin/feature-controls/route.ts", "utf8");
const featureService = readFileSync("src/lib/feature-controls/service.ts", "utf8");
const fareRefreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");

test("settings exposes real persisted controls rather than fake toggles", () => {
  assert.match(settingsPage, />Feature controls<\/h2>/);
  assert.match(settingsPage, />Operations<\/h2>/);
  assert.match(settingsPage, />Configuration ownership<\/h2>/);
  assert.match(settingsPage, />Recent changes<\/h2>/);
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /listFeatureControls\(\)/);
  assert.match(featureService, /featureFlag\.findMany/);
  assert.match(featureService, /featureFlag\.update/);
  assert.match(featurePanel, /fetch\("\/api\/admin\/feature-controls"/);
  assert.match(featurePanel, /Array\.from\(new Set\(controls\.map\(\(control\) => control\.category\)\)\)/);
  assert.match(featurePanel, /Travel Search|category/);
  assert.match(featurePanel, /controls\.filter\(\(control\) => control\.category === category\)/);
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

test("deployment secrets are explicitly outside admin Settings", () => {
  assert.match(settingsPage, /Secrets and runtime credentials remain deployment-owned/);
  assert.match(settingsPage, /Database URLs, API keys, session secrets, provider credentials and server environment variables are not editable here/);
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


test("settings starts directly with feature controls while keeping permission logic underneath", () => {
  assert.match(settingsPage, /<AdminPageShell title="Settings" hideHeader>/);
  assert.doesNotMatch(settingsPage, /aria-label="Environment and access"|ContextItem|Store available|Can edit Staging|Can edit Production|Manage platform controls and operational configuration/);
  assert.match(settingsPage, /featureControls\.dataAvailable/);
  assert.match(settingsPage, /canControlProduction/);
  assert.match(settingsPage, /environment=\{featureControls\.environment\}/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.match(settingsPage, /recentControlUpdates/);
  assert.match(settingsPage, /No persisted control updates yet/);
  assert.doesNotMatch(settingsPage, /updatedBy|change reason|admin email address/i);
});

test("settings keeps related operations and deployment-owned boundaries compact instead of duplicating System", () => {
  assert.match(settingsPage, /href="\/admin\/homepage-fares"/);
  assert.match(settingsPage, /Homepage Fare Operations/);
  assert.match(settingsPage, /Configuration ownership/);
  assert.match(settingsPage, /Managed externally/);
  assert.match(settingsPage, /Runtime & credentials/);
  assert.match(settingsPage, /Admin access/);
  assert.doesNotMatch(settingsPage, /View system status|View admin configuration status|href="\/admin\/system"|href="\/admin\/logs"/);
});

test("settings feature controls remain grouped and mutation-safe after UI polish", () => {
  assert.match(featurePanel, /role="dialog"/);
  assert.match(featurePanel, /aria-modal="true"/);
  assert.match(featurePanel, /Reason \{environment === "PRODUCTION" \? "\(required\)" : "\(optional\)"\}/);
  assert.match(featurePanel, /disabled=\{!permitted\}/);
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
  assert.match(featurePanel, /disabled=\{saving \|\| \(environment === "PRODUCTION" && !reason\.trim\(\)\)\}/);
  assert.match(featurePanel, /disabled=\{saving\}[\s\S]*value=\{reason\}/);
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

test("settings uses a single administrative workspace instead of dashboard cards", () => {
  assert.match(settingsPage, /<AdminSectionCard className="overflow-hidden p-0">/);
  assert.match(settingsPage, /<section aria-labelledby="feature-controls-heading" className="px-4 py-5 sm:px-5">/);
  assert.equal((settingsPage.match(/<AdminSectionCard/g) || []).length, 1);
  assert.match(settingsPage, /border-t border-slate-200 px-4 py-5/);
  assert.doesNotMatch(settingsPage, /SummaryItem|Recent control updates|Related operations|Deployment-owned configuration|Change safeguards|Protected changes|Persisted feature state|Turn major travel functions on or off/);
  assert.match(settingsPage, /Recent changes/);
});

test("feature controls render as settings rows with switches instead of status pills", () => {
  assert.match(featurePanel, /role="switch"/);
  assert.match(featurePanel, /aria-checked=\{control\.state\.enabled\}/);
  assert.match(featurePanel, /translate-x-6/);
  assert.match(featurePanel, /translate-x-1/);
  assert.match(featurePanel, /Enabled/);
  assert.match(featurePanel, /Disabled/);
  assert.doesNotMatch(featurePanel, /formatChangedDate|Changed \$\{/);
});

test("settings keeps only concise production-facing helper copy", () => {
  assert.doesNotMatch(settingsPage, /Turn major travel functions on or off\. Every change requires confirmation\./);
  assert.doesNotMatch(settingsPage, /Provider-backed homepage fare readiness and refresh\./);
  assert.doesNotMatch(settingsPage, /Persisted feature state/);
  assert.doesNotMatch(settingsPage, /Protected changes|Production authorization|Recent reauthentication|No secrets exposed/);
  assert.match(featurePanel, /Controls flight search availability\./);
  assert.match(featurePanel, /Controls hotel search availability\./);
  assert.match(featurePanel, /Controls car search availability\./);
  assert.match(featurePanel, /Controls Deals availability\./);
  assert.match(featurePanel, /Controls price-alert creation and reactivation\./);
  assert.match(featurePanel, /Controls automatic price checks and alert delivery\./);
});

test("confirmation dialog keeps full registry descriptions even when settings rows are concise", () => {
  assert.match(featurePanel, /controlRowSummaries\[control\.key\]/);
  assert.match(featurePanel, /<p className="mt-3 text-\[13px\] leading-5 text-slate-600">\{pending\.control\.description\}<\/p>/);
});