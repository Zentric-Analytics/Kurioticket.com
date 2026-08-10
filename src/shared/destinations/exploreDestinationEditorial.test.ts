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
  "al-tirana", "ba-sarajevo", "bg-sofia", "hr-zagreb", "gr-thessaloniki",
  "me-podgorica", "mk-skopje", "ro-bucharest", "rs-belgrade", "si-ljubljana",
] as const;

const EUROPE_BATCH_4_IDS = [
  "de-cologne", "de-dusseldorf", "de-hamburg", "de-stuttgart", "lu-luxembourg",
  "es-madrid", "gb-manchester", "it-milan", "fr-nice", "pt-porto",
] as const;

const EUROPE_BATCH_5_IDS = [
  "ua-kyiv", "cy-larnaca", "ru-moscow", "cy-paphos", "ru-st-petersburg",
] as const;

const AFRICA_BATCH_1_IDS = [
  "et-addis-ababa", "ke-mombasa", "tz-dar-es-salaam", "tz-zanzibar", "ug-entebbe",
  "rw-kigali", "mg-antananarivo", "sc-mahe", "mu-mauritius", "re-saint-denis",
] as const;

const AFRICA_BATCH_2_IDS = [
  "dz-algiers", "ma-casablanca", "eg-sharm-el-sheikh", "tn-tunis",
] as const;

const AFRICA_BATCH_3_IDS = [
  "za-durban", "bw-gaborone", "zw-harare", "zm-lusaka", "mz-maputo", "na-windhoek",
] as const;

const AFRICA_BATCH_4_IDS = [
  "ci-abidjan", "gm-banjul", "bj-cotonou", "sn-dakar", "ng-enugu",
  "sl-freetown", "tg-lome", "lr-monrovia", "ng-port-harcourt",
] as const;

const AFRICA_BATCH_5_IDS = [
  "ml-bamako", "ng-kano", "ne-niamey", "bf-ouagadougou", "cg-brazzaville",
  "cm-douala", "cd-kinshasa", "ga-libreville", "ao-luanda", "cm-yaounde",
] as const;

const AFRICA_BATCH_6_IDS = [
  "bi-bujumbura", "dj-djibouti", "so-hargeisa", "ss-juba",
] as const;

const FINAL_AFRICA_BATCH_IDS = ["gn-conakry", "sd-khartoum", "ly-tripoli"] as const;

const ASIA_BATCH_1_IDS = [
  "cn-beijing", "cn-guangzhou", "hk-hong-kong", "mo-macau", "jp-osaka",
  "kr-seoul", "cn-shanghai", "cn-shenzhen", "tw-taipei", "mn-ulaanbaatar",
] as const;

const ASIA_BATCH_2_IDS = [
  "vn-hanoi", "vn-ho-chi-minh-city", "kh-phnom-penh", "kh-siem-reap",
  "th-phuket", "la-vientiane", "mm-yangon",
] as const;

const ASIA_BATCH_3_IDS = [
  "bn-bandar-seri-begawan", "ph-cebu", "tl-dili", "id-jakarta",
  "my-kuala-lumpur", "ph-manila", "my-penang",
] as const;

const ASIA_BATCH_4_IDS = [
  "in-bengaluru", "in-chennai", "lk-colombo", "in-hyderabad",
  "in-kochi", "in-kolkata", "in-mumbai", "in-new-delhi",
] as const;

const ORIGINAL_AFRICAN_EDITORIAL_IDS = [
  "ng-lagos", "za-cape-town", "eg-cairo", "ma-marrakesh", "ng-abuja",
  "gh-accra", "za-johannesburg", "ke-nairobi",
] as const;

const EUROPE_COUNTRY_CODES = new Set([
  "AL", "AT", "BA", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LT", "LU", "LV", "ME", "MK",
  "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "TR", "UA",
]);

