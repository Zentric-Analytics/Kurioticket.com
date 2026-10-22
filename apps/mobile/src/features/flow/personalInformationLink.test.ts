import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("email change opens in-app only after tapping Change email", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.match(screen, /emailOpen && <PersonalDetailsEmailEditor/);
 assert.match(screen, /setEmailOpen\(true\)/);
 assert.doesNotMatch(screen, /openSafeExternalUrl|new URL\("\/dashboard"/);
});
