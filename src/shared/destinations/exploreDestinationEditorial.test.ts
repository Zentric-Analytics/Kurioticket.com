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
  ({ id }) => !CURATED_POPULAR_EXPLORE_DESTINATION_IDS.some((featuredId) => featuredId === id),
)!;
const nonFeaturedEditorialFixture: ExploreDestinationEditorial = {
  ...clone(exploreDestinationEditorial[0]!),
  id: nonFeaturedDestination.id,
};

test("existing 25 Explore editorial records validate without defining editorial scope", () => {
  assert.equal(exploreDestinationEditorial.length, 25);
  assert.equal(validateExploreDestinationEditorial(exploreDestinationEditorial), exploreDestinationEditorial);
  assert.equal(new Set(exploreDestinationEditorial.map(({ id }) => id)).size, 25);
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
