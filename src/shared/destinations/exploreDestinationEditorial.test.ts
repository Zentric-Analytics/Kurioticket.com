import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import { buildCanonicalExploreDestinations } from "./exploreDestinationCatalogue";
import { africaExploreDestinationEditorial } from "./editorial/africa";
import { asiaExploreDestinationEditorial } from "./editorial/asia";
import { centralAmericaExploreDestinationEditorial } from "./editorial/centralAmerica";
import { caribbeanExploreDestinationEditorial } from "./editorial/caribbean";
import { europeExploreDestinationEditorial } from "./editorial/europe";
import { legacyExploreDestinationEditorial } from "./editorial/legacy";
import { northAmericaExploreDestinationEditorial } from "./editorial/northAmerica";
import { oceaniaExploreDestinationEditorial } from "./editorial/oceania";
import { southAmericaExploreDestinationEditorial } from "./editorial/southAmerica";

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

const ASIA_BATCH_5_IDS = [
  "bd-dhaka", "pk-islamabad", "pk-karachi", "np-kathmandu",
  "pk-lahore", "mv-male", "bt-paro", "ir-tehran",
] as const;

const ASIA_BATCH_6_IDS = [
  "kz-almaty", "az-baku", "kg-bishkek", "tj-dushanbe",
  "uz-tashkent", "ge-tbilisi", "am-yerevan",
] as const;

const ASIA_BATCH_7_IDS = [
  "ae-abu-dhabi", "jo-amman", "qa-doha", "sa-jeddah", "kw-kuwait-city",
  "bh-manama", "om-muscat", "sa-riyadh",
] as const;

const ASIA_FINAL_BATCH_IDS = [
  "tm-ashgabat", "iq-baghdad", "lb-beirut", "il-tel-aviv",
] as const;

const ASIA_BATCH_6_DEFERRED_IDS = ["tm-ashgabat"] as const;

const NORTH_AMERICA_BATCH_1_IDS = [
  "us-atlanta", "us-chicago", "us-dallas-fort-worth", "us-denver",
  "us-san-francisco", "us-miami", "us-seattle", "us-houston",
] as const;

const NORTH_AMERICA_BATCH_2_IDS = [
  "ca-vancouver", "ca-montreal", "mx-mexico-city", "mx-cancun", "mx-guadalajara",
] as const;

const NORTH_AMERICA_COUNTRY_CODES = new Set(["CA", "MX", "US"]);

const CENTRAL_AMERICA_BATCH_1_IDS = [
  "gt-guatemala-city", "sv-san-salvador", "ni-managua", "cr-san-jose",
  "pa-panama-city",
] as const;

const CENTRAL_AMERICA_BATCH_1_DEFERRED_IDS = ["hn-san-pedro-sula"] as const;
const CENTRAL_AMERICA_COUNTRY_CODES = new Set(["CR", "GT", "HN", "NI", "PA", "SV"]);

export const CARIBBEAN_BATCH_1_IDS = [
  "cu-havana", "do-santo-domingo", "do-punta-cana", "jm-kingston", "jm-montego-bay",
  "tt-port-of-spain", "bb-bridgetown", "bs-nassau", "ag-st-john-s", "aw-oranjestad",
] as const;

const CARIBBEAN_COUNTRY_CODES = new Set(["AG", "AW", "BB", "BS", "CU", "DO", "JM", "TT"]);

export const SOUTH_AMERICA_BATCH_1_IDS = [
  "co-bogota", "co-medellin", "ec-quito", "ec-guayaquil", "pe-lima", "bo-la-paz",
  "bo-santa-cruz",
] as const;

export const SOUTH_AMERICA_BATCH_2_IDS = [
  "cl-santiago", "ar-buenos-aires", "uy-montevideo", "py-asuncion",
  "br-sao-paulo", "br-brasilia", "br-manaus",
] as const;

const SOUTH_AMERICA_BATCH_IDS = [
  ...SOUTH_AMERICA_BATCH_1_IDS, ...SOUTH_AMERICA_BATCH_2_IDS,
] as const;

const SOUTH_AMERICA_COUNTRY_CODES = new Set([
  "AR", "BO", "BR", "CL", "CO", "EC", "GY", "PE", "PY", "SR", "UY", "VE",
]);

export const OCEANIA_BATCH_1_IDS = [
  "au-melbourne", "au-brisbane", "au-perth", "au-adelaide", "nz-auckland",
  "nz-wellington", "nz-christchurch",
] as const;

const OCEANIA_COUNTRY_CODES = new Set([
  "AU", "CK", "FJ", "GU", "MP", "NZ", "PF", "PG", "SB", "TO", "VU", "WS",
]);

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

const preNorthAmericaEditorial = exploreDestinationEditorial.slice(0, 175);

test("Asia Batch 1 adds 10 previously non-editorial canonical destinations with reviewed copy", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_1_IDS.length + ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  )
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.filter(({ id }) =>
    ASIA_BATCH_1_IDS.some((batchId) => batchId === id));
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_1_IDS);
  assert.equal(batch.length, 10);
  assert.ok(ASIA_BATCH_1_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

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
  const priorEditorialIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  ).map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => priorEditorialIds.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !priorEditorialIds.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(after.length, 15);
  assert.equal(remaining.length, 49);
  assert.ok(remaining.every(({ id }) => !ASIA_BATCH_1_IDS.some((batchId) => batchId === id)));
});

