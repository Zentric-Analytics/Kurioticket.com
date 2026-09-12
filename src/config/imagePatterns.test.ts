import assert from "node:assert/strict";
import test from "node:test";

import { imageLocalPatterns, imageRemotePatterns, matchesImagePattern } from "./imagePatterns";
import { resolveCarResultImageSource } from "../lib/cars/carResultImage";

test("Next Image accepts the current curated car image version without allowing arbitrary queries", () => {
  const source = resolveCarResultImageSource("/images/cars/results/toyota-yaris.webp");
  assert.ok(source);
  const allowed = (path: string) => imageLocalPatterns.some((pattern) =>
    matchesImagePattern(new URL(path, "https://example.test"), pattern));
  assert.equal(allowed(source), true);
  assert.equal(allowed(`${source}&unexpected=1`), false);
  assert.equal(allowed("/images/cars/results/toyota-yaris.webp?v=unknown"), false);
  assert.equal(allowed(source.replace("/cars/results/", "/other/")), false);
});

function isAllowedRemoteImage(value: string) {
  const url = new URL(value);
  return imageRemotePatterns.some((pattern) => matchesImagePattern(url, pattern));
}

test("Next Image accepts Duffel airline logo asset namespaces", () => {
  assert.equal(
    isAllowedRemoteImage("https://assets.duffel.com/airlines/BA.svg"),
    true,
  );
  assert.equal(
    isAllowedRemoteImage(
      "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/BA.svg",
    ),
    true,
  );
});

test("Duffel image access remains restricted to exact HTTPS airline assets", () => {
  for (const rejectedUrl of [
    "http://assets.duffel.com/airlines/BA.svg",
    "https://assets.duffel.com/airlines/BA.svg?redirect=other",
    "https://assets.duffel.com/documents/ticket.pdf",
    "https://api.duffel.com/airlines/BA.svg",
    "https://assets.duffel.com.evil.example/airlines/BA.svg",
    "https://unrelated.example/airlines/BA.svg",
  ]) {
    assert.equal(isAllowedRemoteImage(rejectedUrl), false, rejectedUrl);
  }
});
