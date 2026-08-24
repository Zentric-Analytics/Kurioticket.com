import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  REGION_PREVIEW_CARD_WIDTH_RATIO,
  REGION_PREVIEW_GAP_RATIO,
  REGION_PREVIEW_INSET_RATIO,
  REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO,
  regionPreviewCardLayout,
} from "./regionPreviewLayout";

const source = () => readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");

test("Explore region carousels reveal a clear next-card preview", () => {
  const screen = source();
  assert.equal(REGION_PREVIEW_CARD_WIDTH_RATIO, 0.928);
  assert.equal(REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO, 0.058);
  assert.equal(REGION_PREVIEW_INSET_RATIO, 0.024);
  assert.equal(REGION_PREVIEW_GAP_RATIO, 0.024);

  const layout = regionPreviewCardLayout(390);
  const cardWidthRatio = layout.cardWidth / 390;
  const nextCardPeekRatio = 1 - layout.inset / 390 - cardWidthRatio - layout.gap / 390;

  assert.equal(cardWidthRatio, 0.87);
  assert.ok(nextCardPeekRatio >= 0.08);
  assert.ok(nextCardPeekRatio < 0.09);
  assert.match(screen, /regionPreviewCardLayout\(windowWidth\)/);
  assert.match(screen, /snapToInterval={previewCardWidth \+ previewGap}/);
  assert.match(screen, /decelerationRate="fast"/);
});
