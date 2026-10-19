import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { homeFontFamily, homeFontWeight, homeHotelColors, homeTextColor, resolveHomeTheme } from "./homeHotelPresentation";
import { appFonts } from "../../theme/typography";

const light = { dark: false, textPrimary: "#071A48", textSecondary: "#56658E", background: "#FAFBFF" };
const dark = { dark: true, textPrimary: "#F4F7FF", textSecondary: "#AAB5CD", background: "#091224" };

test("home palette stays disabled outside Home and preserves dark surfaces", () => {
  assert.equal(resolveHomeTheme(light, false), light);
  assert.equal(resolveHomeTheme(dark, true), dark);
  const home = resolveHomeTheme(light, true);
  assert.equal(home.background, "#F5F7FB");
  assert.equal(home.textPrimary, "#020617");
  assert.equal(home.textSecondary, "#475569");
  assert.equal(light.background, "#FAFBFF");
});

test("home typography uses loaded Inter weights and nested text inherits its parent weight", () => {
  for (const [input, expected] of [["normal", "400"], ["500", "500"], ["600", "600"], ["bold", "700"], ["800", "700"], ["900", "700"]]) {
    assert.equal(homeFontWeight(input), expected);
  }
  assert.equal(homeFontFamily(homeFontWeight(undefined)), appFonts.regular);
  assert.equal(homeFontFamily(homeFontWeight(undefined, "600")), appFonts.semibold);
  assert.equal(homeFontFamily(homeFontWeight("800")), appFonts.bold);
});

test("home text recolours legacy roles without changing image labels or semantic feedback", () => {
  assert.equal(homeTextColor("#071A48", light), homeHotelColors.primary);
  assert.equal(homeTextColor("#56658e", light), homeHotelColors.secondary);
  assert.equal(homeTextColor("#064CF7", light), homeHotelColors.action);
  assert.equal(homeTextColor("#071A48", dark), dark.textPrimary);
  assert.equal(homeTextColor("#56658E", dark), dark.textSecondary);
  assert.equal(homeTextColor("#004BB8", dark), "#8FB5FF");
  for (const color of ["white", "#FFFFFF", "#A21D25", "#D92D20", undefined]) assert.equal(homeTextColor(color, light), undefined);
});

test("home presentation is mounted only by the native homepage", () => {
  const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
  assert.match(home, /<HomePresentationProvider><HomePageContent \/><\/HomePresentationProvider>/);
  for (const path of ["app/_layout.tsx", "src/features/search/ApprovedResultsScreen.tsx", "src/features/search/HotelDetailsScreen.tsx", "src/features/flow/ProductScreens.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /<HomePresentationProvider/);
  }
});
