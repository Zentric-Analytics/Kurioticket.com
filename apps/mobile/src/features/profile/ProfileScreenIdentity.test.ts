import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");

test("profile welcome never renders the persisted session name before server verification", () => {
  assert.doesNotMatch(screen, /setName\(session\?\.user\.name|setName\(session\.user\.name/);
  assert.match(screen, /setEmail\(session\?\.user\.email \?\? null\)/);
});

test("unresolved or nameless identity shows Welcome instead of an empty hero or Hi without a name", () => {
  assert.match(screen, /profileWelcomeCopy/);
  assert.match(screen, /const greeting = firstName \? `\$\{t\("profileGreeting"\)\}, \$\{firstName\} 👋` : `\$\{profileWelcomeCopy\[locale\]\} 👋`/);
  assert.match(screen, /<WelcomeCard name=\{identityResolved \? name : null\} email=\{email\} \/>/);
  assert.doesNotMatch(screen, /<View accessible=\{false\} style=\{styles\.welcomeCard\} \/>/);
});

test("authoritative server identity switches the welcome to Hi plus the resolved first name", () => {
  assert.match(screen, /const authoritativeName = user\.name \?\? null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /setIdentityResolved\(true\)/);
  assert.match(screen, /profileFirstName\(name, email\)/);
});

test("cache repair remains scoped to the captured account", () => {
  assert.match(screen, /const sessionUserId = session\.user\.id/);
  assert.match(screen, /updateStoredSessionName\(authoritativeName, sessionUserId\)/);
  assert.match(storage, /updateStoredSessionName\(name: string \| null, expectedUserId\?: string\)/);
  assert.match(storage, /if \(!expectedUserId\) return/);
  assert.match(storage, /if \(!session \|\| session\.user\.id !== expectedUserId\) return/);
});