const AFRICA_COUNTRY_CODES = new Set([
  "AO", "BF", "BI", "BJ", "BW", "CD", "CG", "CI", "CM", "DJ", "DZ", "EG",
  "ET", "GA", "GH", "GM", "GN", "KE", "LR", "LY", "MA", "MG", "ML", "MU",
  "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SD", "SL", "SN", "SO", "SS",
  "TG", "TN", "TZ", "UG", "ZA", "ZM", "ZW",
]);

const ASIA_COUNTRY_CODES = new Set([
  "AE", "AF", "AM", "AZ", "BD", "BH", "BN", "BT", "CN", "GE", "HK",
  "ID", "IL", "IN", "IQ", "IR", "JO", "JP", "KG", "KH", "KP", "KR",
  "KW", "KZ", "LA", "LB", "LK", "MM", "MN", "MO", "MV", "MY", "NP",
  "OM", "PH", "PK", "PS", "QA", "SA", "SG", "SY", "TH", "TJ", "TL",
  "TM", "TW", "UZ", "VN", "YE",
]);

test("the original 25 records and Europe Batch 1 remain intact as coverage expands", () => {
  assert.equal(validateExploreDestinationEditorial(exploreDestinationEditorial), exploreDestinationEditorial);
  assert.equal(
    new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length,
  );
  assert.deepEqual(exploreDestinationEditorial.slice(0, 25).map(({ id }) => id), ORIGINAL_EDITORIAL_IDS);
  assert.deepEqual(exploreDestinationEditorial.slice(25, 35).map(({ id }) => id), EUROPE_BATCH_1_IDS);
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

test("Europe Batch 3 contains 10 previously non-editorial canonical records", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
  ]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_3_IDS.some((batchId) => batchId === id),
  );
  assert.deepEqual(exploreDestinationEditorial.slice(35, 45).map(({ id }) => id), EUROPE_BATCH_2_IDS);
  assert.deepEqual(exploreDestinationEditorial.slice(45, 55).map(({ id }) => id), EUROPE_BATCH_3_IDS);
  assert.equal(batch.length, 10);
  assert.ok(EUROPE_BATCH_3_IDS.every((id) => !priorIds.has(id)));
  for (const record of batch) {
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
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

test("Europe Batch 4 contains 10 new canonical western European records with reviewed copy", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS, ...EUROPE_BATCH_3_IDS,
  ]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_4_IDS.some((batchId) => batchId === id),
  );
  assert.deepEqual(exploreDestinationEditorial.slice(55, 65).map(({ id }) => id), EUROPE_BATCH_4_IDS);
  assert.equal(batch.length, 10);
  assert.ok(EUROPE_BATCH_4_IDS.every((id) => !priorIds.has(id)));
  for (const record of batch) {
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
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

test("Europe Batch 5 completes the five previously non-editorial canonical records", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
    ...EUROPE_BATCH_3_IDS, ...EUROPE_BATCH_4_IDS,
  ]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    EUROPE_BATCH_5_IDS.some((batchId) => batchId === id),
  );
  assert.deepEqual(exploreDestinationEditorial.slice(65, 70).map(({ id }) => id), EUROPE_BATCH_5_IDS);
  assert.equal(batch.length, 5);
  assert.ok(EUROPE_BATCH_5_IDS.every((id) => !priorIds.has(id)));
  for (const record of batch) {
    const canonical = exploreDestinations.find(({ id }) => id === record.id);
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(canonical);
    assert.ok(EUROPE_COUNTRY_CODES.has(canonical.countryCode));
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.ok(record.summary.endsWith("."));
    assert.equal((record.summary.match(/[!?]/g) ?? []).length, 0);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
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

test("every canonical European destination has editorial content after Batch 5", () => {
  const canonicalEuropeanDestinations = exploreDestinations.filter(({ countryCode }) =>
    EUROPE_COUNTRY_CODES.has(countryCode),
  );
  const editorialIds = new Set(exploreDestinationEditorial.map(({ id }) => id));
  assert.ok(canonicalEuropeanDestinations.length > 0);
  assert.deepEqual(
    canonicalEuropeanDestinations.filter(({ id }) => !editorialIds.has(id)).map(({ id }) => id),
    [],
  );
  assert.ok(canonicalEuropeanDestinations.every(({ editorialProvenance }) => editorialProvenance));
});

test("Africa Batch 1 contains exactly 10 previously non-editorial canonical records", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
    ...EUROPE_BATCH_3_IDS, ...EUROPE_BATCH_4_IDS, ...EUROPE_BATCH_5_IDS,
  ]);
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    AFRICA_BATCH_1_IDS.some((batchId) => batchId === id),
  );

  assert.deepEqual(exploreDestinationEditorial.slice(70, 80).map(({ id }) => id), AFRICA_BATCH_1_IDS);
  assert.equal(batch.length, 10);
  assert.ok(AFRICA_BATCH_1_IDS.every((id) => !priorIds.has(id)));
  assert.deepEqual(
    exploreDestinationEditorial
      .filter(({ id }) => ORIGINAL_AFRICAN_EDITORIAL_IDS.some((originalId) => originalId === id))
      .map(({ id }) => id),
    ORIGINAL_AFRICAN_EDITORIAL_IDS,
  );

  for (const record of batch) {
    const canonical = exploreDestinations.find(({ id }) => id === record.id);
    const summaryWordCount = record.summary.trim().split(/\s+/).length;
    const descriptionWordCount = record.description.trim().split(/\s+/).length;
    assert.ok(canonical);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(summaryWordCount >= 13 && summaryWordCount <= 18);
    assert.ok(record.summary.endsWith("."));
    assert.equal((record.summary.match(/[!?]/g) ?? []).length, 0);
    assert.ok(descriptionWordCount >= 53 && descriptionWordCount <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
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

test("Africa Batch 1 enrichment leaves other non-editorial destinations valid", () => {
  const editorialIds = new Set(exploreDestinationEditorial.map(({ id }) => id));
  const remaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.ok(remaining.length > 0);
  assert.ok(remaining.every(({ summary, description, highlights, editorialProvenance }) =>
    summary === undefined && description === undefined && highlights === undefined &&
    editorialProvenance === undefined));
});

test("Africa Batch 2 adds only the four North African destinations that passed the source gate", () => {
  assert.deepEqual(exploreDestinationEditorial.slice(80, 84).map(({ id }) => id), AFRICA_BATCH_2_IDS);

  for (const id of AFRICA_BATCH_2_IDS) {
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id)!;
    const canonical = exploreDestinations.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.ok(record.highlights.every((highlight) => !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
  }
});

test("Africa Batch 3 adds six previously non-editorial canonical Southern African destinations", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
    ...EUROPE_BATCH_3_IDS, ...EUROPE_BATCH_4_IDS, ...EUROPE_BATCH_5_IDS,
    ...AFRICA_BATCH_1_IDS, ...AFRICA_BATCH_2_IDS,
  ]);
  assert.deepEqual(exploreDestinationEditorial.slice(84, 90).map(({ id }) => id), AFRICA_BATCH_3_IDS);
  assert.ok(AFRICA_BATCH_3_IDS.every((id) => !priorIds.has(id)));

  for (const id of AFRICA_BATCH_3_IDS) {
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id)!;
    const canonical = exploreDestinations.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.equal(canonical.id, id);
    assert.ok(record);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
  }

  assert.deepEqual(
    exploreDestinationEditorial.filter(({ id }) =>
      AFRICA_BATCH_1_IDS.some((batchId) => batchId === id)).map(({ id }) => id),
    AFRICA_BATCH_1_IDS,
  );
  assert.deepEqual(
    exploreDestinationEditorial.filter(({ id }) =>
      AFRICA_BATCH_2_IDS.some((batchId) => batchId === id)).map(({ id }) => id),
    AFRICA_BATCH_2_IDS,
  );
});

