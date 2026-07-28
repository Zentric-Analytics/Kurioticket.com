import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarResultCard.tsx", import.meta.url), "utf8");
const region = (name: string, nextName?: string) => {
  const start = source.indexOf(`data-region="${name}"`);
  const end = nextName ? source.indexOf(`data-region="${nextName}"`, start) : source.length;
  assert.notEqual(start, -1, `missing ${name} region`);
  assert.notEqual(end, -1, `missing boundary after ${name} region`);
  return source.slice(start, end);
};

test("source-contract: the semantic card and responsive grid remain intact", () => {
  assert.match(source, /<article className="[^"]*overflow-hidden[^"]*rounded-2xl[^"]*border/);
  assert.equal((source.match(/<article\b/g) ?? []).length, 1);
  assert.match(source, /grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,0\.9fr\)\]/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
});

test("source-contract: the image fills phones and restores its tablet inset", () => {
  const image = region("image", "heading");
  assert.match(image, /col-span-2 row-start-1/);
  assert.match(image, /md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-1/);
  assert.match(image, /md:p-2\.5/);
  assert.doesNotMatch(image, /(?<!md:)p-2\.5/);
  assert.match(image, /md:rounded-xl/);
  assert.match(image, /<CarResultImage /);
});

test("source-contract: the full-width heading safely contains car identity", () => {
  const heading = region("heading", "details");
  assert.match(heading, /col-span-2 row-start-2 min-w-0/);
  assert.match(heading, /\{car\.categoryLabel\}/);
  assert.match(heading, /<h2[^>]*>[\s\S]*\{car\.modelName\}[\s\S]*<\/h2>/);
  assert.match(heading, /\{badge && BadgeIcon &&/);
  assert.match(heading, /shrink-0/);
  assert.match(heading, /<MapPin/);
  assert.match(heading, /\{car\.pickupLocation\}/);
});

test("source-contract: phone details occupy the lower-left column", () => {
  const details = region("details", "pricing");
  assert.match(details, /col-start-1 row-start-3 min-w-0 border-t/);
  assert.match(details, /grid grid-cols-1 gap-y-1\.5/);
  assert.match(details, /md:flex md:flex-wrap/);
  for (const field of ["car.passengers", "car.bags", "car.doors", "car.transmission", "car.airConditioning"]) {
    assert.ok(source.includes(field), `missing ${field}`);
  }
  assert.match(details, /car\.mileagePolicy/);
  assert.match(details, /car\.fuelPolicy/);
  assert.match(details, /offer\.freeCancellation/);
  assert.match(details, /offer\.payAtPickup/);
  assert.doesNotMatch(details, />\s*•\s*</);
});

test("source-contract: pricing and its sole action share the lower-right column", () => {
  const pricing = region("pricing");
  assert.match(pricing, /col-start-2 row-start-3 flex min-w-0/);
  assert.match(pricing, /border-s border-t/);
  assert.match(pricing, /text-end/);
  assert.match(pricing, /md:col-span-2 md:col-start-1 md:row-start-3 md:border-s-0/);
  assert.match(pricing, /lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1/);
  assert.match(pricing, /lg:border-s lg:border-t-0/);
  assert.ok(pricing.indexOf("totalDisplayPrice.formatted") < pricing.indexOf("dailyDisplayPrice.formatted"));
  assert.match(pricing, /Taxes and fees included/);
  assert.match(pricing, /<Link href=\{detailsHref\} className="[^"]*w-full[^"]*bg-\[#004BB8\][^"]*text-white[^"]*focus-visible:ring-2/);
  assert.ok(pricing.indexOf("View car") > pricing.indexOf("totalDisplayPrice.formatted"));
  assert.equal((source.match(/<Link href=\{detailsHref\}/g) ?? []).length, 1);
});

test("source-contract: prices retain accessible overflow-safe formatting", () => {
  for (const price of ["dailyDisplayPrice", "totalDisplayPrice"]) {
    assert.match(source, new RegExp(`dir="ltr" title=\\{${price}\\.title\\} aria-label=\\{${price}\\.ariaLabel\\}`));
  }
  assert.equal((source.match(/tabular-nums/g) ?? []).length, 2);
  assert.match(source, /min-\[380px\]:whitespace-nowrap/);
});

test("source-contract: offer selection and non-positional layout stay unchanged", () => {
  assert.match(source, /const offer = getPrimaryCarOffer\(car\);/);
  assert.match(source, /if \(!offer\) return null;/);
  assert.doesNotMatch(source, /car\.offers\[0\]/);
  assert.doesNotMatch(source, /\b(?:absolute|fixed|sticky)\b/);
  assert.equal((source.match(/View car/g) ?? []).length, 1);
  assert.equal((source.match(/<h2\b/g) ?? []).length, 1);
});
