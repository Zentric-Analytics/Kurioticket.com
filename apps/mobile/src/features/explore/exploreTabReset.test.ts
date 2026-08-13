import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const tab = readFileSync("app/(tabs)/explore.tsx", "utf8");

test("Explore search resets only when returning from another tab", () => {
  assert.match(tab, /navigation\.addListener\("tabPress"/);
  assert.match(tab, /if \(!navigation\.isFocused\(\)\) setVisitKey/);
  assert.match(tab, /return <ExploreScreen key=\{visitKey\} \/>/);
  assert.doesNotMatch(tab, /useFocusEffect/);
  assert.doesNotMatch(tab, /ENTRY_DURATION_MS|Animated|loadingTitle|showEntry/);
});