test("Asia Batch 2 adds seven previously non-editorial canonical destinations", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  )
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(
    -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
    -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_2_IDS);
  assert.ok(ASIA_BATCH_2_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

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
  const beforeIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_2_IDS.length + ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  )
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const afterBatch2Ids = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
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
  const priorIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  )
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(
    -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))), -(ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_3_IDS);
  assert.ok(ASIA_BATCH_3_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

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
  const beforeIds = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_3_IDS.length + ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))),
  )
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const afterBatch3Ids = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))))
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
  const priorIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))))
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(
    -(ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))), -(ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)),
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_4_IDS);
  assert.ok(ASIA_BATCH_4_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

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
  const beforeIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_4_IDS.length + (ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))))
    .map(({ id }) => id));
  const before = canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id));
  const afterIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)))
    .map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => afterIds.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !afterIds.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(before.length, 29);
  assert.equal(after.length, 37);
  assert.equal(remaining.length, 27);
  assert.ok(ASIA_BATCH_4_IDS.every((id) => after.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ id }) => !afterIds.has(id)));
});

test("Asia Batch 5 adds eight previously non-editorial canonical destinations", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)))
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(-((ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length) + ASIA_BATCH_6_IDS.length + ASIA_BATCH_5_IDS.length),
    -((ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length) + ASIA_BATCH_6_IDS.length));
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_5_IDS);
  assert.ok(ASIA_BATCH_5_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

  for (const id of ASIA_BATCH_5_IDS) {
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

test("Asia Batch 5 preserves canonical identities, scope, airports, aliases and images", () => {
  const canonicalById = new Map(buildExploreDestinations(airports)
    .filter(({ id }) => ASIA_BATCH_5_IDS.some((batchId) => batchId === id))
    .map((destination) => [destination.id, destination]));
  const destination = (id: (typeof ASIA_BATCH_5_IDS)[number]) => {
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
  assert.deepEqual([destination("bd-dhaka").name, destination("bd-dhaka").country],
    ["Dhaka", "Bangladesh"]);
  assert.deepEqual([destination("pk-islamabad").name, destination("pk-islamabad").country],
    ["Islamabad", "Pakistan"]);
  assert.ok(destination("pk-islamabad").airportCodes.includes("ISB"));
  assert.equal(destination("pk-karachi").country, "Pakistan");
  assert.equal(destination("np-kathmandu").name, "Kathmandu");
  assert.deepEqual([destination("pk-lahore").name, destination("pk-lahore").country],
    ["Lahore", "Pakistan"]);
  assert.equal(destination("mv-male").name, "Malé");
  assert.ok(destination("mv-male").airportCodes.includes("MLE"));
  assert.equal(destination("bt-paro").name, "Paro");
  assert.equal(destination("ir-tehran").country, "Iran");
  assert.ok(preNorthAmericaEditorial.find(({ id }) => id === "ir-tehran")!
    .editorialProvenance.sourceReferences.length >= 2);
});

test("Asia coverage is derived as 45 of 64 after Batch 5 with 19 remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const beforeIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_5_IDS.length + ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)))
    .map(({ id }) => id));
  const afterBatch5Ids = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)))
    .map(({ id }) => id));
  const after = canonicalAsianDestinations.filter(({ id }) => afterBatch5Ids.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !afterBatch5Ids.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(canonicalAsianDestinations.filter(({ id }) => beforeIds.has(id)).length, 37);
  assert.equal(after.length, 45);
  assert.equal(remaining.length, 19);
  assert.ok(ASIA_BATCH_5_IDS.every((id) => after.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ id }) => !afterBatch5Ids.has(id)));
});

test("Asia Batch 6 adds seven canonical destinations and explicitly defers Ashgabat", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)))
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(-(ASIA_BATCH_6_IDS.length + (ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length)), -(ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length));
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_6_IDS);
  assert.ok(ASIA_BATCH_6_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

  for (const id of ASIA_BATCH_6_IDS) {
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

  for (const id of ASIA_BATCH_6_DEFERRED_IDS) {
    const destination = exploreDestinations.find((candidate) => candidate.id === id);
    const preFinalEditorial = preNorthAmericaEditorial.slice(0, -ASIA_FINAL_BATCH_IDS.length);
    assert.ok(destination);
    assert.equal(destination.name, "Ashgabat");
    assert.equal(preFinalEditorial.some((record) => record.id === id), false);
  }
});

