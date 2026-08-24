export const REGION_BROWSE_HORIZONTAL_INSET = 18;
export const REGION_BROWSE_CARD_HORIZONTAL_INSET = 8;
export const REGION_BROWSE_IMAGE_ASPECT_RATIO = 1.7;
export const REGION_BROWSE_IMAGE_HEIGHT_RATIO = 0.6;

export function regionBrowseCardLayout(screenWidth: number) {
  const width = Math.max(
    240,
    screenWidth - REGION_BROWSE_CARD_HORIZONTAL_INSET * 2,
  );
  const imageHeight = width / REGION_BROWSE_IMAGE_ASPECT_RATIO;
  const height = imageHeight / REGION_BROWSE_IMAGE_HEIGHT_RATIO;
  return { width, height, imageHeight, informationHeight: height - imageHeight };
}
