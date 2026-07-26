export type PopoverRect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

export type DesktopPopoverGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "above" | "below";
};

export function calculateDesktopPopoverGeometry({
  fieldRect,
  boundaryRect,
  viewportWidth,
  viewportHeight,
  viewportPadding,
  gap,
  panelHeight,
}: {
  fieldRect: PopoverRect;
  boundaryRect: PopoverRect;
  viewportWidth: number;
  viewportHeight: number;
  viewportPadding: number;
  gap: number;
  panelHeight?: number;
}): DesktopPopoverGeometry {
  const safeWidth = Math.max(0, viewportWidth - viewportPadding * 2);
  const width = Math.max(0, Math.min(fieldRect.width, safeWidth));
  const maximumLeft = Math.max(viewportPadding, viewportWidth - viewportPadding - width);
  const left = Math.min(Math.max(fieldRect.left, viewportPadding), maximumLeft);
  const usableHeight = Math.max(0, viewportHeight - viewportPadding * 2);
  const availableBelow = Math.min(usableHeight, Math.max(0, viewportHeight - viewportPadding - boundaryRect.bottom - gap));
  const availableAbove = Math.min(usableHeight, Math.max(0, boundaryRect.top - gap - viewportPadding));
  const desiredHeight = Math.max(0, panelHeight ?? 320);
  const placement = availableBelow >= Math.min(desiredHeight, 320) || availableBelow >= availableAbove
    ? "below"
    : "above";
  const maxHeight = placement === "below" ? availableBelow : availableAbove;
  const renderedHeight = Math.min(desiredHeight, maxHeight);
  const top = placement === "below"
    ? Math.min(viewportHeight - viewportPadding, boundaryRect.bottom + gap)
    : Math.max(viewportPadding, boundaryRect.top - gap - renderedHeight);

  return { left, top, width, maxHeight, placement };
}
