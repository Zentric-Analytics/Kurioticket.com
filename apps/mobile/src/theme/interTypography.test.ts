import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appFonts } from "./typography";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
const rootLayout = readFileSync("app/_layout.tsx", "utf8");

test("mobile declares the Expo font runtime and static Inter package", () => {
  assert.equal(packageJson.dependencies["expo-font"], "~14.0.12");
  assert.equal(packageJson.dependencies["@expo-google-fonts/inter"], "^0.4.2");
});

test("typography exports the six registered static Inter family names", () => {
  assert.deepEqual(appFonts, {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extraBold: "Inter_800ExtraBold",
    black: "Inter_900Black",
  });
});

test("root layout loads every Inter face while retaining the splash screen", () => {
  for (const face of Object.values(appFonts)) {
    assert.match(rootLayout, new RegExp(`\\b${face},`));
  }
  assert.match(rootLayout, /SplashScreen\.preventAutoHideAsync\(\)\.catch/);
  assert.match(rootLayout, /if \(!fontsLoaded && !fontError\) return null/);
});

test("root layout keeps the native splash visible until bootstrap owns the handoff", () => {
  assert.match(rootLayout, /if \(fontError && __DEV__\) console\.warn/);
  assert.doesNotMatch(rootLayout, /SplashScreen\.hideAsync\(\)\.catch/);
  assert.doesNotMatch(rootLayout, /if \(fontError\) return null/);
});
