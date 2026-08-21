export type DesktopPopoverPlacement = "above" | "below";

export function resolveDesktopPopoverGeometry({
  availableAbove,
  availableBelow,
  desiredHeight,
  placement = "auto",
}: {
  availableAbove: number;
  availableBelow: number;
  desiredHeight?: number;
  placement?: "auto" | DesktopPopoverPlacement;
}) {
  const preferredHeight = Math.max(0, desiredHeight ?? 0);
  const fitsBelow = desiredHeight === undefined || availableBelow >= preferredHeight;
  const fitsAbove = desiredHeight === undefined || availableAbove >= preferredHeight;
  const resolvedPlacement: DesktopPopoverPlacement = placement !== "auto"
    ? placement
    : fitsBelow
      ? "below"
      : fitsAbove
        ? "above"
        : availableBelow >= availableAbove
          ? "below"
          : "above";
  const availableHeight = resolvedPlacement === "above" ? availableAbove : availableBelow;
  const fitsSelectedSide = desiredHeight === undefined || availableHeight >= preferredHeight;

  return {
    placement: resolvedPlacement,
    maxHeight: fitsSelectedSide ? undefined : availableHeight,
  };
}
