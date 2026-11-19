/** setParams merges; clear omitted authority rather than inheriting an older
 * airport's signed selection into newly edited criteria. */
export function carResultsRouteUpdate(next: Record<string, string>) {
  const keys = ["pickupLocation", "dropoffLocation", "pickupDate", "dropoffDate", "pickupTime", "dropoffTime", "driverAge", "pickupLocationTarget", "dropoffLocationTarget"];
  return Object.fromEntries(keys.map(key => [key, next[key] ?? ""]));
}
