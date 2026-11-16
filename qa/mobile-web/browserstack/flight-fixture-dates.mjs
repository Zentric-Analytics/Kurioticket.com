// Keep both the requested journey and synthetic offers ahead of the server clock.
export function flightFixtureDates(now = new Date()) {
  const departure = new Date(now);
  departure.setUTCDate(departure.getUTCDate() + 30);
  const returning = new Date(departure);
  returning.setUTCDate(returning.getUTCDate() + 2);
  return {
    departureDate: departure.toISOString().slice(0, 10),
    returnDate: returning.toISOString().slice(0, 10),
  };
}
