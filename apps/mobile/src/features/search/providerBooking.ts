export type ProviderBookingUrls = {
  partnerRedirectUrl?: string | null;
  bookingUrl?: string | null;
};

/** Returns the provider-controlled destination that should be used for booking. */
export function authoritativeProviderUrl(result: ProviderBookingUrls) {
  return result.partnerRedirectUrl || result.bookingUrl || "";
}