test("Africa Batch 4 adds exactly nine previously non-editorial Atlantic West African destinations", () => {
  const priorIds = new Set<string>([
    ...ORIGINAL_EDITORIAL_IDS, ...EUROPE_BATCH_1_IDS, ...EUROPE_BATCH_2_IDS,
    ...EUROPE_BATCH_3_IDS, ...EUROPE_BATCH_4_IDS, ...EUROPE_BATCH_5_IDS,
    ...AFRICA_BATCH_1_IDS, ...AFRICA_BATCH_2_IDS, ...AFRICA_BATCH_3_IDS,
  ]);
  assert.deepEqual(exploreDestinationEditorial.slice(90, 99).map(({ id }) => id), AFRICA_BATCH_4_IDS);
  assert.ok(AFRICA_BATCH_4_IDS.every((id) => !priorIds.has(id)));

  for (const id of AFRICA_BATCH_4_IDS) {
    const canonical = buildExploreDestinations(airports).find((candidate) => candidate.id === id);
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.ok(record);
    assert.equal(enriched.id, canonical.id);
    assert.equal(enriched.name, canonical.name);
    assert.equal(enriched.country, canonical.country);
    assert.equal(enriched.countryCode, canonical.countryCode);
    assert.equal(enriched.primaryAirportCode, canonical.primaryAirportCode);
    assert.deepEqual(enriched.airportCodes, canonical.airportCodes);
    assert.deepEqual(enriched.searchAliases, canonical.searchAliases);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.editorialProvenance, record.editorialProvenance);
  }
});

