/** Platform-neutral input eligibility. Resolution and inventory remain server-owned. */
export function locationSearchLetterCount(query: string): number {
  return (query.normalize("NFKC").match(/\p{L}/gu) ?? []).length;
}
export function hasMinimumLocationSearchLetters(query: string): boolean {
  return locationSearchLetterCount(query) >= 2;
}
