/**
 * Last seen is the newest *recorded* observation, never a presence flag.
 * Registered accounts may have activity in multiple first-party sources.
 * The directory uses already-verified account IDs; guest observations remain
 * separate and subject to the existing visitor visibility rules.
 */
export type UserObservation = { userId: string | null; lastSeenAt: Date | null };
export function combineRegisteredLastSeen(
  ...sources: ReadonlyArray<ReadonlyArray<UserObservation>>
): Map<string, Date> {
  const latest = new Map<string, Date>();
  for (const source of sources) {
    for (const entry of source) {
      if (!entry.userId || !entry.lastSeenAt || !Number.isFinite(entry.lastSeenAt.getTime())) continue;
      const prior = latest.get(entry.userId);
      if (!prior || prior.getTime() < entry.lastSeenAt.getTime()) latest.set(entry.userId, entry.lastSeenAt);
    }
  }
  return latest;
}
