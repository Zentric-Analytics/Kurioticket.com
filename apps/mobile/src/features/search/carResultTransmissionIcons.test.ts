import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const card = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const icon = readFileSync(resolve("src/features/flow/FlowIcon.tsx"), "utf8");
const iconTypes = readFileSync(resolve("src/features/flow/flowIconTypes.ts"), "utf8");
const catalogue = readFileSync(resolve("../../src/services/travel/staticCarCatalogue.ts"), "utf8");

test("canonical transmission selects an original automotive FlowIcon", () => {
  assert.match(card, /result\.transmission === "automatic" \? "transmissionAutomatic" : "transmissionManual"/);
  assert.match(card, /<FlowIcon name=\{transmissionIcon\} size=\{14\} color="#64748B" \/>.*capitalize\(result\.transmission\)/);
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
