import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) => readFileSync(path, "utf8");

test("profile headers expose notifications only to authenticated users and never settings", () => {
  const authenticated = source("src/features/profile/ProfileScreen.tsx"); const guest = source("src/features/profile/GuestProfileScreen.tsx");
  assert.match(authenticated, /router\.push\("\/notifications"\)/); assert.doesNotMatch(authenticated, /name="settings"/); assert.doesNotMatch(guest, /name="settings"|\/notifications/);
  assert.doesNotMatch(authenticated, /ProfileSummary|avatar|identity\.name|identity\.email/);
});

test("profile roots and customization screen own distinct preferences", () => {
  const authenticated = source("src/features/profile/ProfileScreen.tsx"); const settings = source("src/features/flow/SettingsScreens.tsx");
  for (const key of ["language", "currency", "darkMode"] as const) assert.doesNotMatch(authenticated, new RegExp(`t\\(\\"${key}\\"\\)`));
  for (const duplicate of ["dashboard/security", "dashboard/preferences/email", "dashboard/preferences/travel"] as const) assert.doesNotMatch(settings, new RegExp(duplicate));
  for (const owned of ["language", "currency", "darkMode", "terms", "privacy", "appVersion"] as const) assert.match(settings, new RegExp(`t\\(\\"${owned}\\"\\)`));
});
