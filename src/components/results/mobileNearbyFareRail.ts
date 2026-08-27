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
