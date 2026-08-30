import type { CanonicalLocation, LocationSearchMatch } from "./types";

export function normalizeLocationText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

const words = (value: string) => normalizeLocationText(value).split(" ").filter(Boolean);

function boundedEditDistance(left: string, right: string, maximum: number) {
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[right.length];
}

function searchableTerms(location: CanonicalLocation) {
  return [
    location.primaryLabel,
    location.supportingLabel,
    location.submittedValue,
    location.codes?.iata,
    location.codes?.icao,
    ...(location.aliases ?? []),
    ...Object.values(location.localizedSearchTerms ?? {}).flat(),
  ].filter((term): term is string => Boolean(term));
}

export function rankLocation(location: CanonicalLocation, rawQuery: string): LocationSearchMatch | null {
  const query = normalizeLocationText(rawQuery);
  if (!query) return null;
  const iata = normalizeLocationText(location.codes?.iata ?? "");
  const icao = normalizeLocationText(location.codes?.icao ?? "");
  if (query === iata || query === icao) return { location, tier: "code-exact", score: 600 };

  const terms = searchableTerms(location).map(normalizeLocationText).filter(Boolean);
  if (terms.some((term) => term === query)) return { location, tier: "label-exact", score: 500 };
  if (terms.some((term) => term.startsWith(query))) return { location, tier: "prefix", score: 400 };
  if (terms.some((term) => words(term).some((word) => word.startsWith(query)))) {
    return { location, tier: "word-prefix", score: 300 };
  }
  if (terms.some((term) => term.includes(query))) return { location, tier: "substring", score: 200 };

  // Typo tolerance is deliberately narrow: never for codes/short input and only one edit.
  if (query.length >= 5 && terms.some((term) => words(term).some((word) => word.length >= 5 && boundedEditDistance(query, word, 1) <= 1))) {
    return { location, tier: "typo", score: 100 };
  }
  return null;
}

export function searchLocations(catalog: readonly CanonicalLocation[], query: string, limit = 10) {
  const safeLimit = Math.max(1, Math.min(25, Math.trunc(limit)));
  return catalog
    .map((location, index) => ({ match: rankLocation(location, query), index }))
    .filter((entry): entry is { match: LocationSearchMatch; index: number } => entry.match !== null)
    .sort((left, right) => right.match.score - left.match.score || left.index - right.index)
    .slice(0, safeLimit);
}
