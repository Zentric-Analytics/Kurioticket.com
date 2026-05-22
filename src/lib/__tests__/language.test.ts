import test from "node:test";
import assert from "node:assert/strict";

import { languageOptions, normalizeLanguage, applyLanguageToDocument, setLanguageInStorage, getLanguageFromStorage } from "@/lib/language";

type StorageLike = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
type WindowLike = { localStorage: StorageLike; dispatchEvent: (event: Event) => boolean };
type DocumentLike = { documentElement: { lang: string; dir: string } };

test("all supported locales render", () => {
  assert.equal(languageOptions.length, 40);
});

test("search filters by label and code", () => {
  const filtered = languageOptions.filter((o) => o.label.toLowerCase().includes("português") || o.code.includes("pt-br"));
  assert.ok(filtered.some((o) => o.code === "pt-br"));
});

test("selected locale persists", () => {
  const store = new Map<string, string>();
  const windowMock: WindowLike = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    dispatchEvent: () => true,
  };
  const documentMock: DocumentLike = { documentElement: { lang: "", dir: "ltr" } };
  Object.defineProperty(globalThis, "window", { value: windowMock, configurable: true });
  Object.defineProperty(globalThis, "document", { value: documentMock, configurable: true });

  setLanguageInStorage("fr");
  assert.equal(getLanguageFromStorage(), "fr");
});

test("rtl locales set document direction", () => {
  const documentMock: DocumentLike = { documentElement: { lang: "", dir: "ltr" } };
  Object.defineProperty(globalThis, "document", { value: documentMock, configurable: true });
  applyLanguageToDocument("ar");
  assert.equal(documentMock.documentElement.dir, "rtl");
});

test("unknown locales fallback to english", () => {
  assert.equal(normalizeLanguage("xx-yy"), "en-us");
});
