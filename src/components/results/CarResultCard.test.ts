import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/results/CarResultCard.tsx", "utf8");

test("CarResultCard accepts string and null href actions without provider fallback", () => {
  assert.match(source, /detailsHref: string \| null/);
  assert.match(source, /detailsHref \? <Link href=\{detailsHref\}/);
  assert.match(source, /<button type="button" disabled/);
  assert.doesNotMatch(source, /href=\{detailsHref \?\?|href="#"|bookingUrl|api\/redirect/);
});

test("CarResultCard keeps standalone defaults and guided heading/action overrides", () => {
  assert.match(source, /actionLabel = "View car"/);
  assert.match(source, /headingLevel = "h2"/);
  assert.match(source, /headingLevel === "h3"/);
  assert.match(source, /min-h-11/);
  assert.match(source, /actionAriaLabel/);
});