test("Africa Batch 5 adds 10 canonical inland West and Central African destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(0, 99).map(({ id }) => id));
  assert.deepEqual(exploreDestinationEditorial.slice(99, 109).map(({ id }) => id), AFRICA_BATCH_5_IDS);
  assert.ok(AFRICA_BATCH_5_IDS.every((id) => !priorIds.has(id)));

  for (const id of AFRICA_BATCH_5_IDS) {
    const canonical = buildExploreDestinations(airports).find((candidate) => candidate.id === id);
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.ok(record);
    assert.equal(enriched.id, canonical.id);
    assert.equal(enriched.name, canonical.name);
    assert.equal(enriched.country, canonical.country);
    assert.equal(enriched.countryCode, canonical.countryCode);
    assert.equal(enriched.primaryAirportCode, canonical.primaryAirportCode);
    assert.deepEqual(enriched.airportCodes, canonical.airportCodes);
    assert.deepEqual(enriched.searchAliases, canonical.searchAliases);
    assert.equal(enriched.image, canonical.image);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.editorialProvenance, record.editorialProvenance);
    assert.equal(enriched.relatedDestinationIds, undefined);
  }
});

test("Africa Batch 6 adds four canonical Horn and Great Lakes destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(0, 109).map(({ id }) => id));
  assert.deepEqual(exploreDestinationEditorial.slice(109, 113).map(({ id }) => id), AFRICA_BATCH_6_IDS);
  assert.ok(AFRICA_BATCH_6_IDS.every((id) => !priorIds.has(id)));

  for (const id of AFRICA_BATCH_6_IDS) {
    const canonical = buildExploreDestinations(airports).find((candidate) => candidate.id === id);
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.ok(record);
    assert.equal(enriched.id, canonical.id);
    assert.equal(enriched.name, canonical.name);
    assert.equal(enriched.country, canonical.country);
    assert.equal(enriched.countryCode, canonical.countryCode);
    assert.equal(enriched.primaryAirportCode, canonical.primaryAirportCode);
    assert.deepEqual(enriched.airportCodes, canonical.airportCodes);
    assert.deepEqual(enriched.searchAliases, canonical.searchAliases);
    assert.equal(enriched.image, canonical.image);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.editorialProvenance, record.editorialProvenance);
    assert.equal(enriched.relatedDestinationIds, undefined);
  }
});

