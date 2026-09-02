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

test("authoritative server identity unlocks the welcome and scopes cache repair to the captured account", () => {
  assert.match(screen, /const sessionUserId = session\.user\.id/);
  assert.match(screen, /const authoritativeName = user\.name \?\? null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /setIdentityResolved\(true\)/);
  assert.match(screen, /updateStoredSessionName\(authoritativeName, sessionUserId\)/);
});

test("cached session name updates cannot cross account boundaries or be mutated by unscoped callers", () => {
  assert.match(storage, /updateStoredSessionName\(name: string \| null, expectedUserId\?: string\)/);
  assert.match(storage, /if \(!expectedUserId\) return/);
  assert.match(storage, /if \(!session \|\| session\.user\.id !== expectedUserId\) return/);
});
