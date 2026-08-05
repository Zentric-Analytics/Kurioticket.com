import assert from "node:assert/strict";
import test from "node:test";
import { airports } from "../airports";
import {
  buildExploreDestinations,
  exploreDestinationByAlias,
  exploreDestinations,
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
    sourceReferences: [...record.editorialProvenance.sourceReferences],
  },
});

test("Explore editorial dataset exactly covers the curated popular destinations in maintained order", () => {
  assert.equal(exploreDestinationEditorial.length, 25);
  assert.deepEqual(exploreDestinationEditorial.map((record) => record.id), CURATED_POPULAR_EXPLORE_DESTINATION_IDS);
  assert.equal(new Set(exploreDestinationEditorial.map((record) => record.id)).size, CURATED_POPULAR_EXPLORE_DESTINATION_IDS.length);
});

test("Explore editorial records carry reusable content and strict HTTPS provenance", () => {
  for (const record of exploreDestinationEditorial) {
    assert.ok(record.summary.trim());
    assert.ok(record.description.trim());
    assert.ok(record.highlights.length >= 3 && record.highlights.length <= 5);
    assert.equal(new Set(record.highlights.map((value) => value.trim().toLocaleLowerCase())).size, record.highlights.length);
    assert.ok(record.highlights.every((value) => value.trim()));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.match(record.editorialProvenance.lastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(`${record.editorialProvenance.lastVerifiedAt}T00:00:00.000Z`)));
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size, record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) => title.trim() && url.startsWith("https://")));
  }
});

test("Explore editorial validation rejects duplicate, missing, unknown and non-HTTPS records", () => {
  const records = exploreDestinationEditorial.map(clone);
  assert.throws(() => validateExploreDestinationEditorial([...records, clone(records[0]!)]), /Duplicate Explore editorial destination ID: fr-paris/);
  assert.throws(() => validateExploreDestinationEditorial(records.slice(1)), /Missing Explore editorial destination ID: fr-paris/);
  assert.throws(
    () => validateExploreDestinationEditorial([{ ...clone(records[0]!), id: "xx-atlantis" as ExploreDestinationEditorial["id"] }, ...records.slice(1)]),
    /Unknown or non-curated Explore editorial destination ID/,
  );
  assert.throws(
    () => validateExploreDestinationEditorial([{ ...clone(records[0]!), editorialProvenance: { ...records[0]!.editorialProvenance, sourceReferences: [{ title: "Bad", url: "http://example.com" as `https://${string}` }, records[0]!.editorialProvenance.sourceReferences[1]!] } }, ...records.slice(1)]),
    /non-HTTPS source URL/,
  );
  assert.throws(
    () => validateExploreDestinationEditorial([{ ...clone(records[0]!), editorialProvenance: { ...records[0]!.editorialProvenance, lastVerifiedAt: "2026-02-31" } }, ...records.slice(1)]),
    /invalid verification date/,
  );
});

test("shared Explore model attaches editorial fields only to curated destinations", () => {
  const curated = CURATED_POPULAR_EXPLORE_DESTINATION_IDS.map((id) => exploreDestinations.find((destination) => destination.id === id)!);
  for (const destination of curated) {
    assert.ok(destination.summary);
    assert.ok(destination.description);
    assert.ok(destination.highlights?.length);
    assert.ok(destination.editorialProvenance?.sourceReferences.length);
    assert.equal(destination.relatedDestinationIds, undefined);
  }
  const nonCurated = exploreDestinations.find((destination) => !CURATED_POPULAR_EXPLORE_DESTINATION_IDS.includes(destination.id as (typeof CURATED_POPULAR_EXPLORE_DESTINATION_IDS)[number]))!;
  assert.equal(nonCurated.summary, undefined);
  assert.equal(nonCurated.description, undefined);
  assert.equal(nonCurated.highlights, undefined);
  assert.equal(nonCurated.editorialProvenance, undefined);
  assert.equal(nonCurated.relatedDestinationIds, undefined);
});

test("editorial enrichment preserves airport facts, popular order and search behavior", () => {
  const uneditorialized = buildExploreDestinations(airports).map(({ summary, description, highlights, editorialProvenance, ...facts }) => facts);
  const currentFacts = exploreDestinations.map(({ summary, description, highlights, editorialProvenance, ...facts }) => facts);
  assert.deepEqual(currentFacts, uneditorialized);
  assert.deepEqual(CURATED_POPULAR_EXPLORE_DESTINATION_IDS, [
    "fr-paris", "gb-london", "us-new-york", "id-bali", "ng-lagos",
    "ae-dubai", "jp-tokyo", "za-cape-town", "it-rome", "tr-istanbul",
    "th-bangkok", "es-barcelona", "eg-cairo", "ma-marrakesh", "sg-singapore",
    "nl-amsterdam", "ca-toronto", "us-los-angeles", "ng-abuja", "gh-accra",
    "za-johannesburg", "ke-nairobi", "pt-lisbon", "au-sydney", "br-rio-de-janeiro",
  ]);
  assert.equal(exploreDestinationByAlias("London")?.id, "gb-london");
  assert.equal(exploreDestinationByAlias("Ngurah Rai")?.id, "id-bali");
});