test("the final Africa batch enriches exactly the three previously deferred canonical destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(0, 113).map(({ id }) => id));
  assert.deepEqual(exploreDestinationEditorial.slice(113, 116).map(({ id }) => id), FINAL_AFRICA_BATCH_IDS);
  assert.ok(FINAL_AFRICA_BATCH_IDS.every((id) => !priorIds.has(id)));

  for (const id of FINAL_AFRICA_BATCH_IDS) {
    const canonical = buildExploreDestinations(airports).find((candidate) => candidate.id === id);
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const record = exploreDestinationEditorial.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.ok(record);
    assert.equal(enriched.id, canonical.id);
    assert.equal(enriched.name, canonical.name);
    assert.equal(enriched.country, canonical.country);
    assert.equal(enriched.countryCode, canonical.countryCode);
    assert.equal(enriched.primaryAirportCode, canonical.primaryAirportCode);
    assert.deepEqual(enriched.airportCodes, canonical.airportCodes);
    assert.deepEqual(enriched.searchAliases, canonical.searchAliases);
    assert.equal(enriched.image, canonical.image);
    assert.ok(record.summary.startsWith(canonical.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim().length > 0 && url.startsWith("https://"),
    ));
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.editorialProvenance, record.editorialProvenance);
    assert.equal(enriched.relatedDestinationIds, undefined);
  }
});

test("Tripoli remains canonically disambiguated as Tripoli, Libya", () => {
  const tripoli = exploreDestinations.find(({ id }) => id === "ly-tripoli");
  const record = exploreDestinationEditorial.find(({ id }) => id === "ly-tripoli");
  assert.ok(tripoli);
  assert.ok(record);
  assert.equal(tripoli.name, "Tripoli");
  assert.equal(tripoli.country, "Libya");
  assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
    !/lebanon|\/countries\/lb(?:\/|$)/i.test(`${title} ${url}`)));
});

test("every canonical African destination has editorial content after the final batch", () => {
  const canonicalAfricanDestinations = exploreDestinations.filter(({ countryCode }) =>
    AFRICA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial.map(({ id }) => id));
  const editorialized = canonicalAfricanDestinations.filter(({ id }) => editorialIds.has(id));
  const remaining = canonicalAfricanDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonicalAfricanDestinations.length, 54);
  assert.equal(editorialized.length, 54);
  assert.deepEqual(remaining, []);
  assert.ok(canonicalAfricanDestinations.every(({ editorialProvenance }) => editorialProvenance));
});

test("Asia Batch 1 adds 10 previously non-editorial canonical destinations with reviewed copy", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_1_IDS.length + ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const batch = exploreDestinationEditorial.filter(({ id }) =>
    ASIA_BATCH_1_IDS.some((batchId) => batchId === id));
  assert.deepEqual(exploreDestinationEditorial.slice(-32, -22).map(({ id }) => id), ASIA_BATCH_1_IDS);
  assert.equal(batch.length, 10);
  assert.ok(ASIA_BATCH_1_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length);

  for (const id of ASIA_BATCH_1_IDS) {
    const canonical = exploreDestinations.find((destination) => destination.id === id);
    const record = batch.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(record);
    assert.equal(record.summary.startsWith(canonical.name), true);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) =>
      highlight.trim().toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
    assert.equal(canonical.editorialProvenance, record.editorialProvenance);
    assert.equal(canonical.relatedDestinationIds, undefined);
  }
});

