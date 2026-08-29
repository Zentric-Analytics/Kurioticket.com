export function getCenteredRailScrollLeft({
  selectedLeftWithinRail,
  selectedWidth,
  railWidth,
  scrollWidth,
}: {
  selectedLeftWithinRail: number;
  selectedWidth: number;
  railWidth: number;
  scrollWidth: number;
}) {
  const target = selectedLeftWithinRail - (railWidth - selectedWidth) / 2;
  const maximum = Math.max(scrollWidth - railWidth, 0);

  return Math.max(0, Math.min(target, maximum));
}

export const nearbyFareAnchorTolerancePx = 2;

export type HorizontalRect = Pick<DOMRect, "left" | "right">;

export function isHorizontallyVisibleWithinContainer(
  elementRect: HorizontalRect,
  containerRect: HorizontalRect,
  inset = 1,
) {
  return (
    elementRect.right > containerRect.left + inset &&
    elementRect.left < containerRect.right - inset
  );
}

export function getNearbyFareAnchorCorrection({
  selectedWasVisible,
  previousOffsetX,
  currentOffsetX,
  tolerance = nearbyFareAnchorTolerancePx,
}: {
  selectedWasVisible: boolean;
  previousOffsetX: number | null;
  currentOffsetX: number | null;
  tolerance?: number;
}) {
  if (
    !selectedWasVisible ||
    previousOffsetX === null ||
    currentOffsetX === null
  ) {
    return 0;
  }

  const delta = currentOffsetX - previousOffsetX;
  return Math.abs(delta) > tolerance ? delta : 0;
}
