import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const cache = readFileSync("src/storage/profileNameCache.ts", "utf8");

test("profile welcome renders immediately instead of waiting for the profile API", () => {
  assert.match(screen, /<WelcomeCard name=\{name\} email=\{email\} \/>/);
  assert.doesNotMatch(screen, /identityResolved|<View accessible=\{false\} style=\{styles\.welcomeCard\} \/>/);
});

test("profile welcome never reads the account or session name", () => {
  assert.doesNotMatch(screen, /session\?\.user\.name|session\.user\.name|user\.name/);
  assert.match(screen, /setEmail\(session\?\.user\.email \?\? null\)/);
});

test("cached Personal details name is shown before authoritative reconciliation", () => {
  assert.match(screen, /peekProfileName\(userId\)/);
  assert.match(screen, /readProfileName\(userId\)/);
  assert.match(screen, /setName\(cachedName\)/);
  assert.match(screen, /const authoritativeName = profile\?\.fullName\?\.trim\(\) \|\| null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /writeProfileName\(userId, authoritativeName\)/);
});

test("profile refresh is generation guarded against cross-account stale responses", () => {
  assert.match(screen, /const loadGeneration = useRef\(0\)/);
  assert.match(screen, /const generation = \+\+loadGeneration\.current/);
  assert.match(screen, /generation !== loadGeneration\.current/);
});

test("profile uses one focus-owned load instead of duplicate mount fetches", () => {
  assert.match(screen, /useFocusEffect\(load\)/);
  assert.doesNotMatch(screen, /useEffect\(load/);
});

test("Personal details name cache is account scoped and never stores provider identity", () => {
  assert.match(cache, /kurioticket\.profile-name\.v1\.\$\{encodeURIComponent\(userId\)\}/);
  assert.match(cache, /writeProfileName\(userId: string, name: string \| null\)/);
  assert.doesNotMatch(cache, /email|session|provider|oauth/i);
});

test("an older async cache read cannot overwrite a newer authoritative write", () => {
  assert.match(cache, /const revisions = new Map<string, number>\(\)/);
  assert.match(cache, /const readRevision = currentRevision\(userId\)/);
  assert.match(cache, /if \(currentRevision\(userId\) !== readRevision\) return memory\.get\(userId\) \?\? null/);
  assert.match(cache, /revisions\.set\(userId, currentRevision\(userId\) \+ 1\)/);
  assert.match(cache, /if \(!memory\.has\(userId\)\) memory\.set\(userId, normalized\)/);
});
