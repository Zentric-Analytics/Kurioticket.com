import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");

const screenModalStart = security.indexOf("function ScreenModal");
const screenModalEnd = security.indexOf("function SecurityBlock", screenModalStart);
const screenModal = security.slice(screenModalStart, screenModalEnd);

test("shared security modals use the proven over-full-screen presentation shell", () => {
  assert.match(security, /import\s*\{[^}]*useSafeAreaInsets[^}]*\}\s*from\s*["']react-native-safe-area-context["']/s);
  assert.match(security, /import\s*\{[^}]*Animated[^}]*useWindowDimensions[^}]*\}\s*from\s*["']react-native["']/s);
  assert.match(screenModal, /const\s+insets\s*=\s*useSafeAreaInsets\(\)/);
  assert.match(screenModal, /const\s+\{\s*width\s*\}\s*=\s*useWindowDimensions\(\)/);
  assert.match(screenModal, /new Animated\.Value\(width\)/);
  assert.match(screenModal, /<Modal transparent animationType="none" presentationStyle="overFullScreen"/);
  assert.match(screenModal, /<Animated\.View\s+accessibilityViewIsModal/);
  assert.doesNotMatch(screenModal, /<SafeAreaView/);
  assert.match(screenModal, /paddingTop:\s*insets\.top/);
  assert.match(screenModal, /paddingBottom:\s*insets\.bottom/);
  assert.doesNotMatch(screenModal, /animationType=["']slide["']/);
  assert.doesNotMatch(screenModal, /presentationStyle=["']fullScreen["']/);
});

test("shared security modals animate in and defer hiding until push-out finishes", () => {
  assert.match(screenModal, /translateX\.setValue\(width\)/);
  assert.match(screenModal, /toValue:\s*0,\s*duration:\s*240,\s*useNativeDriver:\s*true/s);
  assert.match(screenModal, /toValue:\s*width,\s*duration:\s*220,\s*useNativeDriver:\s*true/s);
  assert.match(screenModal, /visible=\{presented\}/);
  assert.match(screenModal, /\.start\(\(\{ finished \}\) => \{[\s\S]*setModalPresented\(false\)/);
  assert.match(screenModal, /const requestClose = \(\) => \{[\s\S]*animateClosed\(onClose\)/);
});

test("shared security modal guards rapid reopen and stale dismiss callbacks", () => {
  assert.match(screenModal, /const transitionRef = useRef\(0\)/);
  assert.match(screenModal, /transition !== transitionRef\.current/);
  assert.match(screenModal, /visibleRef\.current !== visible/);
  assert.match(screenModal, /if \(visibleRef\.current \|\| presentedRef\.current\) return/);
  assert.match(screenModal, /const isOpening = visible && !wasVisibleRef\.current/);
});

test("all native security drill-downs retain the shared modal shell", () => {
  for (const state of ["passwordOpen", "devicesOpen", "activityOpen"])
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

test("password fields exist only in the shared modal password flow", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  assert.ok(landingEnd > 0);
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /field\("currentPassword"|field\("newPassword"|field\("confirmPassword"/);
  assert.match(security, /setPasswordOpen\(true\)/);
  assert.match(security, /<ScreenModal visible=\{passwordOpen\}/);
  assert.match(security, /travelApi\.changePassword\(passwords\)/);
  assert.match(security, /setPasswordOpen\(false\)/);
  assert.match(security, /travelApi\.requestAccountPasswordReset\(\)/);
});

test("web-only security features retain one secure handoff", () => {
  assert.match(security, /<SecurityBlock label=\{c\.twoFactor\}[^>]+onPress=\{web\}/);
  assert.match(security, /<SecurityBlock label=\{c\.passkeys\}[^>]+onPress=\{web\}/);
  assert.match(security, /accessibilityLabel=\{c\.deleteAccount\} onPress=\{web\}/);
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

test("English and Spanish security copy cover the compact hierarchy", () => {
  for (const phrase of [
    "Manage sign-in and account security for your Kurioticket account.",
    "Gestiona el acceso y la seguridad de tu cuenta de Kurioticket.",
    "Review devices that have recently accessed your account.",
    "Revisa los dispositivos que han accedido recientemente a tu cuenta.",
    "Change the password used to sign in to your account.", "Add extra protection with an authenticator app.", "Review devices signed in to your account.", "Sesiones activas",
  ]) assert.ok(security.includes(phrase), `missing copy: ${phrase}`);
});
