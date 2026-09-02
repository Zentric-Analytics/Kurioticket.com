export type CanonicalResultAcceptance<T> = {
  canonicalCount: number;
  accepted: T[];
  rejectedIds: string[];
};

/**
 * Applies client transport/security checks without redefining server-owned
 * inventory eligibility. Rejections are retained as diagnostics so a
 * non-empty canonical response can never be presented as a genuine empty
 * search.
 */
export function acceptCanonicalResults<T extends { id?: unknown }>(
  results: readonly T[],
  isSafeForPresentation: (result: T) => boolean,
): CanonicalResultAcceptance<T> {
  const accepted: T[] = [];
  const rejectedIds: string[] = [];

  for (const result of results) {
    if (isSafeForPresentation(result)) accepted.push(result);
    else rejectedIds.push(typeof result.id === "string" && result.id ? result.id : "missing-id");
  }

  return { canonicalCount: results.length, accepted, rejectedIds };
}

export function canonicalResultsWereSilentlyLost(
  acceptance: Pick<CanonicalResultAcceptance<unknown>, "canonicalCount" | "accepted">,
) {
  return acceptance.canonicalCount > 0 && acceptance.accepted.length === 0;
}
