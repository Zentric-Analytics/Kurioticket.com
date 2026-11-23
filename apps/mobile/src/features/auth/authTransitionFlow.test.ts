import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("all successful common auth paths converge on one success completion", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const api = source("src/features/auth/authApi.ts");
  assert.match(api, /if \("session" in result\) await writeSession/);
  assert.match(flow, /authApi\.google/);
  assert.match(flow, /authApi\.password/);
  assert.match(flow, /authApi\.register/);
  assert.match(flow, /authApi\.twoFactor/);
  assert.ok((flow.match(/setStep\("success"\)/g) ?? []).length >= 4);
});

test("root-owned auth completion dismisses to its validated destination", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const root = source("app/_layout.tsx");
  const tabs = source("app/(tabs)/_layout.tsx");
  const authRoute = source("app/email-auth.tsx");
  const signIn = source("app/(tabs)/profile/sign-in.tsx");
  const profileRoot = source("app/(tabs)/profile/index.tsx");
  assert.match(flow, /useCallback\(\(\) =>/);
  assert.match(flow, /router\.dismissTo\(successRoute\)/);
  assert.match(root, /Stack\.Screen name="email-auth"/);
  assert.doesNotMatch(tabs, /email-auth/);
  assert.match(authRoute, /validateSignInIntent\(returnTo\)/);
  assert.match(signIn, /Redirect href=\{signInHref\(validateSignInIntent\(returnTo\)\)\}/);
  assert.doesNotMatch(signIn, /AuthFlow/);
  assert.match(profileRoot, /ProfileRouteScreen/);
  assert.doesNotMatch(flow, /router\.replace\(successRoute\)/);
});

test("welcome panel owns bottom safe-area without translation or a bottom SafeAreaView gap", () => {
  const welcome = source("src/features/auth/AuthWelcomeScreen.tsx");
  assert.match(welcome, /SafeAreaView style=\{styles\.safe\} edges=\{\["top"\]\}/);
  assert.match(welcome, /paddingBottom: 10 \+ insets\.bottom/);
  assert.match(welcome, /justifyContent: "space-between"/);
  assert.doesNotMatch(welcome, /panelOffset|translateY/);
  assert.doesNotMatch(welcome, /borderBottomLeftRadius|borderBottomRightRadius/);
});

test("Profile root subscribes to session lifecycle changes", () => {
  const profile = source("src/features/profile/ProfileRouteScreen.tsx");
  assert.match(profile, /subscribeSession/);
  assert.match(profile, /startProfileSessionReconciliation/);
  assert.match(profile, /<AuthenticatedProfileScreen \/>/);
});

test("SuccessScreen uses a one-shot timer independent of callback identity", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  assert.match(screens, /const onDoneRef = useRef\(onDone\)/);
  assert.match(screens, /scheduleAuthCompletion\(\(\) => onDoneRef\.current\(\)\)/);
  assert.match(screens, /\}, \[\]\);/);
});
