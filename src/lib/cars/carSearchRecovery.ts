import type { LocationBoundCarSearchParams } from "./types";

/** Preserve editable search details, never rejected provider-authority handles. */
export function carSearchRecoveryHref(values: LocationBoundCarSearchParams & { returnToDifferentLocation: boolean }) {
  const query = new URLSearchParams();
  for (const field of ["pickupLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"] as const) {
    if (values[field]) query.set(field, values[field]);
  }
  if (values.returnToDifferentLocation) {
    query.set("returnToDifferentLocation", "true");
    if (values.dropoffLocation) query.set("dropoffLocation", values.dropoffLocation);
  }
  return `/cars?${query}`;
}
