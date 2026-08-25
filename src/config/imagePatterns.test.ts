import assert from "node:assert/strict";
import test from "node:test";

import { imageRemotePatterns, matchesImagePattern } from "./imagePatterns";

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
