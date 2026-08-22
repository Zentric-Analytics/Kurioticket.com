/**
 * Returns the first safe remote logo already supplied by travel inventory.
 * Keeping this at the shared logo boundary makes results, itinerary, and
 * booking-provider presentations follow the same URL rules.
 */
export function resolveTravelProviderLogo(
  ...logoUrls: Array<string | null | undefined>
): string | null {
  for (const value of logoUrls) {
    const url = value?.trim();
    if (url && /^https:\/\//i.test(url)) return url;
  }
  return null;
}
