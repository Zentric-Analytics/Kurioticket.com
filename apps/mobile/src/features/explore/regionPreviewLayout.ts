export const REGION_PREVIEW_CARD_WIDTH_RATIO = 0.928;
export const REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO = 0.058;
export const REGION_PREVIEW_INSET_RATIO = 0.024;
export const REGION_PREVIEW_GAP_RATIO = 0.024;
export const REGION_PREVIEW_ASPECT_RATIO = 2.13;
export const REGION_PREVIEW_IMAGE_ASPECT_RATIO = 3.21;
export const REGION_PREVIEW_IMAGE_HEIGHT_SCALE = 1.12;

export function regionPreviewCardLayout(windowWidth: number) {
  const cardWidth = windowWidth * (REGION_PREVIEW_CARD_WIDTH_RATIO - REGION_PREVIEW_NEXT_CARD_PEEK_EXPANSION_RATIO);
  const previousCardHeight = cardWidth / REGION_PREVIEW_ASPECT_RATIO;
  const previousImageHeight = cardWidth / REGION_PREVIEW_IMAGE_ASPECT_RATIO;
  const imageHeight = previousImageHeight * REGION_PREVIEW_IMAGE_HEIGHT_SCALE;
  const cardHeight = previousCardHeight + (imageHeight - previousImageHeight);
  const inset = windowWidth * REGION_PREVIEW_INSET_RATIO;
  const gap = windowWidth * REGION_PREVIEW_GAP_RATIO;
  return { cardWidth, cardHeight, imageHeight, inset, gap };
}
