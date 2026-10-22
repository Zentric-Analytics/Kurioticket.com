import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cmsMarketCodes, cmsPayloadSchemas } from "./cmsContentService";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261022180000_add_cms_foundation/migration.sql", "utf8");
const service = readFileSync("src/services/cmsContentService.ts", "utf8");
const collectionApi = readFileSync("src/app/api/admin/content/route.ts", "utf8");
const itemApi = readFileSync("src/app/api/admin/content/[id]/route.ts", "utf8");
const publicReaders = readFileSync("src/services/publicCmsContentService.ts", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const faqSource = readFileSync("src/content/faqs.ts", "utf8");

test("CMS foundation has versioned draft/published storage and immutable revisions", () => {
  for (const token of ["enum CmsContentType", "enum CmsContentStatus", "model CmsContentScope", "model CmsContentItem", "draftPayload", "publishedPayload", "publishedMarket", "publishedLocale", "publishedSortOrder", "publishedVersion", "model CmsContentRevision", "@@unique([contentItemId, version])"]) {
    assert.equal(schema.includes(token), true, token);
  }
  assert.match(migration, /CREATE TABLE "CmsContentScope"/);
  assert.match(migration, /CREATE TABLE "CmsContentItem"/);
  assert.match(migration, /CREATE TABLE "CmsContentRevision"/);
  assert.match(schema, /@@index\(\[type, publishedMarket, publishedLocale, publishedSortOrder\]\)/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("CMS payloads are structured and reject unsafe or malformed content", () => {
  assert.equal(cmsPayloadSchemas.FAQ.safeParse({ question: "How does Kurioticket work?", answer: "Compare provider offers.", category: "General" }).success, true);
  assert.equal(cmsPayloadSchemas.FAQ.safeParse({ question: "", answer: "x", category: "General" }).success, false);
  assert.equal(cmsPayloadSchemas.HOMEPAGE_DESTINATION.safeParse({ city: "London", country: "United Kingdom", destinationCode: "LHR", originCode: "LOS", image: "/images/london.jpg", imageAlt: "London skyline" }).success, true);
  assert.equal(cmsPayloadSchemas.HOMEPAGE_DESTINATION.safeParse({ city: "London", country: "United Kingdom", destinationCode: "LHR", originCode: "LOS", image: "javascript:alert(1)", imageAlt: "London skyline" }).success, false);
  assert.equal(cmsPayloadSchemas.FLIGHT_ROUTE.safeParse({ title: "Lagos to London", originCity: "Lagos", originCode: "LOS", destinationCity: "London", destinationCode: "LOS", routeNote: "Route", image: "https://example.test/image.jpg", imageAlt: "Route" }).success, false);
});


test("CMS market scopes match the canonical homepage resolver domain", () => {
  for (const market of ["CANADA", "EUROPE", "AFRICA", "MIDDLE_EAST", "ASIA", "LATIN_AMERICA", "GLOBAL"]) {
    assert.equal(cmsMarketCodes.includes(market as never), true, market);
  }
  assert.equal(cmsMarketCodes.includes("RANDOM_REGION" as never), false);
  assert.match(service, /HOMEPAGE_REFRESH_MARKET_CODES/);
  assert.match(service, /cmsMarketCodeSet\.has\(value\)/);
});

test("admin CMS APIs require canonical admin access and expose explicit lifecycle actions", () => {
  assert.match(collectionApi, /requireAdminApiSession\(\)/);
  assert.match(itemApi, /requireAdminApiSession\(\)/);
  assert.match(collectionApi, /createCmsContent/);
  assert.match(collectionApi, /url\.searchParams\.get\("type"\)\?\.trim\(\) \|\| null/);
  assert.match(collectionApi, /url\.searchParams\.get\("status"\)\?\.trim\(\) \|\| null/);
  assert.match(collectionApi, /cursor: url\.searchParams\.get\("cursor"\)/);
  assert.match(collectionApi, /limit,/);
  for (const action of ["save_draft", "publish", "hide", "archive"]) assert.equal(itemApi.includes(action), true, action);
  assert.match(itemApi, /hasRecentReauthentication/);
  assert.match(itemApi, /recent_reauthentication_required/);
});

test("CMS mutations use optimistic concurrency and transactional revision plus audit writes", () => {
  assert.match(service, /expectedVersion/);
  assert.match(service, /version: parsed\.data\.expectedVersion/);
  assert.match(service, /version: \{ increment: 1 \}/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /cmsContentRevision\.create/);
  assert.match(service, /adminAuditLog\.create/);
  assert.match(service, /CMS_CONTENT_CREATED/);
  assert.match(service, /CMS_CONTENT_UPDATED/);
  assert.match(service, /error\.code === "P2034"/);
  assert.match(service, /Content changed concurrently/);
  assert.match(service, /encodeCmsListCursor/);
  assert.match(service, /decodeCmsListCursor/);
  assert.match(service, /take: limit \+ 1/);
  assert.match(service, /nextCursor/);
  assert.match(service, /CMS cursor does not match this query/);
  assert.doesNotMatch(service, /sortOrder: parsed\.data\.sortOrder \?\? existing\.sortOrder,\n\s*status: "DRAFT"/);
  assert.match(service, /publishedMarket: existing\.market/);
  assert.match(service, /publishedLocale: existing\.locale/);
  assert.match(service, /publishedSortOrder: existing\.sortOrder/);
  assert.match(service, /publishedPayload: input\.publishedPayload/);
});

test("public CMS readers fail safely to the existing code-backed content", () => {
  assert.match(service, /source: "fallback"/);
  assert.match(publicReaders, /getPopularDestinationsByRegion/);
  assert.match(publicReaders, /getHomeDiscoveryByRegion/);
  assert.match(publicReaders, /hotelDestinations/);
  assert.match(publicReaders, /generalFaqs/);
  assert.match(service, /cmsPayloadSchemas\[type\]\.safeParse/);
  assert.match(service, /Prisma\.DbNull/);
  assert.match(service, /publishedMarket: market/);
  assert.match(service, /cmsContentScope\.upsert/);
  assert.match(service, /cmsContentScope\.findUnique/);
  assert.match(service, /if \(!scope && !rows\.length\) return \{ source: "fallback"/);
  assert.match(service, /visibleRows = rows\.filter\(\(row\) => row\.status === "PUBLISHED"\)/);
  assert.match(service, /return \{ source: "cms", items \}/);
  assert.match(faqSource, /export const generalFaqs/);
});

test("Phase 1 does not prematurely switch the public homepage to CMS storage", () => {
  assert.doesNotMatch(homepage, /publicCmsContentService/);
});
