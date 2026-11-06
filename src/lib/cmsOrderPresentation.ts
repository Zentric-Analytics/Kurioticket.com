/**
 * Admin Content uses human-friendly 1-based Order positions.
 * CMS payloads, revisions, ordering and public readers retain their existing
 * zero-based storage values; never increment stored content during display.
 */
export const CMS_DISPLAY_ORDER_MIN = 1;
export const CMS_DISPLAY_ORDER_MAX = 100001;

export function cmsOrderForDisplay(storedOrder: number): number {
  return storedOrder + 1;
}

export function cmsOrderForStorage(displayOrder: string): number {
  return Number(displayOrder) - 1;
}
