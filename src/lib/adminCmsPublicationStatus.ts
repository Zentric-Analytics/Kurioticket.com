/**
 * Compare the actual CMS draft and published snapshots. A revision bump can
 * come from automatic order normalization or a no-op save; the version number
 * alone does not mean the public content changed.
 */
export type CmsPublicationSnapshot = {
  publishedVersion: number | null;
  draftPayload: unknown;
  publishedPayload: unknown;
  market: string;
  publishedMarket: string | null;
  locale: string;
  publishedLocale: string | null;
  sortOrder: number;
  publishedSortOrder: number | null;
};

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => sameJsonValue(entry, right[index]));
  }

  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const keys = Object.keys(leftObject);
  return keys.length === Object.keys(rightObject).length &&
    keys.every((key) =>
      Object.prototype.hasOwnProperty.call(rightObject, key) &&
      sameJsonValue(leftObject[key], rightObject[key]));
}

export function getCmsUnpublishedChangeLabel(item: CmsPublicationSnapshot): string | null {
  if (item.publishedVersion === null) return null;

  // A missing published snapshot is inconsistent; do not silently hide it.
  if (item.publishedPayload === null || item.publishedPayload === undefined) {
    return "Unpublished changes";
  }

  const changes: string[] = [];
  if (!sameJsonValue(item.draftPayload, item.publishedPayload)) changes.push("content");
  if (item.sortOrder !== item.publishedSortOrder) changes.push("order");
  if (item.market !== item.publishedMarket) changes.push("market");
  if (item.locale !== item.publishedLocale) changes.push("language");

  if (changes.length === 0) return null;
  if (changes.length === 1) return `Unpublished ${changes[0]} changes`;
  if (changes.length === 2) return `Unpublished ${changes[0]} and ${changes[1]} changes`;
  return `Unpublished ${changes.slice(0, -1).join(", ")}, and ${changes.at(-1)} changes`;
}
