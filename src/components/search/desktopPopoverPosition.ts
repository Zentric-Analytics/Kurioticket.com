export type PopoverRect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

export type DesktopPopoverGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

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
