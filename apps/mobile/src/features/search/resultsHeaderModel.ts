export const DATE_HEADER_COLLAPSE_Y = 40;
export const DATE_HEADER_RESTORE_Y = 8;

/**
 * Uses separate collapse and restore boundaries so small scroll jitter cannot
 * repeatedly toggle the date header.
 */
export function resolveDateHeaderCollapsed(
  currentY: number,
  collapsed: boolean,
) {
  if (collapsed) return currentY > DATE_HEADER_RESTORE_Y;
  return currentY >= DATE_HEADER_COLLAPSE_Y;
}
