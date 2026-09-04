import assert from "node:assert/strict";
import test from "node:test";
import { legalDocuments } from "@/data/legalDocuments";
import { GET } from "@/app/api/mobile/v1/legal/[slug]/route";

const call = (slug: string, locale = "en-us") => GET(new Request(`https://kurioticket.com/api/mobile/v1/legal/${slug}?locale=${locale}`), { params: Promise.resolve({ slug }) });

test("mobile legal API strictly allows the two mobile documents", async () => {
  assert.equal((await call("terms-of-service")).status, 200);
  assert.equal((await call("privacy-policy")).status, 200);
  assert.equal((await call("cookie-policy")).status, 404);
});

test("mobile legal API validates locale and localizes canonical data", async () => {
  assert.equal((await call("terms-of-service", "bogus")).status, 400);
  const body = await (await call("privacy-policy", "es-es")).json();
  assert.equal(body.slug, "privacy-policy");
  assert.notEqual(body.title, legalDocuments.find(({ slug }) => slug === "privacy-policy")?.title);
  assert.deepEqual(Object.keys(body).sort(), ["lastUpdated", "lastUpdatedLabel", "sections", "slug", "summary", "tableOfContentsLabel", "title"]);
  assert.equal(body.tableOfContentsLabel, "Tabla de contenido");
  const canonical = legalDocuments.find(({ slug }) => slug === "privacy-policy");
  assert.deepEqual(body.sections.map((section: { id: string }) => section.id), canonical?.sections.map(({ id }) => id));
  assert.deepEqual(body.sections.map((section: { paragraphs: string[] }) => section.paragraphs.length), canonical?.sections.map(({ paragraphs }) => paragraphs.length));
});

test("mobile legal API accepts the exact German and Italian mobile locale codes", async () => {
  for (const locale of ["de-de", "it-it"]) {
    const response = await call("terms-of-service", locale);
    assert.equal(response.status, 200, `${locale} should remain a valid mobile locale`);
    const body = await response.json();
    assert.equal(body.slug, "terms-of-service");
  }
});

test("mobile legal API accepts Arabic mobile locale content", async () => {
  const response = await call("privacy-policy", "ar");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.slug, "privacy-policy");
});
