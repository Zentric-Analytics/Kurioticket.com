/** Viewport-safe placement for the same anchored rate information popup as mobile web. */
export type HotelRateInfoAnchor = { x: number; y: number; width: number; height: number };
export type HotelRateInfoViewport = { width: number; height: number };

const EDGE = 12;
const GAP = 12;
const MAX_WIDTH = 304;

export function placeHotelRatePopover(
  anchor: HotelRateInfoAnchor,
  viewport: HotelRateInfoViewport,
  contentHeight: number,
) {
  const spaceRight = Math.max(0, viewport.width - anchor.x - anchor.width - 24);
  const spaceLeft = Math.max(0, anchor.x - 24);
  const opensRight = spaceRight >= MAX_WIDTH || spaceRight >= spaceLeft;
  const availableWidth = opensRight ? spaceRight : spaceLeft;
  const width = Math.min(
    Math.max(0, viewport.width - EDGE * 2),
    Math.max(Math.min(180, viewport.width - EDGE * 2), Math.min(MAX_WIDTH, availableWidth)),
  );
  const requestedLeft = opensRight
    ? anchor.x + anchor.width + GAP
    : anchor.x - GAP - width;
  const left = Math.max(EDGE, Math.min(requestedLeft, viewport.width - width - EDGE));
  const maxHeight = Math.max(100, viewport.height - EDGE * 2);
  const height = Math.min(contentHeight, maxHeight);
  const top = Math.max(EDGE, Math.min(anchor.y - 20, viewport.height - height - EDGE));
  const pointerTop = Math.max(16, Math.min(
    anchor.y + anchor.height / 2 - top,
    Math.max(16, height - 16),
  ));
  return {
    left, top, width, maxHeight, pointerTop,
    pointerSide: opensRight ? "left" as const : "right" as const,
  };
}
