import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { RegionProvider, useRegion } = await jiti.import<typeof import("./RegionProvider")>("./RegionProvider.tsx");

function Selection() {
  const { mode, selectedCurrency } = useRegion();
  return createElement("span", null, `${mode}/${selectedCurrency}`);
}

test("first region render matches server props even with different browser storage", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const render = () => renderToStaticMarkup(createElement(RegionProvider, {
    initialMode: "US", detectedMode: "US",
  }, createElement(Selection)));
  try {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
    const server = render();
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (key: string) => key.includes("currency") ? "JPY" : "JP" } } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "" } });
    assert.equal(server, "<span>US/USD</span>");
    assert.equal(render(), server);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else Reflect.deleteProperty(globalThis, "window");
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor); else Reflect.deleteProperty(globalThis, "document");
  }
});
