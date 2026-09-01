import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) => readFileSync(path, "utf8");

test("profile headers expose notifications only to authenticated users and never settings", () => {
  const authenticated = source("src/features/profile/ProfileScreen.tsx"); const guest = source("src/features/profile/GuestProfileScreen.tsx");
  assert.match(authenticated, /router\.push\("\/notifications"\)/); assert.doesNotMatch(authenticated, /name="settings"/); assert.doesNotMatch(guest, /name="settings"|\/notifications/);
  assert.doesNotMatch(authenticated, /ProfileSummary|identity\.email/);
  assert.match(authenticated, /<WelcomeCard name=\{name\} \/>/);
});

test("customization owns only language, currency, and dark mode", () => {
  const settings = source("src/features/flow/SettingsScreens.tsx");
  for (const owned of ["language", "currency", "darkMode"] as const) assert.match(settings, new RegExp(`t\\(\\"${owned}\\"\\)`));
  for (const removed of ["aboutLegal", "terms", "privacy", "appVersion"] as const) assert.doesNotMatch(settings, new RegExp(`t\\(\\"${removed}\\"\\)`));
  assert.doesNotMatch(settings, /Constants\.expoConfig|document|external/);
  for (const duplicate of ["dashboard/security", "dashboard/preferences/email", "dashboard/preferences/travel"] as const) assert.doesNotMatch(settings, new RegExp(duplicate));
});

test("authenticated and guest profiles each own one guest-accessible legal section", () => {
  const model = source("src/features/profile/profileModel.ts"); const guest = source("src/features/profile/GuestProfileScreen.tsx");
  for (const profile of [model, guest]) {
    assert.equal(profile.match(/title: "aboutLegal"/g)?.length, 1);
    assert.equal(profile.match(/label: "terms"/g)?.length, 1);
    assert.equal(profile.match(/label: "privacy"/g)?.length, 1);
    assert.match(profile, /href: "\/terms"/); assert.match(profile, /href: "\/privacy"/);
  }
});

test("version is a configured non-interactive footer on both profile states", () => {
  const footer = source("src/features/profile/AppVersionFooter.tsx");
  for (const profile of ["ProfileScreen.tsx", "GuestProfileScreen.tsx"]) assert.equal(source(`src/features/profile/${profile}`).match(/<AppVersionFooter \/>/g)?.length, 1);
  assert.match(footer, /Constants\.expoConfig\?\.version/);
  assert.match(footer, /if \(!version\) return null/);
  assert.match(footer, /`\$\{t\("version"\)\} \$\{version\}`/);
  assert.match(footer, /accessibilityLabel=\{label\}/);
  assert.doesNotMatch(footer, /Pressable|accessibilityRole="button"|router|0\.3\.0|0\.1\.0/);
});

test("version footer has no Preview-specific diagnostics UI or subscriptions", () => {
  const footer = source("src/features/profile/AppVersionFooter.tsx");
  assert.doesNotMatch(footer, /isPreview|Preview delivery diagnostics|formatPreviewDiagnostics|getRuntimeDiagnostics/);
  assert.doesNotMatch(footer, /useSyncExternalStore|getUpdateCheckDiagnostics|subscribeToUpdateCheckDiagnostics/);
  assert.doesNotMatch(footer, /\bView\b|preview:|heading:|detail:/);
});
