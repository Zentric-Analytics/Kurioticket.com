import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = () => readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");

test("Explore region preview cards have no visible outer border", () => {
  const screen = source();
  const previewStyles = screen.slice(screen.indexOf("previewCard:"), screen.indexOf("previewMain:"));
  const previewComponent = screen.slice(screen.indexOf("function RegionPreviewCard"), screen.indexOf("type RegionDiscoveryItem"));

  assert.doesNotMatch(previewStyles, /borderWidth/);
  assert.doesNotMatch(previewComponent, /borderColor: theme\.border/);
  assert.match(previewStyles, /borderRadius: 6/);
  assert.match(previewStyles, /overflow: "hidden"/);
});
