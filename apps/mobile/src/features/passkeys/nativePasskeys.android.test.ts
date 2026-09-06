import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adapter = readFileSync("src/features/passkeys/nativePasskeys.ts", "utf8");

test("Android passkey registration requests a platform authenticator without changing iOS", () => {
  assert.match(adapter, /if \(Platform\.OS !== "android"\) return options;/);
  assert.match(adapter, /authenticatorAttachment: "platform"/);
  assert.match(adapter, /const requestOptions = androidPlatformRegistrationOptions\(options\)/);
  assert.match(adapter, /\.\.\.\(requestOptions as Parameters<PasskeyModule\["create"\]>\[0\]\)/);
});

test("Android platform preference preserves the server authenticator selection", () => {
  assert.match(adapter, /\.\.\.authenticatorSelection,/);
  assert.match(adapter, /residentKey/); // existing selection is spread rather than replaced
});
