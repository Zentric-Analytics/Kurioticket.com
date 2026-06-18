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
import { translations as deTranslations } from "@/lib/i18n/de";
import { translations as frTranslations } from "@/lib/i18n/fr";
import { translations as itTranslations } from "@/lib/i18n/it";
import { translations as ptBrTranslations } from "@/lib/i18n/pt-br";
import { translations as nlTranslations } from "@/lib/i18n/nl";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";

type StorageLike = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
type WindowLike = { localStorage: StorageLike; dispatchEvent: (event: Event) => boolean };
type DocumentLike = { documentElement: { lang: string; dir: string } };

test("global language catalog renders", () => {
  assert.equal(languageOptions.length, 18);
  assert.ok(languageOptions.some((o) => o.locale === "en-US" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.locale === "es-ES" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "fr" && o.locale === "fr" && o.nativeLabel === "Français" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "de-de" && o.locale === "de-DE" && o.nativeLabel === "Deutsch" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "pt-br" && o.locale === "pt-BR" && o.nativeLabel === "Português" && o.status === "available"));
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

test("selected available Spanish, French, German, Italian, Dutch, and Portuguese locales persist and update document language", () => {
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

  setLanguageInStorage("de-DE");
  assert.equal(getLanguageFromStorage(), "de-de");
  assert.equal(documentMock.documentElement.lang, "de-DE");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("it-IT");
  assert.equal(getLanguageFromStorage(), "it-it");
  assert.equal(documentMock.documentElement.lang, "it-IT");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("nl-NL");
  assert.equal(getLanguageFromStorage(), "nl");
  assert.equal(documentMock.documentElement.lang, "nl-NL");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("pt-BR");
  assert.equal(getLanguageFromStorage(), "pt-br");
  assert.equal(documentMock.documentElement.lang, "pt-BR");
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

  setLanguageInStorage("ar");
  assert.equal(getLanguageFromStorage(), "en-us");

  setLanguageInStorage("es-ES");
  setLanguageInStorage("ar");
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

test("German, Italian, Dutch, and Portuguese shorthand locales normalize to available options", () => {
  assert.equal(normalizeLanguage("de"), "de-de");
  assert.equal(normalizeLanguage("it"), "it-it");
  assert.equal(normalizeLanguage("it-IT"), "it-it");
  assert.equal(normalizeLanguage("nl"), "nl");
  assert.equal(normalizeLanguage("nl-NL"), "nl");
  assert.equal(normalizeLanguage("pt"), "pt-br");
  assert.equal(normalizeLanguage("pt-BR"), "pt-br");
  assert.equal(normalizeLanguage("pt-br"), "pt-br");
});

test("available locale options keep Dutch and Portuguese available and other preparing locales unavailable", () => {
  assert.ok(availableLocaleOptions.some((option) => option.code === "pt-br"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "nl"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "pt-br"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "nl"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.status === "preparing"));
});

test("Dutch and Portuguese dictionaries resolve through getTranslations", () => {
  assert.equal(getTranslations("nl").currentLanguage, "Huidige taal: {{language}}");
  assert.equal(getTranslations("nl-NL").globalLanguage, "GLOBALE TAAL");
  assert.equal(nlTranslations.websiteLanguageTitle, "Kies de taal van de site");
  assert.equal(getTranslations("pt").currentLanguage, "Idioma atual: {{language}}");
  assert.equal(getTranslations("pt-BR").globalLanguage, "Idioma global");
  assert.equal(getTranslations("pt-br").languageSearchLabel, "Pesquisar idioma");
  assert.equal(ptBrTranslations.websiteLanguageTitle, "Escolha o idioma do site");
});

test("Spanish, French, German, Italian, Dutch, and Portuguese dictionary shapes match English dictionary shape", () => {
  const englishKeys = Object.keys(enTranslations).sort();
  assert.deepEqual(
    englishKeys.filter((key) => !(key in esTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in deTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in frTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in itTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in ptBrTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in nlTranslations)),
    []
  );
  assert.equal(esTranslations.flights, "Vuelos");
  assert.equal(esTranslations.search, "Buscar");
  assert.equal(deTranslations.flights, "Flüge");
  assert.equal(deTranslations.search, "Suchen");
  assert.equal(getTranslations("de-DE").flights, "Flüge");
  assert.equal(getTranslations("fr").flights, frTranslations.flights);
  assert.equal(getTranslations("it-IT").flights, itTranslations.flights);
  assert.equal(getTranslations("pt-BR").websiteLanguageTitle, "Escolha o idioma do site");
  assert.equal(getTranslations("nl").viewDetails, "Details bekijken");
});


test("active locale dictionaries do not keep audited cross-language UI fallbacks", () => {
  const auditedValuesByLocale = {
    english: {
      flights: enTranslations.flights,
      hotels: enTranslations.hotels,
      cars: enTranslations.cars,
      deals: enTranslations.deals,
      saved: enTranslations.saved,
    },
    spanish: {
      legal: esTranslations.legal,
      selectedFlightCabinBusiness: esTranslations.selectedFlightCabinBusiness,
    },
    french: {
      destinations: frTranslations.destinations,
      destination: frTranslations.destination,
      hotelSearchDestinationLabel: frTranslations.hotelSearchDestinationLabel,
    },
    german: {
      hotels: deTranslations.hotels,
      support: deTranslations.support,
      economy: deTranslations.economy,
      business: deTranslations.business,
      first: deTranslations.first,
      nonstop: deTranslations.nonstop,
      priceAlertHotel: deTranslations["accountDashboard.priceAlerts.alertType.hotel"],
      supportTitle: deTranslations["accountDashboard.support.title"],
    },
    italian: {
      menu: itTranslations.menu,
      account: itTranslations.account,
      dashboard: itTranslations.dashboard,
      signupEmailLabel: itTranslations.signupEmailLabel,
      signupPasswordLabel: itTranslations.signupPasswordLabel,
      selectedFlightCabinBusiness: itTranslations.selectedFlightCabinBusiness,
      footerPrivacy: itTranslations.footerPrivacy,
      premiumEconomy: itTranslations.premiumEconomy,
    },
    dutch: {
      viewDetails: nlTranslations.viewDetails,
      homeHeroBadge: nlTranslations.homeHeroBadge,
      signIn: nlTranslations.signIn,
    },
    portugueseBrazil: {
      cars: ptBrTranslations.cars,
      flights: ptBrTranslations.flights,
      search: ptBrTranslations.search,
    },
  };

  assert.deepEqual(auditedValuesByLocale.english, {
    flights: "Flights",
    hotels: "Hotels",
    cars: "Cars",
    deals: "Deals",
    saved: "Saved",
  });
  assert.deepEqual(auditedValuesByLocale.spanish, {
    legal: "Información legal",
    selectedFlightCabinBusiness: "Clase ejecutiva",
  });
  assert.deepEqual(auditedValuesByLocale.french, {
    destinations: "Voyages",
    destination: "Lieu d’arrivée",
    hotelSearchDestinationLabel: "Lieu de séjour",
  });
  assert.deepEqual(auditedValuesByLocale.german, {
    hotels: "Unterkünfte",
    support: "Hilfe",
    economy: "Touristenklasse",
    business: "Geschäftsklasse",
    first: "Erste Klasse",
    nonstop: "Direktflug",
    priceAlertHotel: "Unterkunft",
    supportTitle: "Hilfe",
  });
  assert.deepEqual(auditedValuesByLocale.italian, {
    menu: "Menù",
    account: "Profilo",
    dashboard: "Pannello",
    signupEmailLabel: "E-mail",
    signupPasswordLabel: "Parola d’accesso",
    selectedFlightCabinBusiness: "Classe affari",
    footerPrivacy: "Riservatezza",
    premiumEconomy: "Economica premium",
  });
  assert.deepEqual(auditedValuesByLocale.dutch, {
    viewDetails: "Details bekijken",
    homeHeroBadge: "Betrouwbaar platform voor reiszoekopdrachten",
    signIn: "Inloggen",
  });
  assert.deepEqual(auditedValuesByLocale.portugueseBrazil, {
    cars: "Carros",
    flights: "Voos",
    search: "Pesquisar",
  });
});
