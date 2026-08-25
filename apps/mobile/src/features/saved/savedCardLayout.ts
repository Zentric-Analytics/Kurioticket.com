export const SAVED_CARD_HORIZONTAL_INSET = 16;
export const SAVED_CARD_MAX_WIDTH = 555;
export const SAVED_CARD_MIN_WIDTH = 240;
export const SAVED_CARD_IMAGE_HEIGHT_RATIO = 0.44;
export const SAVED_CARD_INFORMATION_HEIGHT_RATIO = 0.31;
export const SAVED_CARD_MIN_INFORMATION_HEIGHT = 165;

export function savedCardLayout(screenWidth: number) {
  const width = Math.min(
    SAVED_CARD_MAX_WIDTH,
    Math.max(SAVED_CARD_MIN_WIDTH, screenWidth - SAVED_CARD_HORIZONTAL_INSET * 2),
  );
  const imageHeight = Math.round(width * SAVED_CARD_IMAGE_HEIGHT_RATIO);
  const informationHeight = Math.max(
    SAVED_CARD_MIN_INFORMATION_HEIGHT,
    Math.round(width * SAVED_CARD_INFORMATION_HEIGHT_RATIO),
  );

  return {
    width,
    height: imageHeight + informationHeight,
    imageHeight,
    informationHeight,
  };
}
