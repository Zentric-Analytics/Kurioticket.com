import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("email changes stay inside the app and use the authenticated verification endpoints", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 const api = readFileSync("src/api/travelApi.ts", "utf8");
 assert.match(screen, /<PersonalDetailsEmailEditor/);
 assert.doesNotMatch(screen, /openSafeExternalUrl|new URL\("\/dashboard"/);
 assert.match(api, /\/api\/mobile\/v1\/email-change\/request/);
 assert.match(api, /\/api\/mobile\/v1\/email-change\/confirm/);
});
