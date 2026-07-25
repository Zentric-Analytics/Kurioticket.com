import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync(new URL("./CarDetailsHero.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../CarDetailsClient.tsx", import.meta.url), "utf8");

test("the hero presents both actual offer benefit states in separate cards", () => {
  assert.match(hero, /offer\.taxesAndFeesIncluded \? text\.included : text\.notIncluded/);
  assert.match(hero, /offer\.freeCancellation \? text\.freeCancellation : text\.nonRefundable/);
  assert.match(hero, /benefits\.map/);
  assert.match(hero, /rounded-xl border border-slate-200 bg-slate-50 p-3/);
  assert.match(hero, /ReceiptText/);
  assert.match(hero, /ShieldCheck/);
  assert.match(hero, /aria-hidden="true"/);
});

test("the hero omits benefit cards safely when no valid offer exists", () => {
  assert.match(hero, /if \(!offer\) return null/);
  assert.match(hero, /offer\?: CarOffer/);
});

test("car details passes the selected primary offer and localized benefit copy to the hero", () => {
  assert.match(client, /const primaryOffer = getPrimaryCarOffer\(car\)/);
  assert.match(client, /<CarDetailsHero car=\{car\} offer=\{primaryOffer\} text=\{text\} \/>/);
  for (const key of ["taxesFees", "includedShort", "notIncluded", "cancellation", "freeCancellation", "nonRefundable"]) {
    assert.match(client, new RegExp(`copy\\("carDetails\\.${key}"\\)`));
  }
});

test("booking summary removes cancellation and taxes while retaining payment", () => {
  const summary = client.slice(client.indexOf("function BookingSummary"), client.indexOf("function MobileBar"));
  assert.match(summary, /carDetails\.payment/);
  assert.doesNotMatch(summary, /carDetails\.cancellation/);
  assert.doesNotMatch(summary, /carDetails\.taxesFees/);
});
