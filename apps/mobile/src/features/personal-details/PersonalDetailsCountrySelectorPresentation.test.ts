import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("country selector uses a smooth iOS fade without sliding through the parent header", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /presentationStyle="fullScreen"/);
  assert.match(
    selector,
    /animationType=\{Platform\.OS === "ios" \? "fade" : "slide"\}/,
  );
});

test("country selector ignores a stale native dismiss after a new open", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /const visibleRef = useRef\(visible\)/);
  assert.match(
    selector,
    /useEffect\(\(\) => \{\s*visibleRef\.current = visible;\s*\}, \[visible\]\)/,
  );
  assert.match(
    selector,
    /const handleDismiss = \(\) => \{\s*if \(visibleRef\.current\) return;/,
  );
});
