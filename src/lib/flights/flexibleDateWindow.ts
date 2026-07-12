export type DateWindowStartOptions = {
  selectedIndex: number;
  totalDates: number;
  visibleCount: number;
  desiredPosition?: number;
};

export function getDateWindowStart({
  selectedIndex,
  totalDates,
  visibleCount,
  desiredPosition = 2,
}: DateWindowStartOptions): number {
  if (totalDates <= 0 || visibleCount <= 0 || selectedIndex < 0) return 0;

  const safeVisibleCount = Math.max(1, Math.min(visibleCount, totalDates));
  const maxWindowStart = Math.max(0, totalDates - safeVisibleCount);
  const preferredWindowStart = selectedIndex - Math.max(0, desiredPosition);

  return Math.max(0, Math.min(preferredWindowStart, maxWindowStart));
}
