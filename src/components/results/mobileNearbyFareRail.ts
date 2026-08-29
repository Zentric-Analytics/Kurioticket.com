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
