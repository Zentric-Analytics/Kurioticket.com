import assert from "node:assert/strict";
import test from "node:test";
import { effectiveCapabilities, hasTeamAccessCapability, normalizeTeamAccessRoles, TEAM_ACCESS_ROLE_DEFINITIONS } from "@/lib/teamAccessRoles";

test("tester role grants preview access and native build notifications", () => {
  const capabilities = effectiveCapabilities(["TESTER"]);
  assert.equal(capabilities.includes("PREVIEW_ACCESS"), true);
  assert.equal(capabilities.includes("GOOGLE_PREVIEW_LOGIN"), true);
  assert.equal(capabilities.includes("STAGING_EMAIL"), true);
  assert.equal(capabilities.includes("ANDROID_BUILD_NOTIFICATIONS"), true);
  assert.equal(capabilities.includes("IOS_BUILD_NOTIFICATIONS"), true);
});

test("developer role grants both native build notification capabilities", () => {
  assert.equal(hasTeamAccessCapability(["DEVELOPER"], "ANDROID_BUILD_NOTIFICATIONS"), true);
  assert.equal(hasTeamAccessCapability(["DEVELOPER"], "IOS_BUILD_NOTIFICATIONS"), true);
  assert.match(TEAM_ACCESS_ROLE_DEFINITIONS.DEVELOPER.grants.join(" "), /APK/i);
  assert.match(TEAM_ACCESS_ROLE_DEFINITIONS.DEVELOPER.grants.join(" "), /TestFlight/i);
});

test("role normalization rejects unknown roles and never leaves a member roleless", () => {
  assert.deepEqual(normalizeTeamAccessRoles(["DEVELOPER", "DEVELOPER", "OWNER"]), ["DEVELOPER"]);
  assert.deepEqual(normalizeTeamAccessRoles([]), ["TESTER"]);
  assert.deepEqual(normalizeTeamAccessRoles(null), ["TESTER"]);
});
