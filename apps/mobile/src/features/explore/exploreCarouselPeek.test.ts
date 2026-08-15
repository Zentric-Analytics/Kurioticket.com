import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = () => readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");

test("Explore region carousels reveal a clear next-card preview", () => {
  const screen = source();
  assert.match(screen, /REGION_PREVIEW_CARD_WIDTH_RATIO = 0\.928/);
  assert.match(screen, /REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO = 0\.058/);
  assert.match(screen, /previewCardWidth = windowWidth \* \(REGION_PREVIEW_CARD_WIDTH_RATIO - REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO\)/);
  assert.match(screen, /REGION_PREVIEW_INSET_RATIO = 0\.024/);
  assert.match(screen, /REGION_PREVIEW_GAP_RATIO = 0\.024/);

  const cardWidthRatio = 0.928 - 0.058;
  const nextCardPeekRatio = 1 - 0.024 - cardWidthRatio - 0.024;

  assert.equal(cardWidthRatio, 0.87);
  assert.ok(nextCardPeekRatio >= 0.08);
  assert.ok(nextCardPeekRatio < 0.09);
  assert.match(screen, /snapToInterval={previewCardWidth \+ previewGap}/);
  assert.match(screen, /decelerationRate="fast"/);
});
