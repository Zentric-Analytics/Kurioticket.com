/** Keep the endpoint's 160 UTF-16-unit limit without splitting Unicode characters. */
export function encodeExploreMapQuery(value: string): string {
  let query = "";
  for (const character of value) {
    if (query.length + character.length > 160) break;
    // Clipboard/input strings can also contain an already-unpaired surrogate.
    query += character.length === 1 && /[\uD800-\uDFFF]/.test(character) ? "\uFFFD" : character;
  }
  return encodeURIComponent(query);
}
