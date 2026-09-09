import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
test("Profile palette is scoped to its routes, preserving global and dark colours", () => {
 const theme = read("src/theme/AppTheme.tsx");
 assert.match(theme, /parent\.theme\.dark \? parent/);
 assert.match(theme, /text: "#1A1A1A"/);
 assert.match(theme, /textSecondary: "#595959"/);
 assert.match(theme, /text: "#071A48"/);
 assert.doesNotMatch(read("app/_layout.tsx"), /ProfileThemeProvider/);
 for (const route of ["settings","currency","language","security","personal-information","saved","recent","faq","support","email-preferences","travel-preferences","price-alerts"]) {
  assert.match(read(`app/${route}.tsx`), /<ProfileThemeProvider>/, route);
 }
 assert.match(read("app/(tabs)/profile/_layout.tsx"), /<ProfileThemeProvider>/);
});
test("Profile uses a padlock for security, retains privacy shield, and centres text-only logout", () => {
 const model = read("src/features/profile/profileModel.ts");
 assert.match(model, /label: "securitySettings", icon: "lock"/);
 assert.match(model, /label: "privacy", icon: "shield"/);
 const screen = read("src/features/profile/ProfileScreen.tsx");
 assert.doesNotMatch(screen, /name="logout"/);
 assert.match(screen, /logout: \{[^}]*justifyContent: "center"/);
 assert.match(screen, /logoutText: \{ color: flowColors.red/);
 assert.match(read("src/features/flow/FlowIcon.tsx"), /strokeWidth = 2\.1/);
 assert.match(read("src/features/profile/ProfileCardSection.tsx"), /strokeWidth=\{1\.3\}/);
});

test("guest Profile shares menu styles and matches the light backdrop", () => {
 const guest=read("src/features/profile/GuestProfileScreen.tsx");
 assert.match(guest, /theme.dark \? theme.background : "#F5F5F5"/);
 assert.match(guest, /<ProfileCardSection/);
 assert.match(guest, /styles.heroTitle, \{ color: theme.text \}/);
 assert.match(guest, /styles.heroBody, \{ color: theme.muted \}/);
 assert.match(guest, /strokeWidth=\{1.3\} name="person" color="white"/);
});
