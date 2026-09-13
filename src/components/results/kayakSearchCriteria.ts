/** Filters, sorting and pagination must not restart provider searches. */
export function kayakSearchCriteria(params: Record<string, string | string[] | undefined>) {
  const keys = ["tripType", "origin", "destination", "departureDate", "returnDate", "adults", "children", "infants", "travelers", "cabinClass", "checkIn", "checkOut", "guests", "rooms", "pickupLocation", "dropoffLocation", "pickupDate", "dropoffDate", "pickupTime", "dropoffTime", "driverAge", "currency"];
  return Object.fromEntries(keys.flatMap(key => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined ? [] : [[key, first]];
  }));
}
