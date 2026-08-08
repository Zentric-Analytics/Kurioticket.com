import assert from "node:assert/strict";
import test from "node:test";
import { airports } from "../airports";
import {
  buildExploreDestinations,
  exploreDestinationByAlias,
  exploreDestinations,
  popularExploreDestinations,
} from "./exploreDestinationContent";
import {
  exploreDestinationEditorial,
  validateExploreDestinationEditorial,
  type ExploreDestinationEditorial,
} from "./exploreDestinationEditorial";
import { CURATED_POPULAR_EXPLORE_DESTINATION_IDS } from "./exploreDestinationPopularIds";

const clone = (record: ExploreDestinationEditorial): ExploreDestinationEditorial => ({
  ...record,
  highlights: [...record.highlights],
  editorialProvenance: {
    ...record.editorialProvenance,
    sourceReferences: record.editorialProvenance.sourceReferences.map((reference) => ({ ...reference })),
  },
});

const nonFeaturedDestination = exploreDestinations.find(
  ({ id, editorialProvenance }) =>
    !editorialProvenance &&
    !CURATED_POPULAR_EXPLORE_DESTINATION_IDS.some((featuredId) => featuredId === id),
)!;
const nonFeaturedEditorialFixture: ExploreDestinationEditorial = {
  ...clone(exploreDestinationEditorial[0]!),
  id: nonFeaturedDestination.id,
};

const ORIGINAL_EDITORIAL_IDS = [
  "fr-paris", "gb-london", "us-new-york", "id-bali", "ng-lagos",
  "ae-dubai", "jp-tokyo", "za-cape-town", "it-rome", "tr-istanbul",
  "th-bangkok", "es-barcelona", "eg-cairo", "ma-marrakesh", "sg-singapore",
  "nl-amsterdam", "ca-toronto", "us-los-angeles", "ng-abuja", "gh-accra",
  "za-johannesburg", "ke-nairobi", "pt-lisbon", "au-sydney", "br-rio-de-janeiro",
] as const;

const EUROPE_BATCH_1_IDS = [
  "dk-copenhagen", "ee-tallinn", "fi-helsinki", "is-reykjavik", "lv-riga",
  "lt-vilnius", "no-oslo", "pl-warsaw", "se-stockholm", "de-berlin",
] as const;

const EUROPE_BATCH_2_IDS = [
  "at-vienna", "cz-prague", "hu-budapest", "be-brussels", "ch-zurich",
  "ch-geneva", "de-munich", "de-frankfurt", "gr-athens", "ie-dublin",
] as const;

const EUROPE_BATCH_3_IDS = [
  "al-tirana", "ba-sarajevo", "bg-sofia", "gr-thessaloniki", "hr-zagreb",
  "me-podgorica", "mk-skopje", "ro-bucharest", "rs-belgrade", "si-ljubljana",
] as const;

test("the original 25 records and prior Europe batches remain intact as coverage expands", () => {
  assert.equal(validateExploreDestinationEditorial(exploreDestinationEditorial), exploreDestinationEditorial);
  assert.equal(
    new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length,
  );
  assert.deepEqual(exploreDestinationEditorial.slice(0, 25).map(({ id }) => id), ORIGINAL_EDITORIAL_IDS);
  assert.deepEqual(exploreDestinationEditorial.slice(25, 35).map(({ id }) => id), EUROPE_BATCH_1_IDS);
  assert.deepEqual(exploreDestinationEditorial.slice(35, 45).map(({ id }) => id), EUROPE_BATCH_2_IDS);
});

test("Europe Batch 3 contains 10 new canonical records with reviewed copy and provenance", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
  ]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_3_IDS.some((batchId) => batchId === id),
  );
  assert.deepEqual(batch.map(({ id }) => id), EUROPE_BATCH_3_IDS);
  assert.ok(EUROPE_BATCH_3_IDS.every((id) => !priorIds.has(id)));
  for (const record of batch) {
    const canonical = exploreDestinations.find(({ id }) => id === record.id);
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(canonical);
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-08");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(
      new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length,
    );
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
  }
});

test("Europe Batch 1 records meet content and provenance requirements", () => {
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_1_IDS.some((batchId) => batchId === id),
  );
  assert.equal(batch.length, 10);
  for (const record of batch) {
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(record.summary.trim());
    assert.ok(record.description.trim());
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-08");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(
      new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length,
    );
    assert.ok(record.editorialProvenance.sourceReferences.every(({ url }) => url.startsWith("https://")));
    assert.ok(exploreDestinations.some(({ id }) => id === record.id));
  }
});

test("Europe Batch 2 contains 10 new canonical records with reviewed provenance", () => {
  const priorIds = new Set<string>([...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_2_IDS.some((batchId) => batchId === id),
  );
  assert.equal(batch.length, 10);
  assert.ok(EUROPE_BATCH_2_IDS.every((id) => !priorIds.has(id)));
  for (const record of batch) {
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(record.summary.trim());
    assert.ok(record.description.trim());
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-08");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(
      new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length,
    );
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
    assert.ok(exploreDestinations.some(({ id }) => id === record.id));
  }
});