test("Asia Batch 1 preserves destination-label and airport identity safeguards", () => {
  const destination = (id: (typeof ASIA_BATCH_1_IDS)[number]) => {
    const match = exploreDestinations.find((candidate) => candidate.id === id);
    assert.ok(match);
    return match;
  };
  assert.equal(destination("hk-hong-kong").country, "Hong Kong SAR China");
  assert.equal(destination("mo-macau").name, "Macau");
  assert.equal(destination("mo-macau").country, "Macao SAR China");
  assert.equal(destination("tw-taipei").country, "Taiwan");
  assert.deepEqual(destination("cn-beijing").airportCodes, ["PEK", "PKX"]);
  assert.equal(destination("cn-beijing").primaryAirportCode, "PEK");
  assert.deepEqual(destination("kr-seoul").airportCodes, ["GMP", "ICN"]);
  assert.equal(destination("kr-seoul").primaryAirportCode, "GMP");
  assert.deepEqual({
    name: destination("jp-osaka").name,
    country: destination("jp-osaka").country,
    airportCodes: destination("jp-osaka").airportCodes,
    searchAliases: destination("jp-osaka").searchAliases,
    imageDestinationId: destination("jp-osaka").imageDestinationId,
  }, {
    name: "Osaka", country: "Japan", airportCodes: ["KIX"],
    searchAliases: ["Osaka"], imageDestinationId: "jp-osaka",
  });
});

test("Asia coverage before Batch 2 is derived as 15 of 64 after Batch 1", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const priorEditorialIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  ).map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => priorEditorialIds.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !priorEditorialIds.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(after.length, 15);
  assert.equal(remaining.length, 49);
  assert.ok(remaining.every(({ id }) => !ASIA_BATCH_1_IDS.some((batchId) => batchId === id)));
});

test("Asia Batch 2 adds seven previously non-editorial canonical destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const batch = exploreDestinationEditorial.slice(
    -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
    -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_2_IDS);
  assert.ok(ASIA_BATCH_2_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length);

  for (const id of ASIA_BATCH_2_IDS) {
    const canonical = exploreDestinations.find((destination) => destination.id === id);
    const record = batch.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(record);
    assert.equal(record.summary.startsWith(canonical.name), true);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) =>
      highlight.trim().toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
    assert.equal(canonical.editorialProvenance, record.editorialProvenance);
    assert.equal(canonical.relatedDestinationIds, undefined);
  }
});

test("Asia Batch 2 preserves canonical scope, airport and image identity", () => {
  const destination = (id: (typeof ASIA_BATCH_2_IDS)[number]) => {
    const match = exploreDestinations.find((candidate) => candidate.id === id);
    assert.ok(match);
    return match;
  };
  assert.equal(destination("vn-ho-chi-minh-city").name, "Ho Chi Minh City");
  assert.equal(destination("mm-yangon").country, "Myanmar (Burma)");
  assert.deepEqual({
    name: destination("th-phuket").name,
    country: destination("th-phuket").country,
    airportCodes: destination("th-phuket").airportCodes,
    searchAliases: destination("th-phuket").searchAliases,
    imageDestinationId: destination("th-phuket").imageDestinationId,
  }, {
    name: "Phuket", country: "Thailand", airportCodes: ["HKT"],
    searchAliases: ["Phuket"], imageDestinationId: "th-phuket",
  });
  assert.deepEqual(destination("kh-siem-reap").airportCodes, ["REP"]);
  assert.equal(destination("kh-siem-reap").primaryAirportCode, "REP");
  assert.deepEqual(destination("kh-phnom-penh").airportCodes, ["PNH"]);
  assert.equal(destination("kh-phnom-penh").primaryAirportCode, "PNH");
  assert.deepEqual({
    name: destination("la-vientiane").name,
    country: destination("la-vientiane").country,
    countryCode: destination("la-vientiane").countryCode,
    searchAliases: destination("la-vientiane").searchAliases,
    imageDestinationId: destination("la-vientiane").imageDestinationId,
  }, {
    name: "Vientiane", country: "Laos", countryCode: "LA",
    searchAliases: ["Vientiane"], imageDestinationId: "la-vientiane",
  });
});

