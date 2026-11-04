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
  assert.match(settingsPage, /Manage persisted platform controls/);
  assert.match(settingsPage, />Platform controls<\/h2>/);
  assert.match(settingsPage, />Recent control updates<\/h2>/);
  assert.match(settingsPage, />Related operations<\/h2>/);
  assert.match(settingsPage, />Deployment-owned configuration<\/h2>/);
  assert.match(settingsPage, />Change safeguards<\/h2>/);
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


test("settings shows truthful operator context without exposing secret configuration", () => {
  assert.match(settingsPage, /label="Environment"/);
  assert.match(settingsPage, /label="Control store"/);
  assert.match(settingsPage, /label="Current access"/);
  assert.match(settingsPage, /label="Production access"/);
  assert.match(settingsPage, /featureControls\.dataAvailable/);
  assert.match(settingsPage, /canControlProduction/);
  assert.match(settingsPage, /recentControlUpdates/);
  assert.match(settingsPage, /No persisted control updates yet/);
  assert.doesNotMatch(settingsPage, /updatedBy|change reason|admin email address/i);
});

test("settings keeps related operations and deployment-owned boundaries compact instead of duplicating System", () => {
  assert.match(settingsPage, /href="\/admin\/homepage-fares"/);
  assert.match(settingsPage, /Homepage Fare Operations/);
  assert.match(settingsPage, /Managed outside Admin/);
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