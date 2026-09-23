/** Cars location searches require two alphabetic characters, matching native. */
export function hasMinimumCarLocationSearchLetters(query: string) {
  return (query.match(/[A-Za-z]/g) ?? []).length >= 2;
}