test("Asia coverage is derived as 22 of 64 after Batch 2 with 42 remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const beforeIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const afterBatch2Ids = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => afterBatch2Ids.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !afterBatch2Ids.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(before.length, 15);
  assert.equal(after.length, 22);
  assert.equal(remaining.length, 42);
  assert.ok(ASIA_BATCH_2_IDS.every((id) => after.some((destination) => destination.id === id)));
});

test("Asia Batch 3 adds seven previously non-editorial canonical destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const batch = exploreDestinationEditorial.slice(
    -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length), -ASIA_BATCH_4_IDS.length,
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_3_IDS);
  assert.ok(ASIA_BATCH_3_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length);

  for (const id of ASIA_BATCH_3_IDS) {
    const canonical = exploreDestinations.find((destination) => destination.id === id);
    const record = batch.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(record);
    assert.equal(record.summary.startsWith(canonical.name), true);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) =>
      highlight.trim().toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
    assert.equal(canonical.editorialProvenance, record.editorialProvenance);
    assert.equal(canonical.relatedDestinationIds, undefined);
  }
});

test("Asia Batch 3 preserves canonical scope, airports, aliases and image identity", () => {
  const canonicalById = new Map(buildExploreDestinations(airports)
    .filter(({ id }) => ASIA_BATCH_3_IDS.some((batchId) => batchId === id))
    .map((destination) => [destination.id, destination]));
  const destination = (id: (typeof ASIA_BATCH_3_IDS)[number]) => {
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const canonical = canonicalById.get(id);
    assert.ok(enriched);
    assert.ok(canonical);
    assert.deepEqual({
      id: enriched.id, name: enriched.name, country: enriched.country,
      countryCode: enriched.countryCode, primaryAirportCode: enriched.primaryAirportCode,
      airportCodes: enriched.airportCodes, airportNames: enriched.airportNames,
      searchAliases: enriched.searchAliases, imageDestinationId: enriched.imageDestinationId,
      provenance: enriched.provenance,
    }, {
      id: canonical.id, name: canonical.name, country: canonical.country,
      countryCode: canonical.countryCode, primaryAirportCode: canonical.primaryAirportCode,
      airportCodes: canonical.airportCodes, airportNames: canonical.airportNames,
      searchAliases: canonical.searchAliases, imageDestinationId: canonical.imageDestinationId,
      provenance: canonical.provenance,
    });
    return enriched;
  };
  assert.equal(destination("bn-bandar-seri-begawan").name, "Bandar Seri Begawan");
  assert.equal(destination("ph-cebu").name, "Cebu");
  assert.deepEqual(destination("ph-cebu").airportCodes, ["CEB"]);
  assert.deepEqual(destination("id-jakarta").airportCodes, ["CGK"]);
  assert.deepEqual(destination("my-kuala-lumpur").airportCodes, ["KUL"]);
  assert.equal(destination("ph-manila").name, "Manila");
  assert.equal(destination("my-penang").name, "Penang");
  assert.equal(destination("my-penang").country, "Malaysia");
});

test("Asia coverage is derived as 29 of 64 after Batch 3 with 35 remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const beforeIds = new Set(exploreDestinationEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length),
  )
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const afterBatch3Ids = new Set(exploreDestinationEditorial.slice(0, -ASIA_BATCH_4_IDS.length)
    .map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => afterBatch3Ids.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !afterBatch3Ids.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(before.length, 22);
  assert.equal(after.length, 29);
  assert.equal(remaining.length, 35);
  assert.ok(ASIA_BATCH_3_IDS.every((id) => after.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ id }) => !afterBatch3Ids.has(id)));
});

