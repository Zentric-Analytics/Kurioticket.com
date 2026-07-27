export type DesktopStickySearchVisibilityInput = {
  viewportWidth: number;
  formBottom: number | null | undefined;
  desktopBreakpoint?: number;
  topThreshold?: number;
};

export function shouldShowDesktopStickySearch({
  viewportWidth,
  formBottom,
  desktopBreakpoint = 1024,
  topThreshold = 16,
}: DesktopStickySearchVisibilityInput): boolean {
  return (
    Number.isFinite(viewportWidth) &&
    viewportWidth >= desktopBreakpoint &&
    typeof formBottom === "number" &&
    Number.isFinite(formBottom) &&
    formBottom <= topThreshold
  );
}
