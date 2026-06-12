import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLanguageToDocument,
  getLanguageFromStorage,
  languageOptions,
  normalizeLanguage,
  setLanguageInStorage,
} from "@/lib/language";
import { translations as enTranslations } from "@/lib/i18n/en";
import { translations as esTranslations } from "@/lib/i18n/es";

type StorageLike = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
type WindowLike = { localStorage: StorageLike; dispatchEvent: (event: Event) => boolean };
type DocumentLike = { documentElement: { lang: string; dir: string } };

test("global language catalog renders", () => {
  assert.equal(languageOptions.length, 18);
  assert.ok(languageOptions.some((o) => o.locale === "en-US" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.locale === "es-ES" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "fr" && o.locale === "fr" && o.nativeLabel === "Français" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.locale === "ar" && o.direction === "rtl"));
});

test("search filters by native label and canonical locale", () => {
  const filtered = languageOptions.filter(
    (o) =>
      o.nativeLabel.toLowerCase().includes("português") ||
      o.locale.toLowerCase() === "pt-br"
  );

  assert.ok(filtered.some((o) => o.code === "pt-br"));
});

test("selected available Spanish and French locales persist and update document language", () => {
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

  setLanguageInStorage("es-ES");
  assert.equal(getLanguageFromStorage(), "es-es");
  assert.equal(documentMock.documentElement.lang, "es-ES");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("en-US");
  assert.equal(getLanguageFromStorage(), "en-us");
  assert.equal(documentMock.documentElement.lang, "en-US");

  setLanguageInStorage("fr");
  assert.equal(getLanguageFromStorage(), "fr");
  assert.equal(documentMock.documentElement.lang, "fr");
  assert.equal(documentMock.documentElement.dir, "ltr");
});

test("preparing locales are not persisted as selected", () => {
  const store = new Map<string, string>();
  const windowMock: WindowLike = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    dispatchEvent: () => true,
  };
  Object.defineProperty(globalThis, "window", { value: windowMock, configurable: true });

  setLanguageInStorage("de-DE");
  assert.equal(getLanguageFromStorage(), "en-us");

  setLanguageInStorage("es-ES");
  setLanguageInStorage("de-DE");
  assert.equal(getLanguageFromStorage(), "en-us");
});

test("document language remains english for unavailable rtl locales", () => {
  const documentMock: DocumentLike = { documentElement: { lang: "", dir: "ltr" } };
  Object.defineProperty(globalThis, "document", { value: documentMock, configurable: true });
  applyLanguageToDocument("ar");
  assert.equal(documentMock.documentElement.lang, "en-US");
  assert.equal(documentMock.documentElement.dir, "ltr");
});

test("unknown locales fallback to english", () => {
  assert.equal(normalizeLanguage("xx-yy"), "en-us");
});

test("Spanish dictionary shape matches English dictionary shape", () => {
  assert.deepEqual(
    Object.keys(esTranslations).sort(),
    Object.keys(enTranslations).sort()
  );
  assert.equal(esTranslations.flights, "Vuelos");
  assert.equal(esTranslations.search, "Buscar");
});
