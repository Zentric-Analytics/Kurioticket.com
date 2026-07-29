import assert from "node:assert/strict";
import test from "node:test";
import { membershipLabel, profileIdentity } from "./profileModel";

test("derives the profile identity from real session values", () => {
  assert.deepEqual(profileIdentity({ name: "Admin", email: "admin@kurioticket.com" }), {
    name: "Admin", email: "admin@kurioticket.com", initial: "A",
  });
});

test("falls back to email and never invents authenticated data", () => {
  assert.deepEqual(profileIdentity({ email: "traveler@example.com" }), {
    name: "traveler", email: "traveler@example.com", initial: "T",
  });
  assert.deepEqual(profileIdentity(null), { name: "Traveler", email: "", initial: "T" });
});

test("formats a valid membership date and uses truthful status when absent", () => {
  assert.equal(membershipLabel("2024-05-10T00:00:00.000Z", "en-US"), "Member since May 2024");
  assert.equal(membershipLabel(null, "en-US"), "Member");
  assert.equal(membershipLabel("bad-date", "en-US"), "Member");
});
