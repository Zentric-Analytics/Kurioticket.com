import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("country selector avoids the iOS slide-through-parent first-open transition", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /presentationStyle="fullScreen"/);
  assert.match(
    selector,
    /animationType=\{Platform\.OS === "ios" \? "none" : "slide"\}/,
  );
});
