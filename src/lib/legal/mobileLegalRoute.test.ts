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
  assert.deepEqual(Object.keys(body).sort(), ["lastUpdated", "lastUpdatedLabel", "sections", "slug", "summary", "title"]);
});