test("Featured destinations retain their separately maintained IDs and order", () => {
  assert.deepEqual(CURATED_POPULAR_EXPLORE_DESTINATION_IDS, [
    "fr-paris", "gb-london", "us-new-york", "id-bali", "ng-lagos",
    "ae-dubai", "jp-tokyo", "za-cape-town", "it-rome", "tr-istanbul",
    "th-bangkok", "es-barcelona", "eg-cairo", "ma-marrakesh", "sg-singapore",
    "nl-amsterdam", "ca-toronto", "us-los-angeles", "ng-abuja", "gh-accra",
    "za-johannesburg", "ke-nairobi", "pt-lisbon", "au-sydney", "br-rio-de-janeiro",
  ]);
  assert.deepEqual(popularExploreDestinations.map(({ id }) => id), CURATED_POPULAR_EXPLORE_DESTINATION_IDS);
});

test("valid non-Featured canonical editorial records are accepted only as test fixtures", () => {
  assert.ok(nonFeaturedDestination);
  assert.doesNotThrow(() => validateExploreDestinationEditorial([nonFeaturedEditorialFixture]));
  assert.equal(exploreDestinationEditorial.some(({ id }) => id === nonFeaturedEditorialFixture.id), false);
});

test("editorial validation accepts incremental record counts and Featured-independent ordering", () => {
  assert.doesNotThrow(() => validateExploreDestinationEditorial([clone(exploreDestinationEditorial[0]!) ]));
  assert.doesNotThrow(() => validateExploreDestinationEditorial([...exploreDestinationEditorial].reverse()));
  const featuredOrder = [...CURATED_POPULAR_EXPLORE_DESTINATION_IDS];
  validateExploreDestinationEditorial([nonFeaturedEditorialFixture]);
  validateExploreDestinationEditorial(exploreDestinationEditorial.slice(1));
  assert.deepEqual(CURATED_POPULAR_EXPLORE_DESTINATION_IDS, featuredOrder);
});

test("editorial validation rejects duplicate and unknown canonical IDs", () => {
  const first = clone(exploreDestinationEditorial[0]!);
  assert.throws(
    () => validateExploreDestinationEditorial([first, clone(first)]),
    /Duplicate Explore editorial destination ID: fr-paris/,
  );
  assert.throws(
    () => validateExploreDestinationEditorial([{ ...first, id: "xx-atlantis" }]),
    /Unknown Explore editorial destination ID/,
  );
});

test("editorial validation preserves copy, highlight and provenance requirements", () => {
  const first = clone(exploreDestinationEditorial[0]!);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, summary: " " }]), /empty summary/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, description: " " }]), /empty description/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, highlights: ["one", "two"] }]), /3-5 highlights/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, highlights: ["One", " one ", "three"] }]), /duplicate highlight/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, highlights: ["one", " ", "three"] }]), /empty highlight/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, editorialProvenance: { ...first.editorialProvenance, source: "unsupported" as "kurioticket-editorial" } }]), /unsupported editorial provenance source/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, editorialProvenance: { ...first.editorialProvenance, sourceReferences: first.editorialProvenance.sourceReferences.slice(0, 1) } }]), /at least two source references/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, editorialProvenance: { ...first.editorialProvenance, sourceReferences: [first.editorialProvenance.sourceReferences[0]!, { ...first.editorialProvenance.sourceReferences[1]!, title: first.editorialProvenance.sourceReferences[0]!.title.toUpperCase() }] } }]), /duplicate source title/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, editorialProvenance: { ...first.editorialProvenance, sourceReferences: [{ title: "Bad", url: "http:\/\/example.com" as `https://${string}` }, first.editorialProvenance.sourceReferences[1]!] } }]), /non-HTTPS source URL/);
  assert.throws(() => validateExploreDestinationEditorial([{ ...first, editorialProvenance: { ...first.editorialProvenance, lastVerifiedAt: "2026-02-31" } }]), /invalid verification date/);
});

test("missing editorial remains valid and related destination IDs remain optional", () => {
  assert.equal(nonFeaturedDestination.summary, undefined);
  assert.equal(nonFeaturedDestination.description, undefined);
  assert.equal(nonFeaturedDestination.highlights, undefined);
  assert.equal(nonFeaturedDestination.editorialProvenance, undefined);
  assert.equal(nonFeaturedDestination.relatedDestinationIds, undefined);
});

test("editorial enrichment preserves canonical names, countries, airports, aliases and search", () => {
  const canonicalFacts = ({
    id, name, country, countryCode, primaryAirportCode, airportCodes, airportNames,
    searchAliases, imageDestinationId, provenance,
  }: (typeof exploreDestinations)[number]) => ({
    id, name, country, countryCode, primaryAirportCode, airportCodes, airportNames,
    searchAliases, imageDestinationId, provenance,
  });
  const canonical = buildExploreDestinations(airports).map(canonicalFacts);
  const enriched = exploreDestinations.map(canonicalFacts);
  assert.deepEqual(enriched, canonical);
  assert.equal(exploreDestinationByAlias("London")?.id, "gb-london");
  assert.equal(exploreDestinationByAlias("Ngurah Rai")?.id, "id-bali");
  for (const destination of popularExploreDestinations) {
    assert.ok(destination.summary && destination.description && destination.highlights?.length);
  }
});
