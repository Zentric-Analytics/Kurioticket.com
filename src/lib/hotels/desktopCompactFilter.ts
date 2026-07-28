export type CompactFilterMaxHeightInput = {
  viewportHeight: number;
  topOffset: number;
  bottomGap: number;
};

export function calculateCompactFilterMaxHeight({
  viewportHeight,
  topOffset,
  bottomGap,
}: CompactFilterMaxHeightInput): number {
  if (
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(topOffset) ||
    !Number.isFinite(bottomGap)
  ) {
    return 0;
  }

  return Math.max(0, viewportHeight - topOffset - bottomGap);
}
