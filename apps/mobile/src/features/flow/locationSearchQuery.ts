/** Hermes-safe minimum query rule shared by native location pickers. */
export function locationSearchLetterCount(query: string): number {
  return (query.match(/[A-Za-z]/g) ?? []).length;
}

export function hasMinimumLocationSearchLetters(query: string): boolean {
  return locationSearchLetterCount(query) >= 2;
}
