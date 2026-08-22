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

test("successful auth dismisses the nested sign-in route to the Profile root", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const signIn = source("app/(tabs)/profile/sign-in.tsx");
  const profileRoot = source("app/(tabs)/profile/index.tsx");
  assert.match(flow, /useCallback\(\(\) =>/);
  assert.match(flow, /router\.dismissTo\(successRoute\)/);
  assert.match(signIn, /AuthFlow successRoute=\{validateSignInIntent\(returnTo\)\}/);
  assert.match(profileRoot, /ProfileRouteScreen/);
  assert.doesNotMatch(flow, /router\.replace\(successRoute\)/);
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
