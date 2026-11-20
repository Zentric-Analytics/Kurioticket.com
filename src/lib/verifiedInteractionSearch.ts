/** Strict, source-backed correlation; never assign an interaction by route,
 * timestamp proximity alone, or broad account identity. */
export function matchesInteractionSearch(
  search: {
    visitorId: string | null;
    userId: string | null;
    type: string;
    query: unknown;
    createdAt: Date;
  } | null,
  actor: { visitorId: string | null; userId: string | null },
  product: string,
  environment: "staging" | "production",
  now: Date,
): boolean {
  if (!search || !actor.visitorId || search.visitorId !== actor.visitorId) return false;
  if (search.userId !== null && search.userId !== actor.userId) return false;
  if (search.type !== product) return false;
  if (!search.query || typeof search.query !== "object" || Array.isArray(search.query)) return false;
  const metadata = search.query as Record<string, unknown>;
  if (metadata.environment !== environment) return false;
  const elapsed = now.getTime() - search.createdAt.getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 30 * 60 * 1000;
}
