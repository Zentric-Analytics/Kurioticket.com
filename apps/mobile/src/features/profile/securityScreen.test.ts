import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");

test("security landing uses compact native settings sections and drill-downs", () => {
  for (const section of ["signInSecurity", "devices", "notifications", "activity", "account"])
    assert.match(security, new RegExp(`<Section title=\\{c\\.${section}\\}`));
  for (const row of ["password", "twoFactor", "passkeys", "yourDevices", "signOutAll", "deleteAccount"])
    assert.match(security, new RegExp(`<SettingRow label=\\{c\\.${row}\\}`));
  assert.match(security, /minHeight: 56/);
  assert.doesNotMatch(security, /borderRadius: 14|styles\.destructive|Manage securely on the web/);
});

test("password fields exist only in a full-screen password flow", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  assert.ok(landingEnd > 0);
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /field\("currentPassword"|field\("newPassword"|field\("confirmPassword"/);
  assert.match(security, /setPasswordOpen\(true\)/);
  assert.match(security, /presentationStyle="fullScreen"/);
  assert.match(security, /travelApi\.changePassword\(passwords\)/);
  assert.match(security, /setPasswordOpen\(false\)/);
  assert.match(security, /travelApi\.requestAccountPasswordReset\(\)/);
});

test("web-only security features retain one secure handoff", () => {
  assert.match(security, /overview\.twoFactorEnabled \? c\.enabled : c\.disabled/);
  assert.match(security, /<SettingRow label=\{c\.twoFactor\}[^>]+onPress=\{web\}/);
  assert.match(security, /<SettingRow label=\{c\.passkeys\}[^>]+onPress=\{web\}/);
  assert.match(security, /<SettingRow label=\{c\.deleteAccount\}[^>]+onPress=\{web\}/);
  assert.match(security, /Linking\.canOpenURL\(WEB\)/);
});

test("devices remain off the landing page and preserve revocation behavior", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /sessions\.map/);
  assert.match(security, /setDevicesOpen\(true\)/);
  assert.match(security, /<ScreenModal visible=\{devicesOpen\}/);
  assert.match(security, /!item\.isCurrent \? <Pressable/);
  assert.match(security, /travelApi\.revokeSecuritySession\(item\.id\)/);
  assert.match(security, /Alert\.alert\(c\.removeTitle, c\.removeBody/);
  assert.match(security, /travelApi\.revokeAllSecuritySessions\(\)/);
  assert.match(security, /Alert\.alert\(c\.signOutTitle, c\.signOutBody/);
  assert.match(security, /label=\{c\.signOutAll\} destructive onPress=\{all\} chevron=\{false\}/);
});

test("notification preference keeps optimistic, race-safe rollback semantics", () => {
  assert.match(security, /const id = \+\+preferenceRequest\.current/);
  assert.match(security, /setOverview\(\{ \.\.\.overview, securityEmailAlerts: value \}\)/);
  assert.match(security, /travelApi\.updateSecurityPreference\(value\)/);
  assert.match(security, /securityEmailAlerts: previous/);
  assert.match(security, /id === preferenceRequest\.current/g);
  assert.match(security, /accessibilityState=\{\{ checked: overview\.securityEmailAlerts, busy: saving \}\}/);
});

test("activity is limited to three until View all is opened", () => {
  assert.match(security, /events\.slice\(0, 3\)\.map/);
  assert.match(security, /events\.length > 3 \? <SettingRow label=\{c\.viewAll\}/);
  assert.match(security, /<ScreenModal visible=\{activityOpen\}/);
  assert.match(security, /events\.map\(\(event\)/);
});

test("security loading and mutations retain API and session-expiry contracts", () => {
  for (const call of ["securityOverview", "securitySessions", "securityActivity"])
    assert.match(security, new RegExp(`travelApi\\.${call}\\(\\)`));
  assert.match(security, /e instanceof TravelApiError && e\.status === 401/);
  assert.match(security, /params: \{ returnTo: "\/security" \}/);
  assert.match(security, /await clearSession\(\)/);
});

test("English and Spanish security copy cover the compact hierarchy", () => {
  for (const phrase of [
    "Manage sign-in and account security for your Kurioticket account.",
    "Gestiona el acceso y la seguridad de tu cuenta de Kurioticket.",
    "Review devices that have recently accessed your account.",
    "Revisa los dispositivos que han accedido recientemente a tu cuenta.",
    "View all", "Ver todo", "Manage on web", "Gestionar en la web",
  ]) assert.ok(security.includes(phrase), `missing copy: ${phrase}`);
});
