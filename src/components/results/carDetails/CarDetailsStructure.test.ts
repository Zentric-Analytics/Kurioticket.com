import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(new URL("../CarDetailsClient.tsx", import.meta.url), "utf8");
const guidedSource = readFileSync(new URL("../deals/DealsCarDetailsStage.tsx", import.meta.url), "utf8");

const experienceSource = clientSource.slice(
  clientSource.indexOf("export function CarDetailsExperience"),
  clientSource.indexOf("export function CarDetailsClient"),
);
const standaloneSource = clientSource.slice(clientSource.indexOf("export function CarDetailsClient"));

test("standalone Car details owns exactly one page wrapper and back link", () => {
  assert.equal(standaloneSource.match(/<main\b/g)?.length, 1);
  assert.equal(standaloneSource.match(/page-shell py-5 sm:py-7/g)?.length, 1);
  assert.equal(standaloneSource.match(/<DetailsBackLink\b/g)?.length, 1);
  assert.equal(standaloneSource.match(/border-b border-border bg-white lg:pb-14/g)?.length, 1);
  assert.match(standaloneSource, /presentation="standalone-content"/);
  assert.match(standaloneSource, /standalone-disabled-provider/);
});

test("CarDetailsExperience is content-only for standalone and guided callers", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.doesNotMatch(experienceSource, /page-shell/);
  assert.doesNotMatch(experienceSource, /DetailsBackLink/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.match(experienceSource, /presentation === "guided-content" \? "mt-6" : ""/);
});

test("guided Car details renders content-only experience with guided headings", () => {
  assert.doesNotMatch(guidedSource, /<main\b/);
  assert.doesNotMatch(guidedSource, /DetailsBackLink/);
  assert.doesNotMatch(guidedSource, /border-b border-border bg-white lg:pb-14/);
  assert.match(guidedSource, /presentation="guided-content"/);
  assert.match(guidedSource, /modelHeadingLevel=\{2\}/);
  assert.match(guidedSource, /sectionHeadingLevel=\{3\}/);
  assert.match(guidedSource, /itemHeadingLevel=\{4\}/);
});
