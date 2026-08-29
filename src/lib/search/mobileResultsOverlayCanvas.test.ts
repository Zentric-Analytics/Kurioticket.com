import assert from "node:assert/strict";
import test from "node:test";

import { acquireMobileResultsOverlayCanvas } from "./mobileResultsOverlayCanvas";

test("Results overlay canvas marker is reference counted", () => {
  const attributes = new Set<string>();
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        setAttribute: (name: string) => attributes.add(name),
        removeAttribute: (name: string) => attributes.delete(name),
      },
    },
  });

  try {
    const releaseFirst = acquireMobileResultsOverlayCanvas();
    assert.equal(attributes.has("data-mobile-results-overlay-open"), true);
    const releaseSecond = acquireMobileResultsOverlayCanvas();
    releaseFirst();
    assert.equal(attributes.has("data-mobile-results-overlay-open"), true);
    releaseSecond();
    assert.equal(attributes.has("data-mobile-results-overlay-open"), false);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