test("Asia Batch 6 preserves canonical identities, airports, aliases and images", () => {
  const candidateIds = [...ASIA_BATCH_6_IDS, ...ASIA_BATCH_6_DEFERRED_IDS];
  const canonicalById = new Map(buildExploreDestinations(airports)
    .filter(({ id }) => candidateIds.some((batchId) => batchId === id))
    .map((destination) => [destination.id, destination]));
  const destination = (id: (typeof candidateIds)[number]) => {
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
  assert.equal(destination("kz-almaty").name, "Almaty");
  assert.deepEqual(destination("kz-almaty").airportCodes, canonicalById.get("kz-almaty")!.airportCodes);
  assert.equal(destination("tm-ashgabat").name, "Ashgabat");
  assert.equal(destination("az-baku").name, "Baku");
  assert.equal(destination("az-baku").country, canonicalById.get("az-baku")!.country);
  assert.equal(destination("kg-bishkek").name, "Bishkek");
  assert.equal(destination("tj-dushanbe").name, "Dushanbe");
  assert.equal(destination("uz-tashkent").name, "Tashkent");
  assert.equal(destination("ge-tbilisi").name, "Tbilisi");
  assert.equal(destination("ge-tbilisi").country, canonicalById.get("ge-tbilisi")!.country);
  assert.equal(destination("am-yerevan").name, "Yerevan");
  assert.equal(destination("am-yerevan").country, canonicalById.get("am-yerevan")!.country);
});

test("Asia coverage is derived as 52 of 64 after Batch 6 with 12 remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const afterBatch6Ids = new Set(preNorthAmericaEditorial.slice(
    0, -(ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length),
  ).map(({ id }) => id));
  const enriched = canonicalAsianDestinations.filter(({ id }) => afterBatch6Ids.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) =>
    !enriched.some((destination) => destination.id === id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(enriched.length, 52);
  assert.equal(remaining.length, 12);
  assert.ok(ASIA_BATCH_6_IDS.every((id) => enriched.some((destination) => destination.id === id)));
  assert.ok(ASIA_BATCH_6_DEFERRED_IDS.every((id) =>
    remaining.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ id }) => !afterBatch6Ids.has(id)));
});

