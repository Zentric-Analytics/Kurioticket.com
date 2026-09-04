import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(
  fileURLToPath(new URL("./ApprovedResultsScreen.tsx", import.meta.url)),
  "utf8",
);

test("Flight Results price-alert switch stays compact, centered, and accessible", () => {
  const flightBranch = source.match(/if \(flight\) \{[\s\S]*?if \(product !== "hotel"/)?.[0] ?? "";

  assert.match(flightBranch, /<Switch[^>]*accessibilityRole="switch"/);
  assert.match(flightBranch, /accessibilityLabel="Track this flight price"/);
  assert.match(flightBranch, /hitSlop=\{6\}/);
  assert.match(flightBranch, /style=\{s0\.flightPriceAlertSwitch\}/);
  assert.match(source, /flightAlertSwitchSlot:\s*\{[^}]*minWidth:\s*51[^}]*minHeight:\s*44/s);
  assert.match(source, /flightPriceAlertSwitch:\s*\{\s*transform:\s*\[\{ scale:\s*0\.88 \}, \{ translateY:\s*1 \}\]\s*\}/);
  assert.doesNotMatch(
    source.match(/flightPriceAlertSwitch:\s*\{[^\n]*\}/)?.[0] ?? "",
    /margin(?:Top|Bottom|Left|Right):\s*-/,
  );
  assert.match(source, /style=\{Platform\.OS === "ios" \? s0\.hotelAlertSwitchIos : undefined\}/);
});
