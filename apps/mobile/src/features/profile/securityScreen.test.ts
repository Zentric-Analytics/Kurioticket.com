import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const passwordChangeFlow = readFileSync("src/features/profile/PasswordChangeFlow.tsx", "utf8");
const resetFlow = readFileSync("src/features/profile/PasswordResetFlow.tsx", "utf8");
const passwordFlowLocalization = readFileSync("src/features/profile/passwordFlowLocalization.ts", "utf8");
const twoFactorEnabledFlow = readFileSync("src/features/profile/TwoFactorEnabledFlow.tsx", "utf8");
const localization = readFileSync("src/features/profile/securityLocalization.ts", "utf8");

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

test("password screen keeps change and recovery flows separate", () => {
  const landingEnd = security.indexOf("<ScreenModal visible={passwordOpen}");
  assert.ok(landingEnd > 0);
  const landing = security.slice(0, landingEnd);
  assert.doesNotMatch(landing, /currentPassword|newPassword|confirmPassword/);
  assert.match(security, /const \[passwordMode, setPasswordMode\] = useState<"change" \| "reset">\("change"\)/);
  assert.match(security, /<PasswordChangeFlow/);
  assert.match(security, /active=\{passwordOpen && passwordMode === "change"\}/);
  assert.match(security, /onRecovery=\{\(\) => setPasswordMode\("reset"\)\}/);
  assert.match(security, /<PasswordResetFlow active=\{passwordOpen && passwordMode === "reset"\} copy=\{c\} onUnauthorized=\{unauth\}/);
  assert.doesNotMatch(security, /travelApi\.changePassword\(/);
});

test("password change form is polished with per-field visibility controls and rules first", () => {
  const rulesAt = passwordChangeFlow.indexOf("{copy.passwordRules}");
  const currentAt = passwordChangeFlow.indexOf("label={copy.current}");
  const nextAt = passwordChangeFlow.indexOf("label={copy.next}");
  const confirmAt = passwordChangeFlow.indexOf("label={copy.confirm}");
  const actionAt = passwordChangeFlow.indexOf("label={copy.change}");
  assert.ok(rulesAt >= 0 && rulesAt < currentAt);
  assert.ok(currentAt < nextAt && nextAt < confirmAt && confirmAt < actionAt);
  assert.match(passwordChangeFlow, /function EyeIcon/);
  assert.match(passwordChangeFlow, /currentPassword:\s*true,\s*newPassword:\s*true,\s*confirmPassword:\s*true/);
  assert.match(passwordChangeFlow, /currentPassword: !current\.currentPassword/);
  assert.match(passwordChangeFlow, /newPassword: !current\.newPassword/);
  assert.match(passwordChangeFlow, /confirmPassword: !current\.confirmPassword/);
  assert.doesNotMatch(passwordChangeFlow, />Show password<|>Hide password</);
  assert.match(passwordChangeFlow, /validateForm\(\)/);
  assert.match(passwordChangeFlow, /passwords\.newPassword\.length < 8/);
  assert.match(passwordChangeFlow, /passwords\.newPassword !== passwords\.confirmPassword/);
  assert.match(passwordChangeFlow, /passwords\.currentPassword === passwords\.newPassword/);
});

test("password change requires a verification code before the password is committed", () => {
  assert.match(passwordChangeFlow, /securityPasswordChangeApi\.start\(passwords\)/);
  assert.match(passwordChangeFlow, /setStage\("verify"\)/);
  assert.match(passwordChangeFlow, /f\.verifyBody\(challenge\.maskedEmail\)/);
  assert.match(passwordChangeFlow, /keyboardType="number-pad"/);
  assert.match(passwordChangeFlow, /textContentType="oneTimeCode"/);
  assert.match(passwordChangeFlow, /maxLength=\{6\}/);
  assert.match(passwordChangeFlow, /\^\\d\{6\}\$/);
  assert.match(passwordChangeFlow, /securityPasswordChangeApi\.confirm\(/);
  assert.match(passwordChangeFlow, /challengeId:\s*challenge\.challengeId/);
  assert.match(passwordChangeFlow, /label=\{f\.verifyChangeAction\}/);
});

test("password change resend countdown is server-aware and recovery is local to the open screen", () => {
  assert.match(passwordChangeFlow, /resendAfterSeconds \* 1000/);
  assert.match(passwordFlowLocalization, /const mmss = \(seconds: number\) => `00:\$\{String\(Math\.max\(0, seconds\)\)\.padStart\(2, "0"\)\}`/);
  assert.match(passwordFlowLocalization, /resendIn: \(s\) => `Request new code in \$\{mmss\(s\)\}`/);
  assert.match(passwordChangeFlow, /securityPasswordChangeApi\.resend\(/);
  assert.match(passwordChangeFlow, /retryAfterSeconds/);
  assert.match(passwordChangeFlow, /setResendUntil\(Date\.now\(\) \+ retryAfter \* 1000\)/);
  assert.match(passwordChangeFlow, /const \[wrongCurrentAttempts, setWrongCurrentAttempts\] = useState\(0\)/);
  assert.match(passwordChangeFlow, /if \(attempts >= 3\) setRecoveryAvailable\(true\)/);
  assert.match(passwordChangeFlow, /setWrongCurrentAttempts\(0\); setRecoveryAvailable\(false\)/);
  assert.doesNotMatch(passwordChangeFlow, /securityPasswordChangeApi\.status\(\)/);
  assert.match(passwordChangeFlow, /recoveryAvailable \?/);
  assert.match(passwordChangeFlow, /onPress=\{onRecovery\}/);
});

test("password verification copy covers every supported mobile locale", async () => {
  const { mobileLocaleCodes } = await import("../../localization/mobileLocalizationCatalog");
  assert.match(passwordFlowLocalization, /export const passwordFlowCopy: Record<MobileLocale, PasswordFlowCopy> = \{/);
  for (const locale of mobileLocaleCodes) {
    const key = locale.includes("-") ? `"${locale}"` : locale;
    assert.ok(passwordFlowLocalization.includes(`${key}: {`), `${locale} must have password verification copy`);
  }
});

test("password reset verifies identity before creating the new password", () => {
  assert.match(resetFlow, /securityPasswordResetApi\.sendCode\(\)/);
  assert.match(resetFlow, /setStage\("verify"\)/);
  assert.match(resetFlow, /\^\\d\{6\}\$/);
  assert.match(resetFlow, /securityPasswordResetApi\.verifyCode\(code\)/);
  assert.match(resetFlow, /setRecoveryToken\(result\.recoveryToken\)/);
  assert.match(resetFlow, /setStage\("create"\)/);
  assert.match(resetFlow, /securityPasswordResetApi\.reset\(\{ recoveryToken, newPassword, confirmPassword \}\)/);
  assert.match(resetFlow, /keyboardType="number-pad"/);
  assert.match(resetFlow, /maxLength=\{6\}/);
  assert.match(resetFlow, /newPassword\.length < 8/);
  assert.match(resetFlow, /newPassword !== confirmPassword/);
  assert.match(resetFlow, /e instanceof TravelApiError && e\.status === 410/);
  assert.match(resetFlow, /setStage\("sending"\)/);
  assert.match(resetFlow, /if \(restartVerification\) void sendCode\(\)/);
});

test("password feedback stays visually stable", () => {
  assert.match(security, /setTimeout\(\(\) => setLandingMessage\(""\), 2000\)/);
  assert.match(security, /<FloatingNotice message=\{landingMessage\} \/>/);
  assert.match(security, /function FloatingNotice/);
  assert.match(security, /duration: 180/);
  assert.match(security, /feedbackSlot: \{ minHeight: 20/);
  assert.match(passwordChangeFlow, /fieldFeedback: \{ minHeight: 20/);
  assert.match(passwordChangeFlow, /accessibilityRole="alert"/);
  assert.match(passwordChangeFlow, /accessibilityLiveRegion="polite"/);
  assert.match(resetFlow, /fieldFeedback: \{ minHeight: 20/);
  assert.match(resetFlow, /accessibilityRole="alert"/);
  assert.match(resetFlow, /accessibilityLiveRegion="polite"/);
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
  assert.match(security, /!item\.isCurrent\?<Pressable/);
  assert.match(security, /travelApi\.revokeSecuritySession\(item\.id\)/);
  assert.match(security, /Alert\.alert\(c\.removeTitle, c\.removeBody/);
  assert.match(security, /travelApi\.revokeAllSecuritySessions\(\)/);
  assert.match(security, /Alert\.alert\(c\.signOutTitle, c\.signOutBody/);
  assert.match(security, /label=\{c\.signOutAll\} description=\{c\.signOutAllHelp\} destructive chevron=\{false\} onPress=\{all\}/);
});

test("active sessions use compact localized cards without raw client values or an empty feedback slot", () => {
  const start = security.indexOf('<ScreenModal visible={devicesOpen}');
  const end = security.indexOf('<ScreenModal visible={activityOpen}', start);
  const devices = security.slice(start, end);
  assert.match(devices, /title=\{c\.activeSessions\}/);
  assert.doesNotMatch(devices, /title=\{c\.yourDevices\}|<Feedback/);
  assert.match(devices, /styles\.devicesContent/);
  assert.match(devices, /<SessionRow/);
  assert.match(devices, /devicesError \? <Text accessibilityRole="alert"/);
  assert.match(devices, /sessions\.length \?/);
  assert.match(devices, /c\.noActiveSessions/);
  assert.match(security, /borderRadius: 12/);
  assert.match(security, /<Smartphone size=\{20\}/);
  assert.doesNotMatch(devices, /\{item\.client\}/);
});

test("session rows trust isCurrent and require menu plus confirmation before revocation", () => {
  const row = security.slice(security.indexOf("function SessionRow"), security.indexOf("function BottomSheet"));
  assert.match(row, /item\.isCurrent\?<Text/);
  assert.match(row, /!item\.isCurrent\?<Pressable/);
  assert.match(row, /onPress=\{\(\)=>onManage\(item\)\}/);
  assert.doesNotMatch(row, /revokeSecuritySession/);
  assert.match(security, /visible=\{Boolean\(managedSession\)\}/);
  assert.match(security, /if\(item\)remove\(item\)/);
  assert.match(security, /Alert\.alert\(c\.removeTitle, c\.removeBody,[^;]+onPress: \(\) => void travelApi\.revokeSecuritySession\(item\.id\)/);
  assert.match(security, /revokeSecuritySession\(item\.id\)\.then\(\(\) => load\(\{ showLandingFeedback: false, showLoading: false \}\)\)/);
});

test("session details localize canonical mobile platforms and omit legacy unknown metadata", () => {
  const formatter = security.slice(security.indexOf("export function sessionDetails"), security.indexOf("function SessionRow"));
  assert.match(formatter, /=== "ios" \? copy\.iphone/);
  assert.match(formatter, /=== "android" \? copy\.android/);
  assert.match(formatter, /copy\.kurioticketApp/);
  assert.match(formatter, /unknown\(\?: platform\)\?/);
  assert.doesNotMatch(formatter, /Unknown platform|\[item\.client/);
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
  assert.match(security, /signInHref\("\/security"\)/);
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
  assert.match(reactivate, /router\.replace\(signInHref\("\/security"\)\)/);
  assert.doesNotMatch(reactivate, /setLandingMessage\(c\.reactivated\)/);
  assert.match(security, /travelApi\.requestDeletion\(\)/);
  assert.match(security, /Alert\.alert\(c\.deletionConfirmTitle,c\.deletionConfirmBody/);
});

test("visual feedback is owned by the landing and individual security flows", () => {
  assert.doesNotMatch(security, /const \[error, setError\]|const \[message, setMessage\]/);
  for (const state of ["landingError", "landingMessage", "devicesError", "twoFactorError", "deletionError", "passkeysError"])
    assert.match(security, new RegExp(`const \\[${state}, set${state[0].toUpperCase()}${state.slice(1)}\\]`));

  const landing = security.slice(security.indexOf("return <SafeAreaView"), security.indexOf("<ScreenModal visible={passkeysOpen}"));
  assert.match(landing, /<Feedback error=\{landingError\} message=""/);
  assert.match(landing, /<FloatingNotice message=\{landingMessage\}/);
  assert.doesNotMatch(landing, /devicesError|twoFactorError|deletionError|passkeysError/);
  assert.doesNotMatch(security, /<Feedback error=\{passkeysError\}/);
  assert.match(security, /loadError=\{passkeysError\}/);
  assert.match(security, /devicesError \? <Text accessibilityRole="alert" style=\{styles\.error\}>\{devicesError\}<\/Text> : null/);
  assert.doesNotMatch(security, /<Feedback error=\{devicesError\}/);
  assert.match(security, /<Feedback error=\{twoFactorError\} message=""/);
  assert.match(security, /<Feedback error=\{deletionError\} message=""/);
  assert.match(passwordChangeFlow, /const \[fieldErrors, setFieldErrors\] = useState<FieldErrors>\(\{\}\)/);
  assert.match(passwordChangeFlow, /const \[generalError, setGeneralError\] = useState\(""\)/);
  assert.match(passwordChangeFlow, /const \[message, setMessage\] = useState\(""\)/);
});

test("drill-down feedback is cleared on both open and close", () => {
  assert.match(security, /openPassword[^\n]+setPasswordMode\([^\n]+setPasswordOpen\(true\)/);
  assert.match(security, /closePassword[^\n]+setPasswordOpen\(false\)[^\n]+setPasswordMode\("change"\)/);
  for (const flow of ["Devices"]) {
    assert.match(security, new RegExp(`open${flow}[^\\n]+set${flow}Error\\(""\\)[^\\n]+set${flow}Open\\(true\\)`));
    assert.match(security, new RegExp(`close${flow}[^\\n]+set${flow}Open\\(false\\)[^\\n]+set${flow}Error\\(""\\)`));
  }
  assert.match(security, /openTwoFactor[^\n]+clearTwoFactorState\(\)[^\n]+setTwoFactorOpen\(true\)/);
  assert.match(security, /closeTwoFactor[^\n]+clearTwoFactorState\(\)[^\n]+setTwoFactorOpen\(false\)/);
  assert.match(security, /openDeletion[^\n]+setDeletionError\(""\)[^\n]+setDeletionOpen\(true\)/);
  assert.match(security, /closeDeletion[^\n]+setDeletionOpen\(false\)[^\n]+setDeletionError\(""\)/);
  assert.match(security, /openPasskeys[^\n]+setPasskeysError\(""\)[^\n]+setPasskeysOpen\(true\)/);
  assert.match(security, /closePasskeys[^\n]+setPasskeysOpen\(false\)[^\n]+setPasskeysError\(""\)/);
  assert.match(passwordChangeFlow, /if \(!active\) \{ clearAll\(\); return; \}/);
});

test("operation failures and messages target only their owning feedback scope", () => {
  const expectations = [
    ["startTwoFactor", "setTwoFactorError"], ["confirmTwoFactor", "setTwoFactorError"],
    ["remove", "setDevicesError"], ["openDeletion", "setDeletionError"], ["requestDeletion", "setDeletionError"], ["reactivate", "setDeletionError"],
    ["toggle", "setLandingMessage"], ["all", "setLandingError"],
  ];
  for (let index = 0; index < expectations.length; index += 1) {
    const [operation, setter] = expectations[index];
    const start = security.indexOf(`const ${operation} =`);
    const next = index + 1 < expectations.length ? security.indexOf(`const ${expectations[index + 1][0]} =`, start) : security.indexOf("const date =", start);
    assert.ok(start >= 0, `missing ${operation}`);
    assert.match(security.slice(start, next > start ? next : undefined), new RegExp(`${setter}\\(`), `${operation} should use ${setter}`);
  }
  assert.match(twoFactorEnabledFlow, /const performDisable = async/);
  assert.match(twoFactorEnabledFlow, /setFieldError\(/);
  assert.match(twoFactorEnabledFlow, /setGeneralError\(/);
  assert.match(passwordChangeFlow, /setFieldErrors\(\(current\) => \(\{ \.\.\.current, currentPassword: f\.currentIncorrect \}\)\)/);
  assert.match(passwordChangeFlow, /setGeneralError\(e\.message\)/);
  assert.match(security, /const loadPasskeys = async[^\n]+setPasskeysError\(/);
  assert.match(security, /setLandingError\(c\.loadError\)/);
  assert.match(security, /setLandingError\(c\.saveFailed\)/);
  assert.match(security, /setLandingError\(c\.signOutFailed\)/);
});

test("late modal requests cannot repopulate feedback after close or reopen", () => {
  for (const flow of ["devices", "twoFactor", "deletion", "passkeys"])
    assert.match(security, new RegExp(`${flow}Request\\.current`));
  assert.match(security, /request === twoFactorRequest\.current/);
  assert.match(security, /request === devicesRequest\.current/);
  assert.match(security, /request===deletionRequest\.current/);
  assert.match(security, /request===passkeysRequest\.current/);
  assert.match(passwordChangeFlow, /requestGeneration\.current/);
  assert.match(passwordChangeFlow, /generation !== requestGeneration\.current/);
});

test("internal modal refreshes stay silent and do not overwrite landing feedback", () => {
  assert.match(security, /showLandingFeedback = true/);
  assert.match(security, /showLoading = true/);
  assert.match(security, /showLandingFeedback\) setLandingError/);
  assert.match(security, /showLoading\) setLoading\(true\)/);
  assert.match(security, /showLoading\) setLoading\(false\)/);
  assert.match(security, /load\(\{\s*showLandingFeedback:\s*false,\s*showLoading:\s*false\s*\}\)/);
});

test("security localization covers the compact hierarchy", () => {
  for (const phrase of [
    "Manage sign-in and account security for your Kurioticket account.",
    "Gestiona el acceso y la seguridad de tu cuenta de Kurioticket.",
    "Review devices that have recently accessed your account.",
    "Revisa los dispositivos que han accedido recientemente a tu cuenta.",
    "Change the password used to sign in to your account.", "Add extra protection with an authenticator app.", "Review devices signed in to your account.", "Sesiones activas",
    "Scan this QR code with your authenticator app.", "Or enter this setup key manually.",
    "Escanea este código QR con tu aplicación de autenticación.", "O introduce esta clave de configuración manualmente.",
  ]) assert.ok(localization.includes(phrase), `missing copy: ${phrase}`);
});

test("security uses selected-locale copy, event labels, and date metadata", () => {
  assert.match(security, /const c = securityCopy\[locale\]/);
  assert.match(security, /formatSecurityDate\(value, locale\)/);
  assert.match(security, /localizedAccountActivityLabel\(event\.type, locale, c\.unknown\)/);
  assert.doesNotMatch(security, /locale === "es-es"/);
  assert.doesNotMatch(security, /label="Add passkey"|>Created \{|A new Preview app binary/);
});

test("security dictionaries and activity labels cover all 18 locales", async () => {
  const { mobileLocaleCodes } = await import("../../localization/mobileLocalizationCatalog");
  const { securityCopy } = await import("./securityLocalization");
  const { accountActivityEventTypes, localizedAccountActivityLabel } = await import("../../localization/accountActivityLabels");
  assert.deepEqual(Object.keys(securityCopy).sort(), [...mobileLocaleCodes].sort());
  const englishKeys = Object.keys(securityCopy["en-us"]).sort();
  for (const locale of mobileLocaleCodes) {
    assert.deepEqual(Object.keys(securityCopy[locale]).sort(), englishKeys);
    const resolved = accountActivityEventTypes.map((type) => localizedAccountActivityLabel(type, locale, securityCopy[locale].unknown));
    assert.equal(new Set(resolved).size, accountActivityEventTypes.length, `${locale} must keep security event types distinguishable`);
    assert.equal(localizedAccountActivityLabel("UNKNOWN_EVENT", locale, securityCopy[locale].unknown), securityCopy[locale].unknown);
  }
  assert.equal(securityCopy["es-es"].codeInvalid, "Introduce exactamente 6 dígitos.");
});
