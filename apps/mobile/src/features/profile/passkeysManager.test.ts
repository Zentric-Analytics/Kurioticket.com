import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manager = readFileSync("src/features/profile/PasskeysManager.tsx", "utf8");
const adapter = readFileSync("src/features/passkeys/nativePasskeys.ts", "utf8");
const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const localization = readFileSync("src/features/profile/passkeyLocalization.ts", "utf8");

test("Security enables the native passkey manager instead of the old disabled preview", () => {
  assert.match(security, /import \{ PasskeysManager, type PasskeysManagerHandle \} from "\.\/PasskeysManager"/);
  assert.match(security, /<PasskeysManager[^]*active=\{passkeysOpen\}/);
  assert.doesNotMatch(security, /<Button label=\{c\.addPasskey\} disabled/);
  assert.doesNotMatch(security, /passkeyPreviewRequired/);
});

test("native support is checked safely for old binaries and unsupported devices", () => {
  assert.match(adapter, /import\("react-native-passkeys"\)/);
  assert.match(adapter, /Platform\.OS !== "ios" && Platform\.OS !== "android"/);
  assert.match(adapter, /catch \{[^]*return false;/);
  assert.match(manager, /supported!==true/);
  assert.match(manager, /copy\.unsupported/);
});

test("native registration preserves attestation data without requiring iOS to expose authenticatorData", () => {
  assert.match(adapter, /authenticatorData\?: string/);
  assert.match(adapter, /!response\.attestationObject/);
  assert.doesNotMatch(adapter, /!response\.authenticatorData/);
  assert.match(adapter, /attestationObject: response\.attestationObject/);
  assert.match(adapter, /transports: Array\.isArray\(response\.transports\)/);
  assert.match(adapter, /authenticatorAttachment: credential\.authenticatorAttachment \?\? null/);
});

test("registration uses fresh reauthentication, server options, native creation, server verification and list refresh", () => {
  assert.match(manager, /travelApi\.passkeyReauth\(/);
  assert.match(manager, /purpose,/);
  assert.match(manager, /travelApi\.passkeyRegistrationOptions\(reauthToken\)/);
  assert.match(manager, /createNativePasskey\(result\.options,controller\.signal\)/);
  assert.match(manager, /travelApi\.verifyPasskeyRegistration\(/);
  assert.match(manager, /onReload\(\)/);
});

test("reauthentication supports TOTP or recovery code, password and email-code accounts", () => {
  assert.match(manager, /twoFactorEnabled\|\|!hasPassword\?\{code:value\}:\{password:value\}/);
  assert.match(manager, /action:"send-email-code",purpose/);
  assert.match(manager, /usesEmail=!twoFactorEnabled&&!hasPassword/);
  assert.match(manager, /copy\.verifyTotp/);
  assert.match(manager, /copy\.verifyPassword/);
  assert.match(manager, /copy\.verifyEmail/);
});

test("rename and removal preserve server validation and fresh removal-purpose verification", () => {
  assert.match(manager, /name\.length>80/);
  assert.match(manager, /travelApi\.renamePasskey\(target\.id,name\)/);
  assert.match(manager, /beginVerification\("removal",item\)/);
  assert.match(manager, /travelApi\.removePasskey\(target\.id,reauthToken\)/);
});

test("closing and cancellation clear sensitive state and invalidate stale work", () => {
  assert.match(manager, /request\.current\+=1/);
  assert.match(manager, /nativeAbort\.current\?\.abort\(\)/);
  for (const setter of [
    'setVerification("")',
    "setEmailCodeSent(false)",
    'setRenameValue("")',
    "setTarget(null)",
  ]) assert.ok(manager.includes(setter), `cleanup must include ${setter}`);
  assert.match(manager, /isPasskeyCancellation\(error\)/);
  assert.doesNotMatch(manager + adapter, /SecureStore|AsyncStorage/);
  assert.match(manager, /if\(__DEV__\)console\.warn\("Android passkey creation diagnostic",\{platform:Platform\.OS,category:diagnostic\.category,code:diagnostic\.safeNativeCode\}\)/);
});

test("all new passkey UI copy is localized in English and Spanish", () => {
  assert.match(localization, /addPasskey: "Add passkey"/);
  assert.match(localization, /addPasskey: "Añadir llave de acceso"/);
  assert.match(localization, /verifyTotp:/);
  assert.match(localization, /verifyPassword:/);
  assert.match(localization, /verifyEmail:/);
  assert.match(localization, /locale === "es-es" \? spanish : english/);
  assert.doesNotMatch(manager, />Add passkey</);
});

test("compact passkey list and empty state expose the agreed content", () => {
  assert.match(manager, /copy\.yourPasskeys/);
  assert.match(manager, /passkeys\.map/);
  assert.match(manager, /copy\.lastUsed/);
  assert.doesNotMatch(manager, /copy\.created/);
  assert.match(manager, /MoreHorizontal/);
  assert.match(manager, /copy\.noPasskeys/);
  assert.match(manager, /copy\.emptyHelp/);
});

test("manage and removal use dismissible confirmation sheets before reauth", () => {
  assert.match(manager, /<BottomSheet[^>]*visible=\{Boolean\(managed\)\}[^>]*>/);
  assert.match(manager, /copy\.rename/);
  assert.match(manager, /<BottomSheet[^>]*visible=\{Boolean\(confirming\)\}[^>]*>/);
  assert.ok(manager.indexOf('setConfirming(item)') < manager.indexOf('beginVerification("removal",item)'));
});

test("the modal X is context aware and internal screens have no back text action", () => {
  assert.match(security, /passkeysManager\.current\?\.cancelInternal\(\)/);
  assert.match(manager, /stage==="list"&&!managed&&!confirming/);
  assert.doesNotMatch(manager, /backToPasskeys/);
  assert.doesNotMatch(localization, /Back to passkeys/);
});

test("rename, remove, and add own one-second button success feedback", () => {
  assert.match(manager, /SUCCESS_DELAY_MS = 1000/);
  for (const state of ['success==="renamed"', 'success==="removed"', 'success==="added"']) assert.ok(manager.includes(state));
  assert.match(manager, /clearTimeout\(successTimer\.current\)/);
  assert.doesNotMatch(manager, /onMessage\(message\)/);
});

test("completed mutations refresh canonical passkeys before the visual success timer can be cancelled", () => {
  const showSuccessStart = manager.indexOf("const showSuccess=");
  const showSuccessEnd = manager.indexOf("const registerPasskey=", showSuccessStart);
  assert.ok(showSuccessStart >= 0 && showSuccessEnd > showSuccessStart);
  const showSuccessBody = manager.slice(showSuccessStart, showSuccessEnd);
  assert.ok(showSuccessBody.indexOf("void onReload()") < showSuccessBody.indexOf("setTimeout("));
  assert.doesNotMatch(showSuccessBody, /setTimeout\([^]*onReload\(\)/);
});

test("password verification preserves exact input and has a visibility toggle", () => {
  assert.match(manager, /passwordMode&&!passwordVisible/);
  assert.match(manager, /setPasswordVisible\(value=>!value\)/);
  assert.match(manager, /hasPassword\?verification/);
  assert.match(manager, /copy\.removePasskey/);
});

test("rename starts from the current name and keeps server maximum validation", () => {
  assert.match(manager, /setRenameValue\(item\.name\)/);
  assert.match(manager, /maxLength=\{80\}/);
  assert.match(manager, /name\.length>80/);
});

test("passkey feedback is local, transient, replacement-safe, and leaves no reserved slot", () => {
  assert.match(manager, /export const PASSKEY_FEEDBACK_DURATION_MS = 1000/);
  assert.match(manager, /if\(feedbackTimer\.current\)clearTimeout\(feedbackTimer\.current\)/);
  assert.match(manager, /generation!==feedbackGeneration\.current/);
  assert.match(manager, /setTimeout\([^]*PASSKEY_FEEDBACK_DURATION_MS/);
  assert.match(manager, /function LocalFeedback[^]*if\(!feedback\)return null/);
  assert.match(manager, /stage==="rename"[^]*<LocalFeedback feedback=\{feedback\}\/>[^]*copy\.saveName/);
  assert.match(manager, /stage==="verify"[^]*<LocalFeedback feedback=\{feedback\}\/>/);
  assert.match(manager, /copy\.yourPasskeys[^]*<LocalFeedback feedback=\{feedback\}/);
  assert.doesNotMatch(manager, /feedbackSlot|minHeight[^\n]*feedback/);
});

test("passkey feedback timers clear on edits, cancellation, flow changes, and unmount", () => {
  assert.match(manager, /clearSensitive=useCallback\(\(\)=>\{ clearTimer\(\); clearFeedback\(\)/);
  assert.match(manager, /return\(\)=>\{request\.current\+=1;clearSensitive\(\);\}/);
  assert.match(manager, /cancelFlow[^]*clearSensitive\(\)/);
  assert.match(manager, /setVerification\(value\);clearFeedback\(\)/);
  assert.match(manager, /setRenameValue\(value\);clearFeedback\(\)/);
});

test("passkey failures preserve useful client errors but normalize low-level search wording", () => {
  assert.match(manager, /error\.status>0&&error\.status<500&&error\.code!=="invalid-response"\?error\.message:fallback/);
  assert.match(manager, /diagnostic\.category==="UNKNOWN_NATIVE"&&diagnostic\.safeNativeCode/);
  assert.match(manager, /await fail\(error,`\$\{fallback\}\$\{suffix\}`,current\)/);
  assert.doesNotMatch(manager, /search provider|search service|Search cancelled|search took too long/i);
});

test("Android creation diagnostics do not alter iOS or the registration API sequence", () => {
  assert.match(manager, /if\(Platform\.OS!=="android"\|\|isPasskeyCancellation\(error\)\)throw error/);
  const options = manager.indexOf("travelApi.passkeyRegistrationOptions(reauthToken)");
  const create = manager.indexOf("createNativePasskey(result.options,controller.signal)");
  const verify = manager.indexOf("travelApi.verifyPasskeyRegistration(");
  assert.ok(options >= 0 && create > options && verify > create);
  assert.doesNotMatch(manager, /challenge|credentialId|attestationObject|publicKey/);
});

test("Security removes the global passkey feedback row and uses compact passkey-only intro spacing", () => {
  const modalStart = security.indexOf('<ScreenModal visible={passkeysOpen}');
  const modalEnd = security.indexOf('</ScreenModal>', modalStart);
  const modal = security.slice(modalStart, modalEnd);
  assert.match(modal, /styles\.passkeysIntro/);
  assert.match(modal, /<PasskeysManager/);
  assert.doesNotMatch(modal, /<Feedback|feedbackSlot|styles\.intro/);
  assert.match(security, /passkeysIntro: \{ fontSize: 15, lineHeight: 22 \}/);
});

test("transient feedback does not own normal copy or duplicate button success", () => {
  const localFeedback = manager.slice(manager.indexOf("function LocalFeedback"), manager.indexOf("function BottomSheet"));
  for (const persistent of ["copy.yourPasskeys", "copy.noPasskeys", "copy.emptyHelp", "copy.renameHelp", "copy.verifyExtra"])
    assert.doesNotMatch(localFeedback, new RegExp(persistent.replace(".", "\\.")));
  assert.doesNotMatch(manager, /showFeedback\(copy\.(added|renamed|removed)/);
});
