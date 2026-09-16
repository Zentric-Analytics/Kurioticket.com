import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Flight Results preserves handled keyboard-active taps for the nested Price Alert modal", () => {
  const listStart = source.indexOf("<Animated.SectionList");
  assert.notEqual(listStart, -1);
  const openingTag = source.slice(listStart, source.indexOf(">", listStart) + 1);

  assert.match(openingTag, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(openingTag, /keyboardShouldPersistTaps=(?:"never"|\{false\})/);

  const listContent = source.slice(listStart, source.indexOf("</Animated.SectionList>", listStart));
  assert.match(listContent, /<PriceAlert product="flight"/);
});
