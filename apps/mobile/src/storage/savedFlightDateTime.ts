const SAVED_FLIGHT_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Produces the API/storage representation of an itinerary clock value.
 * Provider-local values deliberately retain their written clock components;
 * this value must not be substituted for the provider value in display data.
 */
export function canonicalSavedFlightDateTime(value: string): string {
  const match = SAVED_FLIGHT_DATE_TIME.exec(value);
  if (!match) throw new Error("Invalid saved flight datetime.");

  const [, year, month, day, hour, minute, seconds = "00", fraction = "", offset] = match;
  const milliseconds = fraction.padEnd(3, "0").slice(0, 3);
  const localCanonical = `${year}-${month}-${day}T${hour}:${minute}:${seconds}.${milliseconds}Z`;
  const candidate = offset ? value : localCanonical;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid saved flight datetime.");

  const canonical = parsed.toISOString();
  // Date parsing normalizes impossible provider-local dates (for example Feb 30),
  // so compare the clock fields before accepting a local value.
  if (!offset && canonical !== localCanonical) throw new Error("Invalid saved flight datetime.");
  return canonical;
}
