import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("profile route distinguishes authenticated, intentional guest, and signed-out states", () => {
  const route = source("src/features/profile/ProfileRouteScreen.tsx");
  assert.match(route, /readSession\(\)/);
  assert.match(route, /readOnboardingCompleted\(\)/);
  assert.match(route, /session \? "authenticated" : guest \? "guest" : "signed-out"/);
  assert.match(route, /<AuthenticatedProfileScreen \/>/);
  assert.match(route, /<GuestProfileScreen \/>/);
  assert.match(route, /Redirect href="\/email-auth"/);
});

test("guest Profile has one sign-in choice and no fake account identity", () => {
  const guest = source("src/features/profile/GuestProfileScreen.tsx");
  assert.match(guest, /Your journey starts here/);
  assert.match(guest, /Sign in to access your trips, saved items/);
  assert.match(guest, /profile\/sign-in/);
  for (const forbidden of ["Guest traveler", "Member since", "Personal information", "Saved travelers", "Continue with Email", "Continue with Google", "Continue as Guest"]) assert.doesNotMatch(guest, new RegExp(forbidden));
});

test("guest sign-in method offers Email and Google only with production wiring", () => {
  const method = source("src/features/profile/GuestSignInMethodScreen.tsx");
  assert.match(method, /Continue with Email/);
  assert.match(method, /Continue with Google/);
  assert.match(method, /entry: "email", returnTo: "profile"/);
  assert.match(method, /startNativeGoogleSignIn/);
  assert.match(method, /authApi\.google/);
  assert.match(method, /router\.replace\("\/\(tabs\)\/profile"\)/);
  assert.doesNotMatch(method, /Continue as Guest|Apple/);
});

test("guest email upgrade enters the existing email flow and returns to Profile", () => {
  const route = source("app/email-auth.tsx");
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(route, /initialStep=\{entry === "email" \? "email" : "welcome"\}/);
  assert.match(route, /successRoute=\{returnTo \? validateSignInIntent\(returnTo\) : "\/"\}/);
  assert.match(flow, /router\.replace\(successRoute\)/);
});
