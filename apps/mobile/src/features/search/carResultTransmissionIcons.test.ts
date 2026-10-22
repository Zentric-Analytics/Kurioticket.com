import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const card = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const providerPresentation = readFileSync(resolve("src/features/search/nativeCarProviderPresentation.ts"), "utf8");
const icon = readFileSync(resolve("src/features/flow/FlowIcon.tsx"), "utf8");
const iconTypes = readFileSync(resolve("src/features/flow/flowIconTypes.ts"), "utf8");
const catalogue = readFileSync(resolve("../../src/services/travel/staticCarCatalogue.ts"), "utf8");

test("canonical and provider-owned transmission labels select original automotive FlowIcons", () => {
  assert.match(card, /const transmissionIcon = \/manual\/i\.test\(specLabels\.transmission\)/);
  assert.match(card, /\/automatic\/i\.test\(specLabels\.transmission\)/);
  assert.match(card, /"transmissionManual"/);
  assert.match(card, /"transmissionAutomatic"/);
  assert.match(card, /<FlowIcon name=\{transmissionIcon\} size=\{14\} color="#64748B" \/>/);
  assert.match(card, /label=\{specLabels\.transmission\}/);
  assert.match(providerPresentation, /transmission: capitalize\(result\.transmission\)/);
  assert.match(providerPresentation, /transmission: providerSpec\(specs\[3\]\)/);
  assert.match(providerPresentation, /const authoredMissingSpecLabels = new Set/);
  assert.match(providerPresentation, /"Transmission not supplied"/);
  assert.match(providerPresentation, /return authoredMissingSpecLabels\.has\(trimmed\) \? "" : trimmed/);
  assert.doesNotMatch(card, /<FlowIcon name="settings"/);
});

test("FlowIcon exposes automatic PRND and manual H-pattern artwork", () => {
  for (const name of ["transmissionAutomatic", "transmissionManual"]) {
    assert.match(iconTypes, new RegExp(`"${name}"`));
    assert.match(icon, new RegExp(`${name}:`));
  }
  assert.match(icon, />P<.*>R<.*>N<.*>D</s);
  assert.match(icon, />R<.*>1<.*>3<.*>2<.*>4</s);
});

test("representative catalogue transmission values remain authoritative", () => {
  const fiat = catalogue.slice(catalogue.indexOf('modelName: "Fiat 500"'), catalogue.indexOf('modelName: "Fiat 500"') + 500);
  const vClass = catalogue.slice(catalogue.indexOf('modelName: "Mercedes-Benz V-Class"'), catalogue.indexOf('modelName: "Mercedes-Benz V-Class"') + 500);
  assert.match(fiat, /transmission: "manual"/);
  assert.match(vClass, /transmission: "automatic"/);
});
