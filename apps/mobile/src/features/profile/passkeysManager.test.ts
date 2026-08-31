import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manager = readFileSync("src/features/profile/PasskeysManager.tsx", "utf8");
const adapter = readFileSync("src/features/passkeys/nativePasskeys.ts", "utf8");
const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const localization = readFileSync("src/features/profile/passkeyLocalization.ts", "utf8");

test("Security enables the native passkey manager instead of the old disabled preview", () => {
  assert.match(security, /import \{ PasskeysManager \} from "\.\/PasskeysManager"/);
  assert.match(security, /<PasskeysManager[^]*active=\{passkeysOpen\}/);
  assert.doesNotMatch(security, /<Button label=\{c\.addPasskey\} disabled/);
  assert.doesNotMatch(security, /passkeyPreviewRequired/);
});

test("native support is checked safely for old binaries and unsupported devices", () => {
  assert.match(adapter, /import\("react-native-passkeys"\)/);
  assert.match(adapter, /Platform\.OS !== "ios" && Platform\.OS !== "android"/);
  assert.match(adapter, /catch \{[^]*return false;/);
  assert.match(manager, /supported !== true/);
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
  assert.match(manager, /createNativePasskey\(result\.options, controller\.signal\)/);
  assert.match(manager, /travelApi\.verifyPasskeyRegistration\(/);
  assert.match(manager, /await onReload\(\)/);
});

test("reauthentication supports TOTP or recovery code, password and email-code accounts", () => {
  assert.match(manager, /twoFactorEnabled \|\| !hasPassword \? \{ code: value \} : \{ password: value \}/);
  assert.match(manager, /action: "send-email-code", purpose/);
  assert.match(manager, /usesEmail = !twoFactorEnabled && !hasPassword/);
  assert.match(manager, /copy\.verifyTotp/);
  assert.match(manager, /copy\.verifyPassword/);
  assert.match(manager, /copy\.verifyEmail/);
});

test("rename and removal preserve server validation and fresh removal-purpose verification", () => {
  assert.match(manager, /name\.length > 80/);
  assert.match(manager, /travelApi\.renamePasskey\(target\.id, name\)/);
  assert.match(manager, /beginVerification\("removal", item\)/);
  assert.match(manager, /travelApi\.removePasskey\(target\.id, reauthToken\)/);
});

test("closing and cancellation clear sensitive state and invalidate stale work", () => {
  assert.match(manager, /request\.current \+= 1/);
  assert.match(manager, /nativeAbort\.current\?\.abort\(\)/);
  for (const setter of [
    'setVerification("")',
    "setEmailCodeSent(false)",
    'setRenameValue("")',
    "setTarget(null)",
  ]) assert.ok(manager.includes(setter), `cleanup must include ${setter}`);
  assert.match(manager, /isPasskeyCancellation\(error\)/);
  assert.doesNotMatch(manager + adapter, /SecureStore|AsyncStorage/);
  assert.doesNotMatch(manager + adapter, /console\.(?:log|info|debug|warn|error)/);
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
