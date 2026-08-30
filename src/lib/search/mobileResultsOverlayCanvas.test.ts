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
  const attributes = new Map<string, string>();
  const styleProperties = new Map<string, string>();
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
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      style: {
        getPropertyValue: (name: string) => styleProperties.get(name) ?? "",
        setProperty: (name: string, value: string) =>
          styleProperties.set(name, value),
        removeProperty: (name: string) => styleProperties.delete(name),
      },
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
    styleProperties,
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
    assert.equal(
      fixture.styleProperties.get("--mobile-results-overlay-active-canvas"),
      MOBILE_RESULTS_OVERLAY_CANVAS_COLOR,
    );
    release();
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), false);
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
    assert.equal(
      fixture.styleProperties.has("--mobile-results-overlay-active-canvas"),
      false,
    );
  } finally {
    fixture.restore();
  }
});

test("white canvas override controls the theme and root canvas", () => {
  const fixture = installDocument("#abcdef");
  try {
    const release = acquireMobileResultsOverlayCanvas({ canvasColor: "#ffffff" });
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
    assert.equal(
      fixture.styleProperties.get("--mobile-results-overlay-active-canvas"),
      "#ffffff",
    );
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    release();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#abcdef");
    assert.equal(
      fixture.styleProperties.has("--mobile-results-overlay-active-canvas"),
      false,
    );
  } finally {
    fixture.restore();
  }
});

test("restores the exact original inline active canvas value", () => {
  const fixture = installDocument("#abcdef");
  fixture.styleProperties.set(
    "--mobile-results-overlay-active-canvas",
    "  #123456",
  );
  try {
    const release = acquireMobileResultsOverlayCanvas({ canvasColor: "#ffffff" });
    assert.equal(
      fixture.styleProperties.get("--mobile-results-overlay-active-canvas"),
      "#ffffff",
    );
    release();
    assert.equal(
      fixture.styleProperties.get("--mobile-results-overlay-active-canvas"),
      "  #123456",
    );
  } finally {
    fixture.restore();
  }
});

test("the latest active owner deterministically owns the canvas color", () => {
  const fixture = installDocument("#abcdef");
  try {
    const releaseFirst = acquireMobileResultsOverlayCanvas({
      canvasColor: "#123456",
    });
    const releaseSecond = acquireMobileResultsOverlayCanvas({
      canvasColor: "#ffffff",
    });
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
    assert.equal(
      fixture.styleProperties.get("--mobile-results-overlay-active-canvas"),
      "#ffffff",
    );
    releaseFirst();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
    releaseSecond();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#abcdef");
  } finally {
    fixture.restore();
  }
});

test("releasing the latest owner restores the preceding active owner", () => {
  const fixture = installDocument("#abcdef");
  try {
    const releaseFirst = acquireMobileResultsOverlayCanvas({ canvasColor: "#123456" });
    const releaseSecond = acquireMobileResultsOverlayCanvas({ canvasColor: "#ffffff" });
    releaseSecond();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#123456");
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    releaseFirst();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#abcdef");
  } finally {
    fixture.restore();
  }
});

test("Strict Mode acquire release acquire restores only after the live owner closes", () => {
  const fixture = installDocument("#ffffff");
  try {
    const releaseSetup = acquireMobileResultsOverlayCanvas();
    releaseSetup();
    const releaseRemount = acquireMobileResultsOverlayCanvas();
    assert.equal(fixture.existingMeta?.getAttribute("content"), MOBILE_RESULTS_OVERLAY_CANVAS_COLOR);
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    releaseSetup();
    assert.equal(fixture.attributes.has("data-mobile-results-overlay-open"), true);
    releaseRemount();
    assert.equal(fixture.existingMeta?.getAttribute("content"), "#ffffff");
  } finally {
    fixture.restore();
  }
});

test("restores a pre-existing root marker and custom canvas exactly", () => {
  const fixture = installDocument("#ffffff");
  fixture.attributes.set("data-mobile-results-overlay-open", "existing");
  fixture.styleProperties.set("--mobile-results-overlay-active-canvas", "  #112233");
  try {
    const release = acquireMobileResultsOverlayCanvas();
    release();
    assert.equal(fixture.attributes.get("data-mobile-results-overlay-open"), "existing");
    assert.equal(fixture.styleProperties.get("--mobile-results-overlay-active-canvas"), "  #112233");
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
