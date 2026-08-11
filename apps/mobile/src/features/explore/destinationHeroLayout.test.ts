import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = () => readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");

test("destination hero uses one bounded native frame with absolute-fill image", () => {
  const details = source();
  const page = details.slice(details.indexOf("function DestinationPage"), details.indexOf("function Section"));
  const styles = details.slice(details.indexOf("const styles = StyleSheet.create"));

  assert.equal(page.match(/<View[^>]*styles\.heroFrame[^>]*>/g)?.length, 1);
  assert.match(
    page,
    /<View collapsable=\{false\} style=\{\[styles\.heroFrame, \{ backgroundColor: theme\.border \}\]\}>/,
  );
  assert.match(page, /resizeMode="cover"/);
  assert.match(styles, /heroFrame: \{ width: "100%", height: 360, overflow: "hidden"/);
  assert.match(styles, /hero: \{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 \}/);
  assert.doesNotMatch(styles, /hero: \{[^}]*\b(?:aspectRatio|minHeight|maxHeight|height|width)\b/);
});

test("destination hero fix preserves the shared scroll trailing-space contract", () => {
  const details = source();
  assert.match(details, /const DESTINATION_DETAILS_BOTTOM_PADDING = 36;/);
  assert.match(details, /content: \{ paddingBottom: DESTINATION_DETAILS_BOTTOM_PADDING \}/);
  assert.match(details, /alwaysBounceVertical={false}/);
  assert.match(details, /bounces={false}/);
  assert.match(details, /overScrollMode="never"/);
});
