import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");

const screenModalStart = security.indexOf("function ScreenModal");
const screenModalEnd = security.indexOf("function SecurityBlock", screenModalStart);
const screenModal = security.slice(screenModalStart, screenModalEnd);

test("shared security modals apply explicit safe-area insets", () => {
  assert.match(security, /import\s*\{[^}]*useSafeAreaInsets[^}]*\}\s*from\s*["']react-native-safe-area-context["']/s);
  assert.match(screenModal, /const\s+insets\s*=\s*useSafeAreaInsets\(\)/);
  assert.match(screenModal, /<Animated\.View\s+accessibilityViewIsModal/);
  assert.doesNotMatch(screenModal, /<SafeAreaView/);
  assert.match(screenModal, /paddingTop:\s*insets\.top/);
  assert.match(screenModal, /paddingBottom:\s*insets\.bottom/);
  assert.match(screenModal, /animationType=["']none["']/);
  assert.match(screenModal, /presentationStyle=["']overFullScreen["']/);
  assert.match(screenModal, /transparent/);
  assert.match(screenModal, /translateX/);
});

test("all native security drill-downs retain the shared modal shell", () => {
  for (const state of ["passkeysOpen", "passwordOpen", "devicesOpen", "activityOpen", "twoFactorOpen", "deletionOpen"])
    assert.match(security, new RegExp(`<ScreenModal\\s+visible=\\{${state}\\}`));
});

test("security landing uses flat descriptive blocks and the native header", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  const landing = security.slice(0, landingEnd);
  assert.match(landing, /<Header title=\{c\.title\} backLabel=\{c\.back\}/);
  for (const row of ["password", "twoFactor", "passkeys", "activeSessions", "activity", "signOutAll"])
    assert.match(landing, new RegExp(`<SecurityBlock label=\\{c\\.${row}\\}`));
  for (const detail of ["passwordHelp", "twoFactorHelp", "passkeysHelp", "activeSessionsHelp", "alertsHelp", "activityHelp", "signOutAllHelp"])
    assert.match(landing, new RegExp(`c\\.${detail}`));
  assert.doesNotMatch(landing, /<Section|shadow|elevation/);
  assert.doesNotMatch(security, /#003B95|#0071C2|Booking/);
});

test("password fields exist only in a full-screen password flow", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  assert.ok(landingEnd > 0);
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /field\("currentPassword"|field\("newPassword"|field\("confirmPassword"/);
  assert.match(security, /const openPassword = \(\) => \{[^}]*clearPasswordFeedback\(\); setPasswordOpen\(true\)/);
  assert.match(security, /presentationStyle="overFullScreen"/);
  assert.match(security, /travelApi\.changePassword\(passwords\)/);
  assert.match(security, /const closePassword = \(\) => \{[^}]*setPasswordOpen\(false\); clearPasswordFeedback\(\)/);
  assert.match(security, /travelApi\.requestAccountPasswordReset\(\)/);
});

test("passkeys use the native security drill-down instead of the web handoff", () => {
  assert.match(security, /<SecurityBlock label=\{c\.twoFactor\}[^>]+onPress=\{openTwoFactor\}/);
  assert.match(security, /<ScreenModal visible=\{twoFactorOpen\}/);
  assert.match(security, /<SecurityBlock label=\{c\.passkeys\}[^>]+onPress=\{openPasskeys\}/);
  assert.match(security, /<ScreenModal visible=\{passkeysOpen\}/);
  assert.match(security, /travelApi\.passkeys\(\)/);
  assert.doesNotMatch(security, /Linking\.canOpenURL|const WEB =|onPress=\{web\}/);
  assert.match(security, /accessibilityLabel=\{c\.deleteAccount\} onPress=\{\(\) => void openDeletion\(\)\}/);
  assert.match(security, /<ScreenModal visible=\{deletionOpen\}/);
});

test("devices remain off the landing page and preserve revocation behavior", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /sessions\.map/);
  assert.match(security, /const openDevices = \(\) => \{[^}]*setDevicesOpen\(true\)/);
  assert.match(security, /<ScreenModal visible=\{devicesOpen\}/);
  assert.match(security, /!item\.isCurrent \? <Pressable/);
  assert.match(security, /travelApi\.revokeSecuritySession\(item\.id\)/);
  assert.match(security, /Alert\.alert\(c\.removeTitle, c\.removeBody/);
  assert.match(security, /travelApi\.revokeAllSecuritySessions\(\)/);
  assert.match(security, /Alert\.alert\(c\.signOutTitle, c\.signOutBody/);
  assert.match(security, /label=\{c\.signOutAll\} description=\{c\.signOutAllHelp\} destructive chevron=\{false\} onPress=\{all\}/);
});

test("notification preference keeps optimistic, race-safe rollback semantics", () => {
  assert.match(security, /const id = \+\+preferenceRequest\.current/);
  assert.match(security, /setOverview\(\{ \.\.\.overview, securityEmailAlerts: value \}\)/);
  assert.match(security, /travelApi\.updateSecurityPreference\(value\)/);
  assert.match(security, /securityEmailAlerts: previous/);
  assert.match(security, /id === preferenceRequest\.current/g);
  assert.match(security, /accessibilityState=\{\{ checked: overview\.securityEmailAlerts, busy: saving \}\}/);
});

test("activity is a single landing block opening the full history", () => {
  const landing = security.slice(0, security.indexOf("<ScreenModal visible={passwordOpen}"));
  assert.match(landing, /label=\{c\.activity\} description=\{c\.activityHelp\} onPress=\{\(\) => setActivityOpen\(true\)\}/);
  assert.doesNotMatch(landing, /events\.slice\(0, 3\)|c\.viewAll|<EventRow/);
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

test("successful deletion reactivation discards the revoked session and requires sign-in", () => {
  const start = security.indexOf("const reactivate = async");
  const end = security.indexOf("const date =", start);
  const reactivate = security.slice(start, end);
  assert.match(reactivate, /await travelApi\.reactivateDeletion\(\)/);
  assert.match(reactivate, /await clearSession\(\)/);
  assert.match(reactivate, /setDeletion\(null\)/);
  assert.match(reactivate, /closeDeletion\(\)/);
  assert.match(reactivate, /router\.replace\(\{ pathname: "\/\(tabs\)\/profile\/sign-in", params: \{ returnTo: "\/security" \} \}\)/);
  assert.doesNotMatch(reactivate, /setLandingMessage\(c\.reactivated\)/);
  assert.match(security, /travelApi\.requestDeletion\(\)/);
  assert.match(security, /Alert\.alert\(c\.deletionConfirmTitle,c\.deletionConfirmBody/);
});

test("visual feedback is owned by the landing and individual security flows", () => {
  assert.doesNotMatch(security, /const \[error, setError\]|const \[message, setMessage\]/);
  for (const state of ["landingError", "landingMessage", "passwordError", "passwordMessage", "devicesError", "twoFactorError", "deletionError", "passkeysError", "passkeysMessage"])
    assert.match(security, new RegExp(`const \\[${state}, set${state[0].toUpperCase()}${state.slice(1)}\\]`));

  const landing = security.slice(security.indexOf("return <SafeAreaView"), security.indexOf("<ScreenModal visible={passkeysOpen}"));
  assert.match(landing, /<Feedback error=\{landingError\} message=\{landingMessage\}/);
  assert.doesNotMatch(landing, /passwordError|passwordMessage|devicesError|twoFactorError|deletionError|passkeysError|passkeysMessage/);
  assert.match(security, /<Feedback error=\{passkeysError\} message=\{passkeysMessage\}/);
  assert.match(security, /<Feedback error=\{passwordError\} message=\{passwordMessage\}/);
  assert.match(security, /<Feedback error=\{devicesError\} message=""/);
  assert.match(security, /<Feedback error=\{twoFactorError\} message=""/);
  assert.match(security, /<Feedback error=\{deletionError\} message=""/);
});

test("drill-down feedback is cleared on both open and close", () => {
  assert.match(security, /openPassword[^\n]+clearPasswordFeedback\(\)[^\n]+setPasswordOpen\(true\)/);
  assert.match(security, /closePassword[^\n]+setPasswordOpen\(false\)[^\n]+clearPasswordFeedback\(\)/);
  for (const flow of ["Devices", "TwoFactor"] ) {
    assert.match(security, new RegExp(`open${flow}[^\\n]+set${flow}Error\\(""\\)[^\\n]+set${flow}Open\\(true\\)`));
    assert.match(security, new RegExp(`close${flow}[^\\n]+set${flow}Open\\(false\\)[^\\n]+set${flow}Error\\(""\\)`));
  }
  assert.match(security, /openDeletion[^\n]+setDeletionError\(""\)[^\n]+setDeletionOpen\(true\)/);
  assert.match(security, /closeDeletion[^\n]+setDeletionOpen\(false\)[^\n]+setDeletionError\(""\)/);
  assert.match(security, /openPasskeys[^\n]+setPasskeysError\(""\)[^\n]+setPasskeysMessage\(""\)[^\n]+setPasskeysOpen\(true\)/);
  assert.match(security, /closePasskeys[^\n]+setPasskeysOpen\(false\)[^\n]+setPasskeysError\(""\)[^\n]+setPasskeysMessage\(""\)/);
});

test("operation failures and messages target only their owning feedback scope", () => {
  const expectations = [
    ["startTwoFactor", "setTwoFactorError"], ["confirmTwoFactor", "setTwoFactorError"], ["disableTwoFactor", "setTwoFactorError"],
    ["change", "setPasswordError"], ["reset", "setPasswordMessage"], ["remove", "setDevicesError"],
    ["openDeletion", "setDeletionError"], ["requestDeletion", "setDeletionError"], ["reactivate", "setDeletionError"],
    ["toggle", "setLandingMessage"], ["all", "setLandingError"],
  ];
  for (let index = 0; index < expectations.length; index += 1) {
    const [operation, setter] = expectations[index];
    const start = security.indexOf(`const ${operation} =`);
    const next = index + 1 < expectations.length ? security.indexOf(`const ${expectations[index + 1][0]} =`, start) : security.indexOf("const date =", start);
    assert.ok(start >= 0, `missing ${operation}`);
    assert.match(security.slice(start, next > start ? next : undefined), new RegExp(`${setter}\\(`), `${operation} should use ${setter}`);
  }
  assert.match(security, /const loadPasskeys = async[^\n]+setPasskeysError\(/);
  assert.match(security, /setLandingError\(c\.loadError\)/);
  assert.match(security, /setLandingError\(c\.saveFailed\)/);
  assert.doesNotMatch(security, /setLandingError\(c\.openFailed\)/);
  assert.match(security, /setLandingError\(c\.signOutFailed\)/);
});

test("late modal requests cannot repopulate feedback after close or reopen", () => {
  for (const flow of ["password", "devices", "twoFactor", "deletion", "passkeys"])
    assert.match(security, new RegExp(`${flow}Request\\.current`));
  assert.match(security, /request === twoFactorRequest\.current/);
  assert.match(security, /request === passwordRequest\.current/);
  assert.match(security, /request === devicesRequest\.current/);
  assert.match(security, /request===deletionRequest\.current/);
  assert.match(security, /request===passkeysRequest\.current/);
});

test("internal modal refreshes do not overwrite landing feedback", () => {
  assert.match(security, /showLandingFeedback = true/);
  assert.match(security, /showLandingFeedback\) setLandingError/);
  assert.match(security, /load\(\{\s*showLandingFeedback:\s*false\s*\}\)/);
});

test("English and Spanish security copy cover the compact hierarchy", () => {
  for (const phrase of [
    "Manage sign-in and account security for your Kurioticket account.",
    "Gestiona el acceso y la seguridad de tu cuenta de Kurioticket.",
    "Review devices that have recently accessed your account.",
    "Revisa los dispositivos que han accedido recientemente a tu cuenta.",
    "Change the password used to sign in to your account.", "Add extra protection with an authenticator app.", "Review devices signed in to your account.", "Sesiones activas",
  ]) assert.ok(security.includes(phrase), `missing copy: ${phrase}`);
});
