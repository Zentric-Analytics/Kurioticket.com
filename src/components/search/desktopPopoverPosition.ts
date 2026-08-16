export type PopoverRect = Pick<
  DOMRect,
  "left" | "right" | "top" | "bottom" | "width" | "height"
>;

export type DesktopPopoverGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "above" | "below";
};

export const MIN_VISIBLE_LOCATION_PANEL_HEIGHT = 160;

export function calculateLocationPanelScrollAdjustment({
  boundaryRect,
  viewportHeight,
  viewportPadding,
  topViewportPadding = viewportPadding,
  gap,
  minimumVisibleHeight = MIN_VISIBLE_LOCATION_PANEL_HEIGHT,
}: {
  boundaryRect: PopoverRect;
  viewportHeight: number;
  viewportPadding: number;
  topViewportPadding?: number;
  gap: number;
  minimumVisibleHeight?: number;
}) {
  const finite = (value: number) => (Number.isFinite(value) ? value : 0);
  const requiredBottom =
    finite(boundaryRect.bottom) +
    finite(gap) +
    Math.max(0, finite(minimumVisibleHeight)) +
    Math.max(0, finite(viewportPadding));
  const shortfall = Math.max(
    0,
    requiredBottom - Math.max(0, finite(viewportHeight)),
  );
  const maximumUsefulScroll = Math.max(
    0,
    finite(boundaryRect.top) - Math.max(0, finite(topViewportPadding)),
  );
  return Math.max(0, Math.min(shortfall, maximumUsefulScroll));
}

export function calculateDesktopPopoverGeometry({
  fieldRect,
  boundaryRect,
  viewportWidth,
  viewportHeight,
  viewportPadding,
  gap,
  preferredWidth,
  align = "start",
  desiredHeight,
}: {
  fieldRect: PopoverRect;
  boundaryRect: PopoverRect;
  viewportWidth: number;
  viewportHeight: number;
  viewportPadding: number;
  gap: number;
  preferredWidth?: number;
  align?: "start" | "center" | "end";
  desiredHeight?: number;
}): DesktopPopoverGeometry {
  const safeWidth = Math.max(0, viewportWidth - viewportPadding * 2);
  const width = Math.max(
    0,
    Math.min(preferredWidth ?? fieldRect.width, safeWidth),
  );
  const maximumLeft = Math.max(
    viewportPadding,
    viewportWidth - viewportPadding - width,
  );
  const requestedLeft =
    align === "end"
      ? fieldRect.right - width
      : align === "center"
        ? fieldRect.left + fieldRect.width / 2 - width / 2
        : fieldRect.left;
  const left = Math.min(Math.max(requestedLeft, viewportPadding), maximumLeft);
  const belowTop = boundaryRect.bottom + gap;
  const belowHeight = Math.max(0, viewportHeight - viewportPadding - belowTop);
  const aboveHeight = Math.max(0, boundaryRect.top - gap - viewportPadding);
  const openAbove =
    desiredHeight !== undefined &&
    belowHeight < desiredHeight &&
    aboveHeight > belowHeight;
  const maxHeight = openAbove ? aboveHeight : belowHeight;
  // For an above placement, `top` is the launcher's adjacent edge rather than
  // the top of all available space. The popover translates by its own rendered
  // height, so short content stays attached instead of floating near the header.
  const top = openAbove
    ? Math.max(
        viewportPadding,
        boundaryRect.top - gap - Math.min(desiredHeight ?? aboveHeight, aboveHeight),
      )
    : belowTop;

  return {
    left,
    top,
    width,
    maxHeight,
    placement: openAbove ? "above" : "below",
  };
}
