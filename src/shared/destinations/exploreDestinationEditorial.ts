import { airports } from "../airports";
import { buildCanonicalExploreDestinations } from "./exploreDestinationCatalogue";
import { rawExploreDestinationEditorial } from "./editorial";
import type { ExploreDestinationEditorial } from "./editorial";

export type {
  ExploreDestinationEditorial,
  ExploreDestinationEditorialProvenance,
  ExploreDestinationEditorialSourceReference,
} from "./editorial";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const canonicalDestinationIds = new Set(
  buildCanonicalExploreDestinations(airports).map(({ id }) => id),
);

export function validateExploreDestinationEditorial(
  records: readonly ExploreDestinationEditorial[],
): readonly ExploreDestinationEditorial[] {
  const seen = new Set<string>();
  const errors: string[] = [];

  records.forEach((record, index) => {
    if (seen.has(record.id)) errors.push(`Duplicate Explore editorial destination ID: ${record.id}`);
    seen.add(record.id);
    if (!canonicalDestinationIds.has(record.id)) errors.push(`Unknown Explore editorial destination ID at index ${index}: ${record.id}`);
    if (!record.summary.trim()) errors.push(`Explore editorial ${record.id} has an empty summary`);
    if (!record.description.trim()) errors.push(`Explore editorial ${record.id} has an empty description`);
    if (record.highlights.length < 3 || record.highlights.length > 5) errors.push(`Explore editorial ${record.id} must have 3-5 highlights`);
    const normalizedHighlights = new Set<string>();
    for (const highlight of record.highlights) {
      const normalized = highlight.trim().toLocaleLowerCase();
      if (!normalized) errors.push(`Explore editorial ${record.id} has an empty highlight`);
      if (normalizedHighlights.has(normalized)) errors.push(`Explore editorial ${record.id} has duplicate highlight: ${highlight}`);
      normalizedHighlights.add(normalized);
    }
    const references = record.editorialProvenance.sourceReferences;
    if (!references.length) errors.push(`Explore editorial ${record.id} is missing source references`);
    if (references.length < 2) errors.push(`Explore editorial ${record.id} must have at least two source references`);
    const sourceUrls = new Set<string>();
    const sourceTitles = new Set<string>();
    for (const reference of references) {
      const normalizedTitle = reference.title.trim().toLocaleLowerCase();
      if (!normalizedTitle) errors.push(`Explore editorial ${record.id} has an empty source title`);
      if (sourceTitles.has(normalizedTitle)) errors.push(`Explore editorial ${record.id} has duplicate source title: ${reference.title}`);
      sourceTitles.add(normalizedTitle);
      if (!reference.url.startsWith("https://")) errors.push(`Explore editorial ${record.id} has a non-HTTPS source URL: ${reference.url}`);
      if (sourceUrls.has(reference.url)) errors.push(`Explore editorial ${record.id} has duplicate source URL: ${reference.url}`);
      sourceUrls.add(reference.url);
    }
    const date = record.editorialProvenance.lastVerifiedAt;
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (
      !DATE_PATTERN.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) errors.push(`Explore editorial ${record.id} has an invalid verification date: ${date}`);
    if (record.editorialProvenance.source !== "kurioticket-editorial") errors.push(`Explore editorial ${record.id} has unsupported editorial provenance source`);
  });

  if (errors.length) throw new Error(`Invalid Explore destination editorial data:\n${errors.join("\n")}`);
  return records;
}

export const exploreDestinationEditorial = validateExploreDestinationEditorial(rawExploreDestinationEditorial);

export const exploreDestinationEditorialById = new Map(
  exploreDestinationEditorial.map((record) => [record.id, record]),
);

export function requireExploreDestinationEditorial(id: string): ExploreDestinationEditorial {
  const editorial = exploreDestinationEditorialById.get(id);
  if (!editorial) throw new Error(`Unknown Explore destination editorial ID: ${id}`);
  return editorial;
}
