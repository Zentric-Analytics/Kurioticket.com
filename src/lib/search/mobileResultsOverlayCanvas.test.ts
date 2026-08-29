import assert from "node:assert/strict";
import test from "node:test";

import {
  acquireMobileResultsOverlayCanvas,
  MOBILE_RESULTS_OVERLAY_CANVAS_COLOR,
} from "./mobileResultsOverlayCanvas";

class FakeMeta {
  readonly attributes = new Map<string, string>();
  isConnected = false;

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  remove() {
    this.isConnected = false;
  }
}

function installDocument(themeColor?: string) {
  const attributes = new Set<string>();
  const metas: FakeMeta[] = [];
  const existingMeta = themeColor === undefined ? null : new FakeMeta();
  if (existingMeta) {
    existingMeta.setAttribute("name", "theme-color");
    existingMeta.setAttribute("content", themeColor);
    existingMeta.isConnected = true;
    metas.push(existingMeta);
  }

  const fakeDocument = {
    documentElement: {
      setAttribute: (name: string) => attributes.add(name),
      removeAttribute: (name: string) => attributes.delete(name),
    },
    head: {
      appendChild: (meta: FakeMeta) => {
        meta.isConnected = true;
        metas.push(meta);
      },
    },
    createElement: () => new FakeMeta(),
    querySelector: (selector: string) =>
      metas.find(
        (meta) =>
          meta.isConnected &&
          (selector === 'meta[name="theme-color"]'
            ? meta.getAttribute("name") === "theme-color"
            : meta.getAttribute("data-mobile-results-overlay-theme") !== null),
      ) ?? null,
    querySelectorAll: (selector: string) =>
      metas.filter(
        (meta) =>
          meta.isConnected &&
          selector === "meta[data-mobile-results-overlay-theme]" &&
          meta.getAttribute("data-mobile-results-overlay-theme") !== null,
      ),
  };
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: fakeDocument,
  });

  return {
    attributes,
    existingMeta,
    themeMetas: () =>
      metas.filter(
        (meta) => meta.isConnected && meta.getAttribute("name") === "theme-color",
      ),
    restore: () => {
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else Reflect.deleteProperty(globalThis, "document");
    },
  };
}

test("existing white theme is temporarily dimmed and restored", () => {
  const fixture = installDocument("#ffffff");
  try {
    const release = acquireMobileResultsOverlayCanvas();
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    assert.equal(fixture.existingMeta?.getAttribute("content"), MOBILE_RESULTS_OVERLAY_CANVAS_COLOR);
    release();
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), false);
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
  } finally {
    fixture.restore();
  }
});

test("restores a non-white original theme exactly", () => {
  const fixture = installDocument("#123456");
  try {
    const release = acquireMobileResultsOverlayCanvas();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#a6a8ae");
    release();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#123456");
  } finally {
    fixture.restore();
  }
});

test("theme and root marker remain owned until the final release", () => {
  const fixture = installDocument("#ffffff");
  try {
    const releaseFirst = acquireMobileResultsOverlayCanvas();
    const releaseSecond = acquireMobileResultsOverlayCanvas();
    releaseFirst();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#a6a8ae");
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    releaseSecond();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), false);
  } finally {
    fixture.restore();
  }
});

test("release callback is idempotent", () => {
  const fixture = installDocument("#123456");
  try {
    const release = acquireMobileResultsOverlayCanvas();
    release();
    release();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#123456");
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), false);
  } finally {
    fixture.restore();
  }
});

test("creates one temporary theme meta for nested owners and removes it finally", () => {
  const fixture = installDocument();
  try {
    const releaseFirst = acquireMobileResultsOverlayCanvas();
    const releaseSecond = acquireMobileResultsOverlayCanvas();
    assert.equal(fixture.themeMetas().length, 1);
    assert.equal(fixture.themeMetas()[0]?.getAttribute("content"), "#a6a8ae");
    assert.equal(
      fixture.themeMetas()[0]?.getAttribute("data-mobile-results-overlay-theme"),
      "",
    );
    releaseFirst();
    assert.equal(fixture.themeMetas().length, 1);
    releaseSecond();
    assert.equal(fixture.themeMetas().length, 0);
  } finally {
    fixture.restore();
  }
});
