/** Decode a route segment once, before it becomes an API query parameter.
 * Client navigation can supply the encoded segment; URLSearchParams must
 * receive the provider's original ID, not encode its percent escapes again.
 */
export function decodeHotelRouteId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
