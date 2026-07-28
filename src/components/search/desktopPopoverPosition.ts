export type PopoverRect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

export type DesktopPopoverGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
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
  const finite = (value: number) => Number.isFinite(value) ? value : 0;
  const requiredBottom = finite(boundaryRect.bottom) + finite(gap) + Math.max(0, finite(minimumVisibleHeight)) + Math.max(0, finite(viewportPadding));
  const shortfall = Math.max(0, requiredBottom - Math.max(0, finite(viewportHeight)));
  const maximumUsefulScroll = Math.max(0, finite(boundaryRect.top) - Math.max(0, finite(topViewportPadding)));
  return Math.max(0, Math.min(shortfall, maximumUsefulScroll));
}

export function calculateDesktopPopoverGeometry({
  fieldRect,
  boundaryRect,
  viewportWidth,
  viewportHeight,
  viewportPadding,
  gap,
}: {
  fieldRect: PopoverRect;
  boundaryRect: PopoverRect;
  viewportWidth: number;
  viewportHeight: number;
  viewportPadding: number;
  gap: number;
}): DesktopPopoverGeometry {
  const safeWidth = Math.max(0, viewportWidth - viewportPadding * 2);
  const width = Math.max(0, Math.min(fieldRect.width, safeWidth));
  const maximumLeft = Math.max(viewportPadding, viewportWidth - viewportPadding - width);
  const left = Math.min(Math.max(fieldRect.left, viewportPadding), maximumLeft);
  const top = boundaryRect.bottom + gap;
  const maxHeight = Math.max(0, viewportHeight - viewportPadding - top);

  return { left, top, width, maxHeight };
}