test("Asia Batch 7 adds exactly eight canonical Gulf and Arabian Peninsula destinations", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(0, -(ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length))
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(
    -(ASIA_BATCH_7_IDS.length + ASIA_FINAL_BATCH_IDS.length),
    -ASIA_FINAL_BATCH_IDS.length,
  );
  assert.deepEqual(batch.map(({ id }) => id), ASIA_BATCH_7_IDS);
  assert.ok(ASIA_BATCH_7_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

  for (const id of ASIA_BATCH_7_IDS) {
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

test("Asia Batch 7 preserves canonical identities, airports, aliases and images", () => {
  const canonicalById = new Map(buildExploreDestinations(airports)
    .filter(({ id }) => ASIA_BATCH_7_IDS.some((batchId) => batchId === id))
    .map((destination) => [destination.id, destination]));
  const destination = (id: (typeof ASIA_BATCH_7_IDS)[number]) => {
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
  assert.equal(destination("ae-abu-dhabi").name, "Abu Dhabi");
  assert.equal(destination("ae-abu-dhabi").country, "United Arab Emirates");
  assert.equal(destination("jo-amman").name, "Amman");
  assert.equal(destination("qa-doha").name, "Doha");
  assert.equal(destination("sa-jeddah").name, "Jeddah");
  assert.equal(destination("kw-kuwait-city").name, "Kuwait City");
  assert.equal(destination("kw-kuwait-city").country, "Kuwait");
  assert.equal(destination("bh-manama").name, "Manama");
  assert.equal(destination("bh-manama").country, "Bahrain");
  assert.equal(destination("om-muscat").name, "Muscat");
  assert.equal(destination("sa-riyadh").name, "Riyadh");
  assert.equal(destination("sa-riyadh").country, "Saudi Arabia");
});

test("Asia coverage is derived as 60 of 64 after Batch 7 with four remaining", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const preFinalIds = new Set(preNorthAmericaEditorial.slice(0, -ASIA_FINAL_BATCH_IDS.length)
    .map(({ id }) => id));
  const enriched = canonicalAsianDestinations.filter(({ id }) => preFinalIds.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !preFinalIds.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(enriched.length, 60);
  assert.equal(remaining.length, 4);
  assert.deepEqual(remaining.map(({ id }) => id).sort(),
    ["il-tel-aviv", "iq-baghdad", "lb-beirut", "tm-ashgabat"]);
  assert.ok(ASIA_BATCH_7_IDS.every((id) => enriched.some((destination) => destination.id === id)));
  assert.ok(remaining.every(({ name }) => exploreDestinationByAlias(name)));
});

test("the final Asia batch adds exactly four complete canonical editorial records", () => {
  const priorIds = new Set(preNorthAmericaEditorial.slice(0, -ASIA_FINAL_BATCH_IDS.length)
    .map(({ id }) => id));
  const batch = preNorthAmericaEditorial.slice(-ASIA_FINAL_BATCH_IDS.length);
  assert.deepEqual(batch.map(({ id }) => id), ASIA_FINAL_BATCH_IDS);
  assert.ok(ASIA_FINAL_BATCH_IDS.every((id) => !priorIds.has(id)));
  assert.equal(new Set(preNorthAmericaEditorial.map(({ id }) => id)).size,
    preNorthAmericaEditorial.length);

  for (const id of ASIA_FINAL_BATCH_IDS) {
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

test("the final Asia batch preserves canonical identities and exact resolved provenance", () => {
  const expected = new Map([
    ["tm-ashgabat", { name: "Ashgabat", country: "Turkmenistan", urls: [
      "https://turkmenistan.gov.tm/en/post/54439/history-museums-turkmenistan",
      "https://www.turkmenistan.gov.tm/en/post/54136/history-ashgabat-dawn-xx-century",
    ] }],
    ["iq-baghdad", { name: "Baghdad", country: "Iraq", urls: [
      "https://www.unesco.org/en/museums/iraq",
      "https://whc.unesco.org/en/tentativelists/5880",
    ] }],
    ["lb-beirut", { name: "Beirut", country: "Lebanon", urls: [
      "https://culture.gov.lb/en/Affiliates/National-Museum",
      "https://www.aub.edu.lb/museum_archeo/Pages/default.aspx",
    ] }],
    ["il-tel-aviv", { name: "Tel Aviv", country: "Israel", urls: [
      "https://whc.unesco.org/en/list/1096/",
      "https://www.tel-aviv.gov.il/en/Visit/WhiteCity/Pages/default.aspx",
    ] }],
  ] as const);
  const canonicalWithoutEditorial = buildCanonicalExploreDestinations(airports);

  for (const id of ASIA_FINAL_BATCH_IDS) {
    const destination = exploreDestinations.find((candidate) => candidate.id === id);
    const canonical = canonicalWithoutEditorial.find((candidate) => candidate.id === id);
    const required = expected.get(id);
    assert.ok(destination);
    assert.ok(canonical);
    assert.ok(required);
    assert.equal(destination.name, required.name);
    assert.equal(destination.country, required.country);
    assert.deepEqual({
      id: destination.id, name: destination.name, country: destination.country,
      countryCode: destination.countryCode, primaryAirportCode: destination.primaryAirportCode,
      airportCodes: destination.airportCodes, airportNames: destination.airportNames,
      searchAliases: destination.searchAliases, imageDestinationId: destination.imageDestinationId,
      provenance: destination.provenance,
    }, canonical);
    const urls = destination.editorialProvenance!.sourceReferences.map(({ url }) => url);
    assert.ok(required.urls.every((url) => urls.includes(url)));
  }

  const telAviv = preNorthAmericaEditorial.find(({ id }) => id === "il-tel-aviv")!;
  assert.ok(telAviv.highlights.every((highlight) =>
    !/jerusalem|haifa|eilat|dead sea|masada|galilee/i.test(highlight)));
});

test("every canonical Asian destination has editorial content after the final batch", () => {
  const canonicalAsianDestinations = exploreDestinations.filter(({ countryCode }) =>
    ASIA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(preNorthAmericaEditorial.map(({ id }) => id));
  const editorialized = canonicalAsianDestinations.filter(({ id }) => editorialIds.has(id));
  const remaining = canonicalAsianDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonicalAsianDestinations.length, 64);
  assert.equal(editorialized.length, 64);
  assert.deepEqual(remaining, []);
  assert.equal(editorialIds.size, preNorthAmericaEditorial.length);
});

test("global editorial coverage before Central America Batch 1 remains 188 of 235", () => {
  const coveredRegionCodes = new Set([
    ...EUROPE_COUNTRY_CODES, ...AFRICA_COUNTRY_CODES, ...ASIA_COUNTRY_CODES,
  ]);
  const editorialIds = new Set(exploreDestinationEditorial
    .slice(0, -(CENTRAL_AMERICA_BATCH_1_IDS.length + CARIBBEAN_BATCH_1_IDS.length
      + SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const remaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  const remainingOutsideCoveredRegions = remaining.filter(({ countryCode }) =>
    !coveredRegionCodes.has(countryCode));
  assert.equal(exploreDestinations.length, 235);
  assert.equal(editorialIds.size, 188);
  assert.equal(remaining.length, 47);
  assert.equal(remainingOutsideCoveredRegions.length, 47);
});

test("regional modules preserve the historical prefix and append rollout modules deterministically", () => {
  const historicalPrefix = [
    ...legacyExploreDestinationEditorial,
    ...europeExploreDestinationEditorial,
    ...africaExploreDestinationEditorial,
    ...asiaExploreDestinationEditorial,
  ];
  const canonicalIds = new Set(buildCanonicalExploreDestinations(airports).map(({ id }) => id));
  const editorialIds = historicalPrefix.map(({ id }) => id);
  const semanticPayloadHash = createHash("sha256")
    .update(JSON.stringify(historicalPrefix))
    .digest("hex");

  assert.equal(historicalPrefix.length, 175);
  assert.deepEqual(exploreDestinationEditorial.slice(0, 175), historicalPrefix);
  assert.deepEqual(editorialIds, exploreDestinationEditorial.slice(0, 175).map(({ id }) => id));
  assert.deepEqual(
    exploreDestinationEditorial.slice(175).map(({ id }) => id),
    [
      ...NORTH_AMERICA_BATCH_1_IDS,
      ...NORTH_AMERICA_BATCH_2_IDS,
      ...CENTRAL_AMERICA_BATCH_1_IDS,
      ...CARIBBEAN_BATCH_1_IDS,
      ...SOUTH_AMERICA_BATCH_1_IDS,
      ...SOUTH_AMERICA_BATCH_2_IDS,
      ...OCEANIA_BATCH_1_IDS,
    ],
  );
  assert.equal(new Set(editorialIds).size, editorialIds.length);
  assert.ok(editorialIds.every((id) => canonicalIds.has(id)));
  assert.equal(
    semanticPayloadHash,
    "7369b6c921ca6a79077d3948f061de6cfa96bc7e6380a175b7a9d9e5ae5df847",
  );
});

test("North America Batch 1 adds exactly eight complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildExploreDestinations(airports);
  const historicalIds = new Set(exploreDestinationEditorial.slice(0, 175).map(({ id }) => id));
  assert.deepEqual(northAmericaExploreDestinationEditorial.slice(0, 8).map(({ id }) => id),
    NORTH_AMERICA_BATCH_1_IDS);
  assert.ok(NORTH_AMERICA_BATCH_1_IDS.every((id) => !historicalIds.has(id)));

  for (const record of northAmericaExploreDestinationEditorial.slice(0, 8)) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("North America Batch 2 appends five complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial.slice(0, 183).map(({ id }) => id));
  const batch = northAmericaExploreDestinationEditorial.slice(8);
  assert.deepEqual(batch.map(({ id }) => id), NORTH_AMERICA_BATCH_2_IDS);
  assert.ok(NORTH_AMERICA_BATCH_2_IDS.every((id) => !priorIds.has(id)));

  for (const record of batch) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("North America Batch 1 semantic payload remains unchanged", () => {
  const batch1 = northAmericaExploreDestinationEditorial.slice(0, 8);
  assert.equal(createHash("sha256").update(JSON.stringify(batch1)).digest("hex"),
    "40d4ea40c51955dd45b83cfd74f1f7e8c3200dd81919575b51ccffd23b41aeea");
});

test("North America Batch 2 preserves high-care canonical destination and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("ca-vancouver")?.name, "Vancouver");
  assert.equal(byId.get("ca-vancouver")?.country, "Canada");
  assert.equal(byId.get("ca-vancouver")?.primaryAirportCode, "YVR");
  assert.deepEqual(byId.get("ca-vancouver")?.airportCodes, ["YVR"]);
  assert.equal(byId.get("ca-montreal")?.name, "Montreal");
  assert.notEqual(byId.get("ca-montreal")?.name, "Montréal");
  assert.equal(byId.get("mx-mexico-city")?.name, "Mexico City");
  assert.equal(byId.get("mx-mexico-city")?.country, "Mexico");
  assert.equal(byId.get("mx-cancun")?.name, "Cancún");
  assert.equal(byId.get("mx-cancun")?.primaryAirportCode, "CUN");
  assert.deepEqual(byId.get("mx-cancun")?.airportCodes, ["CUN"]);
  assert.equal(byId.get("mx-guadalajara")?.name, "Guadalajara");
});

test("North America Batch 1 preserves high-care destination and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("us-dallas-fort-worth")?.name, "Dallas-Fort Worth");
  assert.equal(byId.get("us-miami")?.name, "Miami");
  assert.equal(byId.get("us-san-francisco")?.name, "San Francisco");
  assert.equal(byId.get("us-seattle")?.primaryAirportCode, "SEA");
  assert.deepEqual(byId.get("us-seattle")?.airportCodes, ["SEA"]);
  assert.equal(byId.get("us-houston")?.primaryAirportCode, "IAH");
  assert.deepEqual(byId.get("us-houston")?.airportCodes, ["IAH", "HOU"]);
});

test("North America coverage is repository-derived as complete after Batch 2", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    NORTH_AMERICA_COUNTRY_CODES.has(countryCode));
  const historicalIds = new Set(exploreDestinationEditorial.slice(0, 175).map(({ id }) => id));
  const batch1Ids = new Set(exploreDestinationEditorial.slice(0, 183).map(({ id }) => id));
  const finalIds = new Set(exploreDestinationEditorial.map(({ id }) => id));
  const beforeBatch1 = canonical.filter(({ id }) => historicalIds.has(id));
  const beforeBatch2 = canonical.filter(({ id }) => batch1Ids.has(id));
  const after = canonical.filter(({ id }) => finalIds.has(id));
  const remaining = canonical.filter(({ id }) => !finalIds.has(id));
  assert.equal(canonical.length, 16);
  assert.equal(beforeBatch1.length, 3);
  assert.equal(beforeBatch2.length, 11);
  assert.equal(after.length, 16);
  assert.deepEqual(remaining, []);
  assert.ok(["us-new-york", "us-los-angeles", "ca-toronto"].every((id) => finalIds.has(id)));
});

test("Central America Batch 1 adds five complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(CENTRAL_AMERICA_BATCH_1_IDS.length + CARIBBEAN_BATCH_1_IDS.length
      + SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  assert.deepEqual(centralAmericaExploreDestinationEditorial.map(({ id }) => id),
    CENTRAL_AMERICA_BATCH_1_IDS);
  assert.ok(CENTRAL_AMERICA_BATCH_1_IDS.every((id) => !priorIds.has(id)));

  for (const record of centralAmericaExploreDestinationEditorial) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.startsWith(enriched.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("Central America Batch 1 preserves high-care city and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("gt-guatemala-city")?.name, "Guatemala City");
  assert.equal(byId.get("gt-guatemala-city")?.country, "Guatemala");
  assert.equal(byId.get("sv-san-salvador")?.name, "San Salvador");
  assert.equal(byId.get("sv-san-salvador")?.primaryAirportCode, "SAL");
  assert.deepEqual(byId.get("sv-san-salvador")?.airportCodes, ["SAL"]);
  assert.equal(byId.get("hn-san-pedro-sula")?.name, "San Pedro Sula");
  assert.equal(byId.get("hn-san-pedro-sula")?.editorialProvenance, undefined);
  assert.equal(byId.get("ni-managua")?.name, "Managua");
  assert.equal(byId.get("ni-managua")?.country, "Nicaragua");
  assert.equal(byId.get("cr-san-jose")?.name, "San José");
  assert.equal(byId.get("cr-san-jose")?.primaryAirportCode, "SJO");
  assert.deepEqual(byId.get("cr-san-jose")?.airportCodes, ["SJO"]);
  assert.equal(byId.get("pa-panama-city")?.name, "Panama City");
  assert.equal(byId.get("pa-panama-city")?.country, "Panama");
});

test("Central America coverage and global coverage are repository-derived after Batch 1", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    CENTRAL_AMERICA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(CENTRAL_AMERICA_BATCH_1_IDS.length + CARIBBEAN_BATCH_1_IDS.length
      + SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const before = canonical.filter(({ id }) => priorIds.has(id));
  const after = canonical.filter(({ id }) => editorialIds.has(id));
  const remaining = canonical.filter(({ id }) => !editorialIds.has(id));
  const globalRemaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonical.length, 6);
  assert.equal(before.length, 0);
  assert.equal(after.length, 5);
  assert.deepEqual(remaining.map(({ id }) => id), CENTRAL_AMERICA_BATCH_1_DEFERRED_IDS);
  assert.equal(editorialIds.size, 203);
  assert.equal(globalRemaining.length, 32);
});

test("Caribbean Batch 1 appends ten complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildCanonicalExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(CARIBBEAN_BATCH_1_IDS.length + SOUTH_AMERICA_BATCH_IDS.length
      + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  assert.deepEqual(caribbeanExploreDestinationEditorial.map(({ id }) => id), CARIBBEAN_BATCH_1_IDS);
  assert.ok(CARIBBEAN_BATCH_1_IDS.every((id) => !priorIds.has(id)));

  for (const record of caribbeanExploreDestinationEditorial) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(canonical.editorialProvenance, undefined);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.startsWith(enriched.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.replace(/^St\./, "St").match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("Caribbean Batch 1 preserves high-care canonical and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("cu-havana")?.country, "Cuba");
  assert.equal(byId.get("do-santo-domingo")?.name, "Santo Domingo");
  assert.equal(byId.get("do-santo-domingo")?.primaryAirportCode, "SDQ");
  assert.deepEqual(byId.get("do-santo-domingo")?.airportCodes, ["SDQ"]);
  assert.equal(byId.get("do-punta-cana")?.name, "Punta Cana");
  assert.equal(byId.get("jm-kingston")?.country, "Jamaica");
  assert.equal(byId.get("jm-montego-bay")?.name, "Montego Bay");
  assert.equal(byId.get("tt-port-of-spain")?.name, "Port of Spain");
  assert.equal(byId.get("tt-port-of-spain")?.country, "Trinidad & Tobago");
  assert.equal(byId.get("tt-port-of-spain")?.primaryAirportCode, "POS");
  assert.deepEqual(byId.get("tt-port-of-spain")?.airportCodes, ["POS"]);
  assert.equal(byId.get("bb-bridgetown")?.country, "Barbados");
  assert.equal(byId.get("bs-nassau")?.country, "Bahamas");
  assert.equal(byId.get("ag-st-john-s")?.name, "St. John's");
  assert.equal(byId.get("ag-st-john-s")?.country, "Antigua & Barbuda");
  assert.equal(byId.get("aw-oranjestad")?.name, "Oranjestad");
  assert.equal(byId.get("aw-oranjestad")?.country, "Aruba");
});

test("Caribbean coverage and global coverage are repository-derived after Batch 1", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    CARIBBEAN_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(CARIBBEAN_BATCH_1_IDS.length + SOUTH_AMERICA_BATCH_IDS.length
      + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const before = canonical.filter(({ id }) => priorIds.has(id));
  const after = canonical.filter(({ id }) => editorialIds.has(id));
  const remaining = canonical.filter(({ id }) => !editorialIds.has(id));
  const globalRemaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonical.length, 10);
  assert.equal(before.length, 0);
  assert.equal(after.length, 10);
  assert.deepEqual(remaining, []);
  assert.equal(editorialIds.size, 203);
  assert.equal(globalRemaining.length, 32);
  assert.deepEqual(
    exploreDestinationEditorial
      .slice(-(CARIBBEAN_BATCH_1_IDS.length + SOUTH_AMERICA_BATCH_IDS.length
          + OCEANIA_BATCH_1_IDS.length),
        -(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
      .map(({ id }) => id),
    CARIBBEAN_BATCH_1_IDS,
  );
});

test("South America Batch 1 appends seven complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildCanonicalExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const batch = southAmericaExploreDestinationEditorial.slice(0, SOUTH_AMERICA_BATCH_1_IDS.length);
  assert.deepEqual(batch.map(({ id }) => id), SOUTH_AMERICA_BATCH_1_IDS);
  assert.ok(SOUTH_AMERICA_BATCH_1_IDS.every((id) => !priorIds.has(id)));

  for (const record of batch) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(canonical.editorialProvenance, undefined);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.startsWith(enriched.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("South America Batch 1 preserves high-care canonical city and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("co-bogota")?.name, "Bogotá");
  assert.equal(byId.get("co-medellin")?.name, "Medellín");
  assert.equal(byId.get("co-medellin")?.primaryAirportCode, "MDE");
  assert.deepEqual(byId.get("co-medellin")?.airportCodes, ["MDE"]);
  assert.equal(byId.get("ec-quito")?.name, "Quito");
  assert.equal(byId.get("ec-quito")?.primaryAirportCode, "UIO");
  assert.deepEqual(byId.get("ec-quito")?.airportCodes, ["UIO"]);
  assert.equal(byId.get("ec-guayaquil")?.name, "Guayaquil");
  assert.equal(byId.get("pe-lima")?.name, "Lima");
  assert.equal(byId.get("bo-la-paz")?.name, "La Paz");
  assert.equal(byId.get("bo-la-paz")?.country, "Bolivia");
  assert.equal(byId.get("bo-la-paz")?.primaryAirportCode, "LPB");
  assert.deepEqual(byId.get("bo-la-paz")?.airportCodes, ["LPB"]);
  assert.equal(byId.get("bo-santa-cruz")?.name, "Santa Cruz");
  assert.notEqual(byId.get("bo-santa-cruz")?.name, "Santa Cruz de la Sierra");
});

test("South America and global coverage are repository-derived after Batch 1", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    SOUTH_AMERICA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_2_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const before = canonical.filter(({ id }) => priorIds.has(id));
  const after = canonical.filter(({ id }) => editorialIds.has(id));
  const remaining = canonical.filter(({ id }) => !editorialIds.has(id));
  const globalRemaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonical.length, 15);
  assert.equal(before.length, 1);
  assert.equal(after.length, 8);
  assert.equal(remaining.length, 7);
  assert.equal(editorialIds.size, 210);
  assert.equal(globalRemaining.length, 25);
  assert.deepEqual(exploreDestinationEditorial
    .slice(-(SOUTH_AMERICA_BATCH_IDS.length + OCEANIA_BATCH_1_IDS.length),
      -(SOUTH_AMERICA_BATCH_2_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id), SOUTH_AMERICA_BATCH_1_IDS);
});

test("South America Batch 2 appends seven complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildCanonicalExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -(SOUTH_AMERICA_BATCH_2_IDS.length + OCEANIA_BATCH_1_IDS.length))
    .map(({ id }) => id));
  const batch = southAmericaExploreDestinationEditorial.slice(-SOUTH_AMERICA_BATCH_2_IDS.length);
  assert.deepEqual(batch.map(({ id }) => id), SOUTH_AMERICA_BATCH_2_IDS);
  assert.ok(SOUTH_AMERICA_BATCH_2_IDS.every((id) => !priorIds.has(id)));

  for (const record of batch) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(canonical.editorialProvenance, undefined);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.startsWith(enriched.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("South America Batch 2 preserves canonical city and airport scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("cl-santiago")?.name, "Santiago");
  assert.equal(byId.get("ar-buenos-aires")?.name, "Buenos Aires");
  assert.equal(byId.get("ar-buenos-aires")?.primaryAirportCode, "AEP");
  assert.deepEqual(byId.get("ar-buenos-aires")?.airportCodes, ["AEP", "EZE"]);
  assert.equal(byId.get("uy-montevideo")?.name, "Montevideo");
  assert.equal(byId.get("py-asuncion")?.name, "Asunción");
  assert.equal(byId.get("py-asuncion")?.primaryAirportCode, "ASU");
  assert.deepEqual(byId.get("py-asuncion")?.airportCodes, ["ASU"]);
  assert.equal(byId.get("br-sao-paulo")?.name, "São Paulo");
  assert.equal(byId.get("br-sao-paulo")?.primaryAirportCode, "GRU");
  assert.deepEqual(byId.get("br-sao-paulo")?.airportCodes, ["GRU"]);
  assert.equal(byId.get("br-brasilia")?.name, "Brasília");
  assert.equal(byId.get("br-manaus")?.name, "Manaus");
});

test("South America and global coverage are repository-derived as complete after Batch 2", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    SOUTH_AMERICA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial
    .slice(0, -OCEANIA_BATCH_1_IDS.length).map(({ id }) => id));
  const editorialized = canonical.filter(({ id }) => editorialIds.has(id));
  const remaining = canonical.filter(({ id }) => !editorialIds.has(id));
  const globalRemaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonical.length, 15);
  assert.equal(editorialized.length, 15);
  assert.deepEqual(remaining, []);
  assert.ok(editorialIds.has("br-rio-de-janeiro"));
  assert.equal(editorialIds.size, 217);
  assert.equal(globalRemaining.length, 18);
  assert.deepEqual(exploreDestinationEditorial
    .slice(-(SOUTH_AMERICA_BATCH_2_IDS.length + OCEANIA_BATCH_1_IDS.length),
      -OCEANIA_BATCH_1_IDS.length)
    .map(({ id }) => id), SOUTH_AMERICA_BATCH_2_IDS);
});

test("Oceania Batch 1 appends seven complete, previously non-editorial canonical records", () => {
  const canonicalDestinations = buildCanonicalExploreDestinations(airports);
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -OCEANIA_BATCH_1_IDS.length).map(({ id }) => id));
  assert.deepEqual(oceaniaExploreDestinationEditorial.map(({ id }) => id), OCEANIA_BATCH_1_IDS);
  assert.ok(OCEANIA_BATCH_1_IDS.every((id) => !priorIds.has(id)));

  for (const record of oceaniaExploreDestinationEditorial) {
    const canonical = canonicalDestinations.find(({ id }) => id === record.id);
    const enriched = exploreDestinations.find(({ id }) => id === record.id);
    assert.ok(canonical);
    assert.ok(enriched);
    assert.equal(canonical.editorialProvenance, undefined);
    assert.equal(enriched.summary, record.summary);
    assert.equal(enriched.description, record.description);
    assert.deepEqual(enriched.highlights, record.highlights);
    assert.deepEqual(enriched.editorialProvenance, record.editorialProvenance);
    assert.ok(record.summary.startsWith(enriched.name));
    assert.ok(record.summary.trim().split(/\s+/).length >= 13);
    assert.ok(record.summary.trim().split(/\s+/).length <= 18);
    assert.equal((record.summary.match(/[.!?](?:\s|$)/g) ?? []).length, 1);
    assert.ok(record.description.trim().split(/\s+/).length >= 53);
    assert.ok(record.description.trim().split(/\s+/).length <= 66);
    assert.equal((record.description.match(/[.!?](?:\s|$)/g) ?? []).length, 3);
    assert.equal(record.highlights.length, 4);
    assert.equal(new Set(record.highlights.map((highlight) => highlight.toLowerCase())).size, 4);
    assert.ok(record.highlights.every((highlight) => highlight.trim() && !/[.!?]$/.test(highlight)));
    assert.equal(record.editorialProvenance.source, "kurioticket-editorial");
    assert.equal(record.editorialProvenance.lastVerifiedAt, "2026-08-10");
    assert.ok(record.editorialProvenance.sourceReferences.length >= 2);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ url }) => url)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.equal(new Set(record.editorialProvenance.sourceReferences.map(({ title }) => title)).size,
      record.editorialProvenance.sourceReferences.length);
    assert.ok(record.editorialProvenance.sourceReferences.every(({ title, url }) =>
      title.trim() && url.startsWith("https://")));
    assert.equal("relatedDestinationIds" in record, false);
    assert.deepEqual({
      name: enriched.name, country: enriched.country, countryCode: enriched.countryCode,
      primaryAirportCode: enriched.primaryAirportCode, airportCodes: enriched.airportCodes,
      airportNames: enriched.airportNames, searchAliases: enriched.searchAliases,
      imageDestinationId: enriched.imageDestinationId, provenance: enriched.provenance,
    }, {
      name: canonical.name, country: canonical.country, countryCode: canonical.countryCode,
      primaryAirportCode: canonical.primaryAirportCode, airportCodes: canonical.airportCodes,
      airportNames: canonical.airportNames, searchAliases: canonical.searchAliases,
      imageDestinationId: canonical.imageDestinationId, provenance: canonical.provenance,
    });
  }
});

test("Oceania Batch 1 preserves canonical destination scopes", () => {
  const byId = new Map(exploreDestinations.map((destination) => [destination.id, destination]));
  assert.equal(byId.get("au-melbourne")?.name, "Melbourne");
  assert.equal(byId.get("au-melbourne")?.country, "Australia");
  assert.equal(byId.get("au-brisbane")?.name, "Brisbane");
  assert.equal(byId.get("au-perth")?.name, "Perth");
  assert.equal(byId.get("au-perth")?.country, "Australia");
  assert.equal(byId.get("au-adelaide")?.name, "Adelaide");
  assert.equal(byId.get("nz-auckland")?.name, "Auckland");
  assert.equal(byId.get("nz-auckland")?.country, "New Zealand");
  assert.equal(byId.get("nz-wellington")?.name, "Wellington");
  assert.equal(byId.get("nz-christchurch")?.name, "Christchurch");
});

test("Oceania and global coverage are repository-derived after Batch 1", () => {
  const canonical = exploreDestinations.filter(({ countryCode }) =>
    OCEANIA_COUNTRY_CODES.has(countryCode));
  const editorialIds = new Set(exploreDestinationEditorial.map(({ id }) => id));
  const priorIds = new Set(exploreDestinationEditorial
    .slice(0, -OCEANIA_BATCH_1_IDS.length).map(({ id }) => id));
  const before = canonical.filter(({ id }) => priorIds.has(id));
  const after = canonical.filter(({ id }) => editorialIds.has(id));
  const remaining = canonical.filter(({ id }) => !editorialIds.has(id));
  const globalRemaining = exploreDestinations.filter(({ id }) => !editorialIds.has(id));
  assert.equal(canonical.length, 18);
  assert.equal(before.length, 1);
  assert.equal(after.length, 8);
  assert.equal(remaining.length, 10);
  assert.equal(editorialIds.size, 224);
  assert.equal(globalRemaining.length, 11);
  assert.deepEqual(exploreDestinationEditorial.slice(-OCEANIA_BATCH_1_IDS.length)
    .map(({ id }) => id), OCEANIA_BATCH_1_IDS);
  assert.deepEqual(remaining.map(({ id }) => id).sort(), [
    "ck-rarotonga", "fj-nadi", "gu-guam", "mp-saipan", "pf-papeete",
    "pg-port-moresby", "sb-honiara", "to-nuku-alofa", "vu-port-vila", "ws-apia",
  ].sort());
  assert.equal(exploreDestinations.find(({ id }) => id === "hn-san-pedro-sula")
    ?.editorialProvenance, undefined);
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
  assert.equal(CURATED_POPULAR_EXPLORE_DESTINATION_IDS.length, 25);
  assert.ok(popularExploreDestinations.every(({ editorialProvenance }) => editorialProvenance));
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
