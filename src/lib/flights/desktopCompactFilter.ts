export type DesktopCompactFilterVisibilityInput = {
  viewportWidth: number;
  sentinelTop: number;
  topOffset: number;
};

export function shouldShowDesktopCompactFilter({
  viewportWidth,
  sentinelTop,
  topOffset,
}: DesktopCompactFilterVisibilityInput): boolean {
  return viewportWidth >= 1024 && sentinelTop <= topOffset;
}