test("Asia Batch 4 adds eight previously non-editorial canonical destinations", () => {
  const priorIds = new Set(exploreDestinationEditorial.slice(0, -ASIA_BATCH_4_IDS.length)
    .map(({ id }) => id));
  const batch = exploreDestinationEditorial.slice(-ASIA_BATCH_4_IDS.length);
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_4_IDS);
  assert.ok(ASIA_BATCH_4_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(exploreDestinationEditorial.map(({ id }) => id)).size,
    exploreDestinationEditorial.length);

  for (const id of ASIA_BATCH_4_IDS) {
    const canonical = exploreDestinations.find((destination) => destination.id === id);
    const record = batch.find((candidate) => candidate.id === id);
    assert.ok(canonical);
    assert.ok(record);
    assert.equal(record.summary.startsWith(canonical.name), true);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) =>
      highlight.trim().toLocaleLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !highlight.endsWith(".")));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(
      ({ title, url }) => title.trim() && url.startsWith("https://"),
    ));
    assert.equal(canonical.editorialProvenance, record.editorialProvenance);
    assert.equal(canonical.relatedDestinationIds, undefined);
  }
});

test("Asia Batch 4 preserves canonical names, scope, airports, aliases and image identity", () => {
  const canonicalById = new Map(buildExploreDestinations(airports)
    .filter(({ id }) => ASIA_BATCH_4_IDS.some((batchId) => batchId === id))
    .map((destination) => [destination.id, destination]));
  const destination = (id: (typeof ASIA_BATCH_4_IDS)[number]) => {
    const enriched = exploreDestinations.find((candidate) => candidate.id === id);
    const canonical = canonicalById.get(id);
    assert.ok(enriched);
    assert.ok(canonical);
    assert.deepEqual({
      id: enriched.id, name: enriched.name, country: enriched.country,
      countryCode: enriched.countryCode, primaryAirportCode: enriched.primaryAirportCode,
      airportCodes: enriched.airportCodes, airportNames: enriched.airportNames,
      searchAliases: enriched.searchAliases, imageDestinationId: enriched.imageDestinationId,
      provenance: enriched.provenance,
    }, {
      id: canonical.id, name: canonical.name, country: canonical.country,
      countryCode: canonical.countryCode, primaryAirportCode: canonical.primaryAirportCode,
      airportCodes: canonical.airportCodes, airportNames: canonical.airportNames,
      searchAliases: canonical.searchAliases, imageDestinationId: canonical.imageDestinationId,
      provenance: canonical.provenance,
    });
    return enriched;
  };
  assert.equal(destination("in-bengaluru").name, "Bengaluru");
  assert.equal(destination("in-chennai").name, "Chennai");
  assert.equal(destination("lk-colombo").country, "Sri Lanka");
  assert.deepEqual(destination("lk-colombo").airportCodes, ["CMB"]);
  assert.equal(destination("in-hyderabad").country, "India");
  assert.equal(destination("in-kochi").name, "Kochi");
  assert.equal(destination("in-kolkata").name, "Kolkata");
  assert.equal(destination("in-mumbai").name, "Mumbai");
  assert.deepEqual(destination("in-mumbai").airportCodes, ["BOM"]);
  assert.equal(destination("in-new-delhi").name, "New Delhi");
  assert.notEqual(destination("in-new-delhi").name, "Delhi");
});

test("Asia coverage is derived as 37 of 64 after Batch 4 with 27 remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const beforeIds = new Set(exploreDestinationEditorial.slice(0, -ASIA_BATCH_4_IDS.length)
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const after = canonicalAsianDestinations.filter(({ editorialProvenance }) => editorialProvenance);
  const remaining = canonicalAsianDestinations.filter(({ editorialProvenance }) =>
    !editorialProvenance);
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(before.length, 29);
  assert.equal(after.length, 37);
  assert.equal(remaining.length, 27);
  assert.ok(ASIA_BATCH_4_IDS.every((id) => after.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ summary, description, highlights, editorialProvenance }) =>
    summary === undefined && description === undefined && highlights === undefined &&
    editorialProvenance === undefined));
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
