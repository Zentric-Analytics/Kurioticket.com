import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");

test("profile welcome never renders the persisted session name before server verification", () => {
  assert.doesNotMatch(screen, /setName\(session\?\.user\.name|setName\(session\.user\.name/);
  assert.match(screen, /setEmail\(session\?\.user\.email \?\? null\)/);
});

test("unresolved identity reserves the welcome space without generic avatar or greeting content", () => {
  assert.match(screen, /const \[identityResolved, setIdentityResolved\] = useState\(false\)/);
  assert.match(screen, /identityResolved \? <WelcomeCard name=\{name\} email=\{email\} \/> : <View accessible=\{false\} style=\{styles\.welcomeCard\} \/>/);
});

test("authoritative Personal details profile unlocks the welcome without session-name fallback", () => {
  assert.match(screen, /travelApi\.profile\(\)\.then\(\(\{ profile, user \}\) =>/);
  assert.match(screen, /setName\(profile\?\.fullName \?\? null\)/);
  assert.match(screen, /setIdentityResolved\(true\)/);
  assert.doesNotMatch(screen, /user\.name|updateStoredSessionName/);
});

test("cached session name updates cannot cross account boundaries or be mutated by unscoped callers", () => {
  assert.match(storage, /updateStoredSessionName\(name: string \| null, expectedUserId\?: string\)/);
  assert.match(storage, /if \(!expectedUserId\) return/);
  assert.match(storage, /if \(!session \|\| session\.user\.id !== expectedUserId\) return/);
});
