/** An operational session is not a durable visitor identity or a distinct person.
 *  This combined card counts account records, eligible consented visitor identities,
 *  and unique, unlinked operational guest sessions once each. */
export function recordedAccountsAndGuestSessionsTotal(
  population: { total: number; registered: number; guests: number } | null,
  operationalSessions: number | null,
): number | null {
  if (!population || operationalSessions === null) return null;
  const values = [population.total, population.registered, population.guests, operationalSessions];
  if (!values.every(value => Number.isSafeInteger(value) && value >= 0)
    || population.registered + population.guests !== population.total) return null;
  const combined = population.total + operationalSessions;
  return Number.isSafeInteger(combined) ? combined : null;
}
