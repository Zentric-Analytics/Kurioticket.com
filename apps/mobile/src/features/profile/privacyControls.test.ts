import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profile = () => readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const guestProfile = () => readFileSync("src/features/profile/GuestProfileScreen.tsx", "utf8");
const api = () => readFileSync("src/api/travelApi.ts", "utf8");

test("authenticated mobile users can initiate the reviewed account deletion workflow", () => {
  const source = profile();
  assert.match(source, /accessibilityLabel="Delete account"/);
  assert.match(source, /travelApi\.requestAccountDeletion\(\)/);
  assert.match(source, /After 7 days, the request becomes eligible for review/);
  assert.match(source, /some records may be retained where legally required/i);
  assert.match(source, /await clearSession\(\)/);
  assert.match(api(), /\/api\/mobile\/v1\/account\/deletion-request/);
});

test("privacy, support, and deletion information use approved HTTPS destinations", () => {
  const source = profile();
  assert.match(source, /https:\/\/kurioticket\.com\/privacy/);
  assert.match(source, /https:\/\/kurioticket\.com\/support/);
  assert.match(source, /https:\/\/kurioticket\.com\/legal\/data-deletion-policy/);
  assert.doesNotMatch(source, /Contact us.*unavailable\("Contact us"\)/);
  assert.match(guestProfile(), /https:\/\/kurioticket\.com\/support/);
  assert.doesNotMatch(guestProfile(), /Contact us.*unavailable\("Contact us"\)/);
});
