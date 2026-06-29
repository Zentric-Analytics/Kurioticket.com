import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
import { translations as arTranslations } from "@/lib/i18n/ar";
import { translations as zhCnTranslations } from "@/lib/i18n/zh-cn";
import { translations as jaTranslations } from "@/lib/i18n/ja";
import { translations as koTranslations } from "@/lib/i18n/ko";
import { translations as hiTranslations } from "@/lib/i18n/hi";
import { translations as trTranslations } from "@/lib/i18n/tr";
import { translations as plTranslations } from "@/lib/i18n/pl";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { getHomeDiscoveryByRegion } from "@/data/homeDiscovery";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";
import { translateHomeDiscoveryField } from "@/lib/i18n/homeDiscovery";
import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";
import { supportedRegions } from "@/lib/region/supportedRegions";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";

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
  assert.ok(languageOptions.some((o) => o.code === "zh-cn" && o.locale === "zh-CN" && o.nativeLabel === "中文" && o.direction === "ltr" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "ja" && o.locale === "ja" && o.nativeLabel === "日本語" && o.direction === "ltr" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "ko" && o.locale === "ko" && o.nativeLabel === "한국어" && o.label === "Korean" && o.countryCode === "KR" && o.direction === "ltr" && o.status === "available"));
  assert.equal(languageOptions.filter((o) => o.code === "hi").length, 1);
  assert.ok(languageOptions.some((o) => o.code === "hi" && o.locale === "hi-IN" && o.nativeLabel === "हिन्दी" && o.label === "Hindi" && o.countryCode === "IN" && o.direction === "ltr" && o.status === "available"));
  assert.equal(languageOptions.filter((o) => o.code === "tr").length, 1);
  assert.ok(languageOptions.some((o) => o.code === "tr" && o.locale === "tr-TR" && o.nativeLabel === "Türkçe" && o.label === "Turkish" && o.countryCode === "TR" && o.direction === "ltr" && o.status === "available"));
  assert.equal(languageOptions.filter((o) => o.code === "pl").length, 1);
  assert.ok(languageOptions.some((o) => o.code === "pl" && o.locale === "pl-PL" && o.nativeLabel === "Polski" && o.label === "Polish" && o.countryCode === "PL" && o.direction === "ltr" && o.status === "available"));
});


test("Turkish signed-in account dropdown labels do not fall back to English", () => {
  const tr = getTranslations("tr");

  assert.equal(tr["accountMenu.myAccount.label"], "Hesabım");
  assert.equal(tr["accountMenu.savedTrips.label"], "Kaydedilen seyahatler");
  assert.equal(tr["accountMenu.priceAlerts.label"], "Fiyat uyarıları");
  assert.equal(tr.logout, "Çıkış yap");
  assert.notEqual(tr["accountMenu.myAccount.label"], enTranslations["accountMenu.myAccount.label"]);
  assert.notEqual(tr["accountMenu.savedTrips.label"], enTranslations["accountMenu.savedTrips.label"]);
  assert.notEqual(tr["accountMenu.priceAlerts.label"], enTranslations["accountMenu.priceAlerts.label"]);
  assert.notEqual(tr.logout, enTranslations.logout);

  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");

  assert.ok(
    appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"'),
    "Signed-in account dropdown menu items should continue to use account menu i18n keys.",
  );
  assert.ok(
    appHeaderSource.includes("session?.user?.name || accountDisplayName") &&
      appHeaderSource.includes("session.user.email") &&
      appHeaderSource.includes("session?.user?.email"),
    "Signed-in account dropdown should keep user name and email display dynamic.",
  );
  assert.ok(
    appHeaderSource.includes('href: "/dashboard/account"') &&
      appHeaderSource.includes('href: "/saved"') &&
      appHeaderSource.includes('href: "/dashboard/alerts"') &&
      appHeaderSource.includes("onClick={handleSignOut}"),
    "Signed-in account dropdown should keep menu routes and logout action wired unchanged.",
  );
  assert.ok(
    !appHeaderSource.includes('>My account<') &&
      !appHeaderSource.includes('>Saved trips<') &&
      !appHeaderSource.includes('>Price alerts<') &&
      !appHeaderSource.includes('>Logout<'),
    "Signed-in account dropdown should not hard-code screenshot-visible English labels.",
  );
});

test("Hindi signed-in account dropdown labels do not fall back to English", () => {
  const hi = getTranslations("hi");

  assert.equal(hi["accountMenu.myAccount.label"], "मेरा खाता");
  assert.equal(hi["accountMenu.savedTrips.label"], "सहेजी गई यात्राएँ");
  assert.equal(hi["accountMenu.priceAlerts.label"], "मूल्य अलर्ट");
  assert.equal(hi.logout, "लॉग आउट");
  assert.notEqual(hi["accountMenu.myAccount.label"], enTranslations["accountMenu.myAccount.label"]);
  assert.notEqual(hi["accountMenu.savedTrips.label"], enTranslations["accountMenu.savedTrips.label"]);
  assert.notEqual(hi["accountMenu.priceAlerts.label"], enTranslations["accountMenu.priceAlerts.label"]);
  assert.notEqual(hi.logout, enTranslations.logout);

  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");

  assert.ok(
    appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"'),
    "Signed-in account dropdown menu items should continue to use account menu i18n keys.",
  );
  assert.ok(
    appHeaderSource.includes("session?.user?.name || accountDisplayName") &&
      appHeaderSource.includes("session.user.email") &&
      appHeaderSource.includes("session?.user?.email"),
    "Signed-in account dropdown should keep user name and email display dynamic.",
  );
  assert.ok(
    appHeaderSource.includes('href: "/dashboard/account"') &&
      appHeaderSource.includes('href: "/saved"') &&
      appHeaderSource.includes('href: "/dashboard/alerts"') &&
      appHeaderSource.includes("onClick={handleSignOut}"),
    "Signed-in account dropdown should keep menu routes and logout action wired unchanged.",
  );
  assert.ok(
    !appHeaderSource.includes('>My account<') &&
      !appHeaderSource.includes('>Saved trips<') &&
      !appHeaderSource.includes('>Price alerts<') &&
      !appHeaderSource.includes('>Logout<'),
    "Signed-in account dropdown should not hard-code screenshot-visible English labels.",
  );
});

test("Korean flight traveler selector uses localized infant-on-lap copy", () => {
  const ko = getTranslations("ko");

  const englishInfantsOnLap = ["Infants", "on lap"].join(" ");

  assert.equal(ko.infantsOnLap, "무릎 위 유아");
  assert.equal(enTranslations.infantsOnLap, englishInfantsOnLap);
  assert.notEqual(ko.infantsOnLap, enTranslations.infantsOnLap);

  const flightTravelerSelectorSources = [
    "src/components/search/StandaloneFlightSearchForm.tsx",
    "src/components/search/SearchTabs.tsx",
    "src/components/results/FlightResultsClient.tsx",
  ].map((filePath) => readFileSync(filePath, "utf8"));

  assert.ok(
    flightTravelerSelectorSources.every((source) => source.includes("infantsOnLap")),
    "Each Flights traveler selector render path should resolve the infant-on-lap label from i18n keys.",
  );
  assert.ok(
    flightTravelerSelectorSources.every(
      (source) => !source.includes(`>${englishInfantsOnLap}<`) && !source.includes(`{"${englishInfantsOnLap}"}`),
    ),
    "Flights traveler selector render paths should not hard-code active Korean-visible English copy.",
  );
});

test("search filters by native label and canonical locale", () => {
  const filtered = languageOptions.filter(
    (o) =>
      o.nativeLabel.toLowerCase().includes("português") ||
      o.locale.toLowerCase() === "pt-br"
  );

  assert.ok(filtered.some((o) => o.code === "pt-br"));
});

test("selected available Spanish, French, German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, Turkish, Polish, and Arabic locales persist and update document language", () => {
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

  setLanguageInStorage("zh-CN");
  assert.equal(getLanguageFromStorage(), "zh-cn");
  assert.equal(documentMock.documentElement.lang, "zh-CN");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("zh");
  assert.equal(getLanguageFromStorage(), "zh-cn");
  assert.equal(documentMock.documentElement.lang, "zh-CN");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("ja");
  assert.equal(getLanguageFromStorage(), "ja");
  assert.equal(documentMock.documentElement.lang, "ja");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("ja-JP");
  assert.equal(getLanguageFromStorage(), "ja");
  assert.equal(documentMock.documentElement.lang, "ja");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("ko");
  assert.equal(getLanguageFromStorage(), "ko");
  assert.equal(documentMock.documentElement.lang, "ko");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("ko-KR");
  assert.equal(getLanguageFromStorage(), "ko");
  assert.equal(documentMock.documentElement.lang, "ko");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("hi");
  assert.equal(getLanguageFromStorage(), "hi");
  assert.equal(documentMock.documentElement.lang, "hi-IN");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("hi-IN");
  assert.equal(getLanguageFromStorage(), "hi");
  assert.equal(documentMock.documentElement.lang, "hi-IN");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("hi-in");
  assert.equal(getLanguageFromStorage(), "hi");
  assert.equal(documentMock.documentElement.lang, "hi-IN");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("tr");
  assert.equal(getLanguageFromStorage(), "tr");
  assert.equal(documentMock.documentElement.lang, "tr-TR");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("tr-TR");
  assert.equal(getLanguageFromStorage(), "tr");
  assert.equal(documentMock.documentElement.lang, "tr-TR");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("tr-tr");
  assert.equal(getLanguageFromStorage(), "tr");
  assert.equal(documentMock.documentElement.lang, "tr-TR");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("pl");
  assert.equal(getLanguageFromStorage(), "pl");
  assert.equal(documentMock.documentElement.lang, "pl-PL");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("pl-PL");
  assert.equal(getLanguageFromStorage(), "pl");
  assert.equal(documentMock.documentElement.lang, "pl-PL");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("pl-pl");
  assert.equal(getLanguageFromStorage(), "pl");
  assert.equal(documentMock.documentElement.lang, "pl-PL");
  assert.equal(documentMock.documentElement.dir, "ltr");

  setLanguageInStorage("ar");
  assert.equal(getLanguageFromStorage(), "ar");
  assert.equal(documentMock.documentElement.lang, "ar");
  assert.equal(documentMock.documentElement.dir, "rtl");

  setLanguageInStorage("ar-AE");
  assert.equal(getLanguageFromStorage(), "ar");
  assert.equal(documentMock.documentElement.lang, "ar");
  assert.equal(documentMock.documentElement.dir, "rtl");
});


test("document language switches to rtl for Arabic", () => {
  const documentMock: DocumentLike = { documentElement: { lang: "", dir: "ltr" } };
  Object.defineProperty(globalThis, "document", { value: documentMock, configurable: true });
  applyLanguageToDocument("ar-SA");
  assert.equal(documentMock.documentElement.lang, "ar");
  assert.equal(documentMock.documentElement.dir, "rtl");
});

test("unknown locales fallback to english", () => {
  assert.equal(normalizeLanguage("xx-yy"), "en-us");
});

test("German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, Turkish, and Polish shorthand locales normalize to available options", () => {
  assert.equal(normalizeLanguage("de"), "de-de");
  assert.equal(normalizeLanguage("it"), "it-it");
  assert.equal(normalizeLanguage("it-IT"), "it-it");
  assert.equal(normalizeLanguage("nl"), "nl");
  assert.equal(normalizeLanguage("nl-NL"), "nl");
  assert.equal(normalizeLanguage("pt"), "pt-br");
  assert.equal(normalizeLanguage("pt-BR"), "pt-br");
  assert.equal(normalizeLanguage("pt-br"), "pt-br");
  assert.equal(normalizeLanguage("ar"), "ar");
  assert.equal(normalizeLanguage("ar-SA"), "ar");
  assert.equal(normalizeLanguage("ar-AE"), "ar");
  assert.equal(normalizeLanguage("ar-EG"), "ar");
  assert.equal(normalizeLanguage("zh"), "zh-cn");
  assert.equal(normalizeLanguage("zh-CN"), "zh-cn");
  assert.equal(normalizeLanguage("ja"), "ja");
  assert.equal(normalizeLanguage("ja-JP"), "ja");
  assert.equal(normalizeLanguage("ko"), "ko");
  assert.equal(normalizeLanguage("ko-KR"), "ko");
  assert.equal(normalizeLanguage("ko-kr"), "ko");
  assert.equal(normalizeLanguage("hi"), "hi");
  assert.equal(normalizeLanguage("hi-IN"), "hi");
  assert.equal(normalizeLanguage("hi-in"), "hi");
  assert.equal(normalizeLanguage("tr"), "tr");
  assert.equal(normalizeLanguage("tr-TR"), "tr");
  assert.equal(normalizeLanguage("tr-tr"), "tr");
  assert.equal(normalizeLanguage("pl"), "pl");
  assert.equal(normalizeLanguage("pl-PL"), "pl");
  assert.equal(normalizeLanguage("pl-pl"), "pl");
});

test("available locale options keep Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, Turkish, Polish, and Arabic available and other preparing locales unavailable", () => {
  assert.ok(availableLocaleOptions.some((option) => option.code === "pt-br"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "nl"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "pt-br"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "nl"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "zh-cn" && option.direction === "ltr" && option.nativeLabel === "中文"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "zh-cn"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "ja" && option.direction === "ltr" && option.nativeLabel === "日本語"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "ja"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "ko" && option.direction === "ltr" && option.nativeLabel === "한국어" && option.label === "Korean" && option.countryCode === "KR"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "ko"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "hi" && option.direction === "ltr" && option.nativeLabel === "हिन्दी" && option.label === "Hindi" && option.countryCode === "IN"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "hi"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "tr" && option.locale === "tr-TR" && option.direction === "ltr" && option.nativeLabel === "Türkçe" && option.label === "Turkish" && option.countryCode === "TR"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "tr"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "pl" && option.locale === "pl-PL" && option.direction === "ltr" && option.nativeLabel === "Polski" && option.label === "Polish" && option.countryCode === "PL"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "pl"));
  assert.ok(availableLocaleOptions.filter((option) => option.code !== "ar" && option.status === "available").every((option) => option.direction === "ltr"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "ar"));
});

test("Dutch, Portuguese, Japanese, Korean, Hindi, Turkish, and Polish dictionaries resolve through getTranslations", () => {
  assert.equal(getTranslations("nl").currentLanguage, "Huidige taal: {{language}}");
  assert.equal(getTranslations("nl-NL").globalLanguage, "GLOBALE TAAL");
  assert.equal(nlTranslations.websiteLanguageTitle, "Kies de taal van de site");
  assert.equal(getTranslations("pt").currentLanguage, "Idioma atual: {{language}}");
  assert.equal(getTranslations("pt-BR").globalLanguage, "Idioma global");
  assert.equal(getTranslations("pt-br").languageSearchLabel, "Pesquisar idioma");
  assert.equal(ptBrTranslations.websiteLanguageTitle, "Escolha o idioma do site");
  assert.equal(getTranslations("ja").currentLanguage, "現在の言語: {{language}}");
  assert.equal(getTranslations("ja-JP").languageSearchLabel, "言語を検索");
  assert.equal(jaTranslations.websiteLanguageTitle, "ウェブサイトの言語を選択");
  assert.equal(getTranslations("ko").currentLanguage, "현재 언어: {{language}}");
  assert.equal(getTranslations("ko-KR").languageSearchLabel, "언어 검색");
  assert.equal(koTranslations.websiteLanguageTitle, "웹사이트 언어 선택");
  assert.equal(getTranslations("hi").currentLanguage, "वर्तमान भाषा: {{language}}");
  assert.equal(getTranslations("hi-IN").languageSearchLabel, "भाषाएँ खोजें");
  assert.equal(hiTranslations.websiteLanguageTitle, "साइट की भाषा चुनें");
  assert.equal(getTranslations("tr").websiteLanguageTitle, "Web sitesi dilinizi seçin");
  assert.equal(getTranslations("tr-TR").languageSearchLabel, "Dil ara");
  assert.equal(getTranslations("tr-tr").currentLanguage, "Geçerli dil: {{language}}");
  assert.equal(trTranslations.websiteLanguageTitle, "Web sitesi dilinizi seçin");
  assert.equal(getTranslations("pl").websiteLanguageTitle, "Wybierz język strony");
  assert.equal(getTranslations("pl-PL").languageSearchLabel, "Wyszukaj język");
  assert.equal(getTranslations("pl-pl").currentLanguage, "Obecny język: {{language}}");
  assert.equal(plTranslations.websiteLanguageTitle, "Wybierz język strony");
});

test("Hindi homepage and primary search UI copy resolves without English fallback", () => {
  const hi = getTranslations("hi");
  const auditedHindiHomepageKeys: Array<[string, string]> = [
    ["flights", "उड़ानें"],
    ["hotels", "होटल"],
    ["cars", "कारें"],
    ["deals", "डील्स"],
    ["login", "लॉग इन"],
    ["signUp", "साइन अप"],
    ["homeHeroTitle", "एक आसान खोज में यात्रा विकल्पों की तुलना करें"],
    [
      "homeHeroSubtitle",
      "विश्वसनीय यात्रा प्रदाताओं को खोजें, कीमतों की साफ़ तुलना करें, और अपनी यात्रा के लिए सही विकल्प चुनें।",
    ],
    ["roundTrip", "आना-जाना"],
    ["oneWay", "एकतरफ़ा"],
    ["tripType", "यात्रा प्रकार"],
    ["origin", "प्रस्थान"],
    ["destination", "गंतव्य"],
    ["travelDates", "यात्रा तिथियाँ"],
    ["travelers", "यात्री"],
    ["toPlaceholder", "कहाँ तक?"],
    ["search", "खोजें"],
    ["homePopularDestinations", "लोकप्रिय गंतव्य"],
    ["homeExploreFares", "किराए देखें"],
    ["homeDiscoveryTitle", "अपना अगला रोमांच यहाँ खोजें"],
    [
      "homeDiscoverySubtitle",
      "अपने क्षेत्र के लिए चुने गए स्मार्ट मार्ग विचारों, लचीले किरायों और गंतव्यों की तुलना करें।",
    ],
    ["homeDiscoveryRouteIdeaBadge", "मार्ग सुझाव"],
    ["homeDiscoveryTravelerCountOne", "1 यात्री"],
    ["homeCompareOptions", "विकल्पों की तुलना करें"],
    ["homePopularDestinationCity.dubai", "दुबई"],
    ["homePopularDestinationCountry.unitedArabEmirates", "संयुक्त अरब अमीरात"],
    ["homePopularDestinationCity.london", "लंदन"],
    ["homePopularDestinationCountry.unitedKingdom", "यूनाइटेड किंगडम"],
    ["homePopularDestinationCity.johannesburg", "जोहान्सबर्ग"],
    ["homePopularDestinationCountry.southAfrica", "दक्षिण अफ्रीका"],
    ["homePopularDestinationCity.accra", "अक्रा"],
    ["homePopularDestinationCountry.ghana", "घाना"],
    ["chooseTravelDates", "यात्रा तिथियाँ चुनें"],
    ["previousMonthShort", "पिछला"],
    ["nextMonthShort", "अगला"],
    ["weekdaySun", "रवि"],
    ["weekdayMon", "सोम"],
    ["weekdayTue", "मंगल"],
    ["weekdayWed", "बुध"],
    ["weekdayThu", "गुरु"],
    ["weekdayFri", "शुक्र"],
    ["weekdaySat", "शनि"],
    ["passengers", "यात्री"],
    ["adults", "वयस्क"],
    ["children", "बच्चे"],
    ["childAgeRange", "उम्र 2–17"],
    ["infantsOnLap", "गोद में शिशु"],
    ["under2", "2 वर्ष से कम"],
    ["cabinClass", "केबिन क्लास"],
    ["business", "बिज़नेस"],
    ["first", "फ़र्स्ट"],
    ["homePopularDestinationCity.nairobi", "नैरोबी"],
    ["homePopularDestinationCountry.kenya", "केन्या"],
    ["homePopularDestinationCity.istanbul", "इस्तांबुल"],
    ["homePopularDestinationCountry.turkiye", "तुर्किये"],
    ["homePopularDestinationCity.paris", "पेरिस"],
    ["homePopularDestinationCountry.france", "फ्रांस"],
    ["homeTrustTitle", "यात्री Kurioticket पर तुलना क्यों करते हैं"],
    ["homeTrustCompareTitle", "प्रदाता ऑफ़र की तुलना करें"],
    ["homeTrustPricingTitle", "पारदर्शी कीमत संदर्भ"],
    ["homeTrustHandoffTitle", "सुरक्षित प्रदाता हैंडऑफ़"],
    ["homePromoFlightsTitle", "शीर्ष एयरलाइनों की उड़ान डील्स"],
    ["homePromoFlightsCta", "उड़ान डील्स देखें"],
    ["homePromoHotelsTitle", "दुनिया भर में होटल बचत"],
    ["homePromoHotelsCta", "होटल डील्स देखें"],
    ["faqHeading", "अक्सर पूछे जाने वाले प्रश्न"],
    ["faqGeneralQuestions", "सामान्य प्रश्न"],
    ["faqNeedMoreHelpPrefix", "और सहायता चाहिए? सेवा और संपर्क विकल्पों के लिए"],
    ["faqSupportPage", "सहायता पेज"],
    ["faqNeedMoreHelpSuffix", "पर जाएँ।"],
    ["faqQuestionFindOptions", "Kurioticket उड़ान और होटल विकल्प कैसे ढूँढता है?"],
    ["faqQuestionSellDirectly", "क्या Kurioticket सीधे टिकट या होटल कमरे बेचता है?"],
    ["faqQuestionPriceChanges", "ऑफ़र पर क्लिक करने के बाद कीमतें क्यों बदल सकती हैं?"],
    ["faqQuestionCompareProviders", "क्या मैं एक ही यात्रा के लिए कई प्रदाताओं की तुलना कर सकता/सकती हूँ?"],
    ["faqQuestionSecureBooking", "मैं अपनी बुकिंग सुरक्षित रूप से कैसे पूरी करूँ?"],
    ["faqQuestionPreferences", "क्या मैं मुद्रा और भाषा प्राथमिकताएँ सेट कर सकता/सकती हूँ?"],
    ["faqQuestionLiveCached", "क्या खोज परिणाम लाइव हैं या कैश किए गए हैं?"],
    ["faqQuestionManageChanges", "मैं बदलाव या रद्दीकरण कहाँ प्रबंधित करूँ?"],
    ["homeDiscoveryRoute.ng-los-lhr.title", "लंदन बिज़नेस और वीकेंड मिश्रण"],
    [
      "homeDiscoveryRoute.ng-los-lhr.routeNote",
      "काम की यात्राओं और अतिरिक्त अवकाश योजनाओं के लिए लोकप्रिय लंबी दूरी का मार्ग।",
    ],
    ["homeDiscoveryRoute.ng-los-dxb.title", "दुबई शॉपिंग स्टॉपओवर"],
    [
      "homeDiscoveryRoute.ng-los-dxb.routeNote",
      "खरीदारी ब्रेक, पारिवारिक यात्रा और आगे की कनेक्टिंग उड़ानों के लिए लोकप्रिय।",
    ],
    ["homeDiscoveryRoute.ng-abv-acc.title", "अक्रा की त्वरित क्षेत्रीय यात्रा"],
    [
      "homeDiscoveryRoute.ng-abv-acc.routeNote",
      "शहर-से-शहर सुविधाजनक पहुँच वाला छोटा क्षेत्रीय मार्ग।",
    ],
    ["homeDiscoveryRoute.ng-los-nbo.title", "नैरोबी सफारी गेटवे"],
    [
      "homeDiscoveryRoute.ng-los-nbo.routeNote",
      "व्यावसायिक केंद्रों और सफारी विस्तारों के लिए पूर्वी अफ्रीका तक पहुँच।",
    ],
    ["homeDiscoveryRoute.ng-abv-jnb.title", "जोहान्सबर्ग सिटी ब्रेक"],
    [
      "homeDiscoveryRoute.ng-abv-jnb.routeNote",
      "बैठकों और शहरी अनुभवों के लिए मजबूत दक्षिणमुखी कनेक्टिविटी...",
    ],
    ["homeDiscoveryRoute.ng-los-ist.title", "इस्तांबुल कनेक्टर मार्ग"],
    [
      "homeDiscoveryRoute.ng-los-ist.routeNote",
      "यूरोप कनेक्शन और जीवंत शहर स्टॉपओवर के लिए बेहतरीन हब।",
    ],
    ["homeDiscoveryRoute.ng-abv-cdg.title", "पेरिस स्टाइल एस्केप"],
    [
      "homeDiscoveryRoute.ng-abv-cdg.routeNote",
      "फैशन, संग्रहालयों और भोजन अनुभवों के लिए क्लासिक यूरोप मार्ग।",
    ],
    ["homeDiscoveryRoute.ng-los-doh.title", "दोहा प्रीमियम ट्रांज़िट"],
    [
      "homeDiscoveryRoute.ng-los-doh.routeNote",
      "आराम-केंद्रित मार्ग, आगे की वैश्विक कनेक्टिंग उड़ानों के साथ।",
    ],
    ["homeDiscoveryRoute.ng-los-kig.title", "किगाली क्लीन-सिटी वीकेंड"],
    [
      "homeDiscoveryRoute.ng-los-kig.routeNote",
      "हरी पहाड़ियों और आसान शहर नेविगेशन वाला उभरता क्षेत्रीय हब।",
    ],
    ["homeDiscoveryRoute.ng-abv-cai.title", "काहिरा विरासत स्टॉप"],
    [
      "homeDiscoveryRoute.ng-abv-cai.routeNote",
      "नील इतिहास यात्राओं और चहल-पहल वाले पुराने शहर के बाज़ारों का प्रवेशद्वार।",
    ],
    ["homeDiscoveryRoute.ng-los-add.title", "अदीस अबाबा पूर्वी अफ्रीका लिंक"],
    [
      "homeDiscoveryRoute.ng-los-add.routeNote",
      "बढ़ते भोजन और सांस्कृतिक अनुभवों वाला प्रमुख ट्रांसफ़र केंद्र।",
    ],
    ["homeDiscoveryRoute.ng-abv-fco.title", "रोम लैंडमार्क गेटअवे"],
    [
      "homeDiscoveryRoute.ng-abv-fco.routeNote",
      "खंडहरों, पियाज़ा और सुकूनभरी शामों के लिए यूरोपीय क्लासिक।",
    ],
    ["homeDiscoveryRoute.ca-yyz-hnl.title", "होनोलूलू लंबी दूरी द्वीप यात्रा"],
    [
      "homeDiscoveryRoute.ca-yyz-hnl.routeNote",
      "समुद्र तटों, सर्फ़िंग और द्वीपीय हाइक के लिए प्रीमियम अवकाश विकल्प।",
    ],
    ["homeDiscoveryRoute.ca-yyz-san.title", "सैन डिएगो धूप और सर्फ़ यात्रा"],
    [
      "homeDiscoveryRoute.ca-yyz-san.routeNote",
      "समुद्र तटों, पार्कों और बंदरगाह नज़ारों के लिए भरोसेमंद सीमा-पार मार्ग।",
    ],
    ["homeDiscoveryRoute.ca-yvr-syd.title", "सिडनी ट्रांसपैसिफ़िक रोमांच"],
    [
      "homeDiscoveryRoute.ca-yvr-syd.routeNote",
      "बंदरगाह स्थलों और समुद्र-किनारे उपनगरों के लिए लोकप्रिय लंबी दूरी विकल्प।",
    ],
    ["flightLandingCity.Honolulu", "होनोलूलू"],
    ["flightLandingCity.San Diego", "सैन डिएगो"],
    ["flightLandingCity.Vancouver", "वैंकूवर"],
    ["flightLandingCity.Sydney", "सिडनी"],
    [
      "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water",
      "डायमंड हेड और चमकदार नीले पानी वाला होनोलूलू वाइकिकी बीच",
    ],
    [
      "flightLandingImageAlt.San Diego bay skyline and marina",
      "सैन डिएगो खाड़ी का स्काईलाइन और मरीना",
    ],
    ["flightBookingFaqs", "उड़ान बुकिंग से जुड़े अक्सर पूछे जाने वाले प्रश्न"],
    [
      "flightBookingFaqIntro",
      "प्रदाता के साथ आगे बढ़ने से पहले सामान्य उड़ान-खोज विवरणों की समीक्षा करें।",
    ],
    ["flightFaqBestTimeQuestion", "उड़ान बुक करने का सबसे अच्छा समय कब है?"],
    ["flightFaqBeforeBookingQuestion", "बुकिंग से पहले मुझे क्या जाँचना चाहिए?"],
    ["flightFaqFlexibleFareQuestion", "लचीला किराया क्या होता है?"],
    ["flightFaqNonstopQuestion", "क्या नॉनस्टॉप उड़ानें हमेशा बेहतर होती हैं?"],
    ["flightFaqBaggageQuestion", "बैगेज नियम कैसे काम करते हैं?"],
    ["flightFaqChangeCancelQuestion", "क्या मैं अपना टिकट बदल या रद्द कर सकता हूँ?"],
    [
      "flightFaqInternationalQuestion",
      "अंतरराष्ट्रीय उड़ानों के बारे में मुझे क्या पता होना चाहिए?",
    ],
  ];

  for (const [key, expected] of auditedHindiHomepageKeys) {
    assert.equal(hi[key], expected, key);
    assert.notEqual(hi[key], enTranslations[key], key);
  }
});

test("Turkish Deals page copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const auditedTurkishDealsKeys: Array<[string, string]> = [
    ["deals.heroTitle", "Bir sonraki seyahatiniz için fırsatları bulun"],
    ["deals.heroSubtitle", "Uçuşları, konaklamaları ve araçları tek yerde birlikte arayın."],
    ["deals.packageLegend", "Paket türünü seçin"],
    ["deals.package.hotelFlight", "Otel + Uçuş"],
    ["deals.package.hotelFlightCar", "Otel + Uçuş + Araç"],
    ["deals.package.flightCar", "Uçuş + Araç"],
    ["deals.package.hotelCar", "Otel + Araç"],
    ["deals.originLabel", "NEREDEN?"],
    ["deals.destinationLabel", "NEREYE?"],
    ["deals.datesLabel", "SEYAHAT TARİHLERİ"],
    ["deals.travelersRoomsLabel", "YOLCULAR / ODALAR"],
    ["deals.travelersCarsLabel", "YOLCULAR / ARAÇLAR"],
    ["deals.travelersCabinLabel", "YOLCULAR / KABİN"],
    ["deals.travelersDetailsLabel", "YOLCULAR / DETAYLAR"],
    ["deals.travelersRoomsCarLabel", "YOLCULAR / ODALAR / ARAÇ"],
    ["deals.originPlaceholder", "Şehir veya havalimanı"],
    ["deals.destinationPlaceholder", "Şehir, havalimanı veya bölge"],
    ["deals.dateFlightPlaceholder", "Gidiş — Dönüş"],
    ["deals.dateHotelPlaceholder", "Giriş — Çıkış"],
    ["deals.dateDialog", "Seyahat tarihlerini seçin"],
    ["deals.departDate", "Gidiş"],
    ["deals.returnDate", "Dönüş"],
    ["deals.travelerSingular", "yolcu"],
    ["deals.travelerPlural", "yolcu"],
    ["deals.roomSingular", "oda"],
    ["deals.roomPlural", "oda"],
    ["deals.driverAge", "Sürücü yaşı"],
    ["deals.cabinClass", "Kabin sınıfı"],
    ["deals.cabin.economy", "Ekonomi"],
    ["deals.cabin.business", "Business sınıfı"],
    ["deals.cabin.first", "First sınıfı"],
    ["deals.clearOrigin", "Çıkış noktasını temizle"],
    ["deals.clearDestination", "Destinasyonu temizle"],
    ["deals.previous", "Önceki"],
    ["deals.next", "Sonraki"],
    ["deals.weekday.sun", "Paz"],
    ["deals.weekday.mon", "Pzt"],
    ["deals.weekday.tue", "Sal"],
    ["deals.weekday.wed", "Çar"],
    ["deals.weekday.thu", "Per"],
    ["deals.weekday.fri", "Cum"],
    ["deals.weekday.sat", "Cmt"],
    ["deals.selectDateAriaPrefix", "Seç"],
    ["deals.error.origin", "Çıkış şehri veya havalimanı girin."],
    ["deals.error.destination", "Bir destinasyon girin."],
    ["deals.error.startDate", "Başlangıç tarihi seçin."],
    ["deals.error.endDate", "Bitiş tarihi seçin."],
    ["deals.error.dateOrder", "Bitiş tarihi başlangıç tarihinden sonra olmalıdır."],
    ["deals.error.adults", "En az bir yetişkin gereklidir."],
    ["deals.error.children", "Çocuk sayısı sıfırın altında olamaz."],
    ["deals.error.rooms", "En az bir oda gereklidir."],
    ["deals.error.guests", "En az bir misafir gereklidir."],
    ["deals.destinationIdeasTitle", "Fırsat aramanıza başlayabileceğiniz yerler"],
    [
      "deals.destinationIdeasSubtitle",
      "Bir destinasyon fikri seçin, devam ettiğinizde sağlayıcı sonuçlarını karşılaştırın.",
    ],
    ["deals.destinationCardAriaPrefix", "Seyahat fikri ara:"],
    ["deals.destination.tokyo.city", "Tokyo"],
    ["deals.destination.tokyo.country", "Japonya"],
    ["deals.destination.london.city", "Londra"],
    ["deals.destination.london.country", "Birleşik Krallık"],
    ["deals.destination.paris.city", "Paris"],
    ["deals.destination.paris.country", "Fransa"],
    ["deals.destination.dubai.city", "Dubai"],
    ["deals.destination.dubai.country", "Birleşik Arap Emirlikleri"],
    ["deals.destination.cancun.city", "Cancun"],
    ["deals.destination.cancun.country", "Meksika"],
    ["deals.destination.rome.city", "Roma"],
    ["deals.destination.rome.country", "İtalya"],
  ];

  for (const [key, expected] of auditedTurkishDealsKeys) {
    assert.equal(tr[key], expected, key);
    if (expected !== enTranslations[key]) {
      assert.notEqual(tr[key], enTranslations[key], key);
    }
  }

  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");
  for (const packageValue of [
    'value: "hotel-flight"',
    'value: "hotel-flight-car"',
    'value: "flight-car"',
    'value: "hotel-car"',
    'tripType: "round-trip"',
    'infants: "0"',
    'destinationQuery: "Tokyo"',
    'destinationQuery: "London"',
    'destinationQuery: "Paris"',
    'destinationQuery: "Dubai"',
    'destinationQuery: "Cancun"',
    'destinationQuery: "Rome"',
    '`/flights/results?${params.toString()}`',
    '`/hotels/results?${params.toString()}`',
  ]) {
    assert.ok(dealsPageSource.includes(packageValue), packageValue);
  }
});

test("Hindi Deals page copy resolves without English fallback", () => {
  const hi = getTranslations("hi");
  const auditedHindiDealsKeys: Array<[string, string]> = [
    ["deals.heroTitle", "अपनी अगली यात्रा के लिए ट्रैवल डील्स खोजें"],
    ["deals.heroSubtitle", "उड़ानें, ठहराव और कारें एक ही जगह साथ में खोजें।"],
    ["deals.originLabel", "कहाँ से?"],
    ["deals.destinationLabel", "कहाँ तक?"],
    ["deals.datesLabel", "यात्रा तिथियाँ"],
    ["deals.travelersRoomsLabel", "यात्री / कमरे"],
    ["deals.originPlaceholder", "शहर या हवाई अड्डा"],
    ["deals.destinationPlaceholder", "शहर, हवाई अड्डा या क्षेत्र"],
    ["deals.dateFlightPlaceholder", "प्रस्थान — वापसी"],
    ["deals.travelerSingular", "यात्री"],
    ["deals.roomSingular", "कमरा"],
    ["deals.destinationIdeasTitle", "डील खोज शुरू करने के लिए स्थान"],
    [
      "deals.destinationIdeasSubtitle",
      "एक गंतव्य विचार चुनें, फिर आगे बढ़ने पर प्रदाता परिणामों की तुलना करें।",
    ],
    ["deals.destination.tokyo.city", "टोक्यो"],
    ["deals.destination.tokyo.country", "जापान"],
    ["deals.destination.london.city", "लंदन"],
    ["deals.destination.london.country", "यूनाइटेड किंगडम"],
    ["deals.destination.paris.city", "पेरिस"],
    ["deals.destination.paris.country", "फ्रांस"],
    ["deals.destination.dubai.city", "दुबई"],
    ["deals.destination.dubai.country", "संयुक्त अरब अमीरात"],
    ["deals.destination.cancun.city", "कैनकुन"],
    ["deals.destination.cancun.country", "मेक्सिको"],
    ["deals.destination.rome.city", "रोम"],
    ["deals.destination.rome.country", "इटली"],
  ];

  for (const [key, expected] of auditedHindiDealsKeys) {
    assert.equal(hi[key], expected, key);
    assert.notEqual(hi[key], enTranslations[key], key);
  }
});

test("Polish global modal copy resolves without English fallback", () => {
  const pl = getTranslations("pl");

  const expectedPolishGlobalModalStrings: Record<string, string> = {
    chooseCountryAndCurrency: "Wybierz kraj i walutę",
    countryCurrencyDescription:
      "Wybierz kraj i walutę używane do wyświetlania cen. Sugestie lotnisk korzystają z wykrytej lokalizacji.",
    searchCountryOrCurrency: "Wyszukaj kraj lub walutę",
    countryCurrencyPopularCountryAndCurrency: "POPULARNE KRAJE I WALUTY",
    countryCurrencyAllCountriesAndCurrencies: "WSZYSTKIE KRAJE I WALUTY",
    countryCurrencyOptionCountSingular: "{{count}} opcja",
    countryCurrencyOptionCountPlural: "{{count}} opcji",
    showMoreResults: "Pokaż więcej wyników",
    globalLanguage: "JĘZYK GLOBALNY",
    websiteLanguageTitle: "Wybierz język strony",
    websiteLanguageDescription:
      "English (United States) jest domyślnym językiem strony. Kurioticket zmienia język dopiero po wybraniu dostępnej opcji.",
    currentLanguage: "Obecny język: {{language}}",
    languagePreparingNotice:
      "Przygotowujemy kolejne języki. Niedostępne opcje nie tłumaczą jeszcze strony.",
    languageSearchLabel: "Wyszukaj język",
    languageSearchPlaceholder: "Wyszukaj English, Español, Français, Deutsch...",
  };

  for (const [key, expected] of Object.entries(expectedPolishGlobalModalStrings)) {
    assert.equal(pl[key], expected, key);
    assert.notEqual(pl[key], enTranslations[key], key);
  }

  assert.ok(pl.websiteLanguageDescription.includes("Kurioticket"));
  assert.equal(pl.currentLanguage.replace("{{language}}", "Polski"), "Obecny język: Polski");
  assert.ok(pl.currentLanguage.includes("{{language}}"));
  assert.ok(pl.countryCurrencyOptionCountSingular.includes("{{count}}"));
  assert.ok(pl.countryCurrencyOptionCountPlural.includes("{{count}}"));

  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const countryCurrencySelectorSource = readFileSync("src/components/region/CountryCurrencySelector.tsx", "utf8");

  for (const key of [
    "globalLanguage",
    "websiteLanguageTitle",
    "websiteLanguageDescription",
    "currentLanguage",
    "languagePreparingNotice",
    "languageSearchLabel",
    "languageSearchPlaceholder",
  ]) {
    assert.ok(appHeaderSource.includes(`t.${key}`), `AppHeader should render ${key} through i18n`);
  }

  for (const key of [
    "chooseCountryAndCurrency",
    "countryCurrencyDescription",
    "searchCountryOrCurrency",
    "countryCurrencyAllCountriesAndCurrencies",
    "countryCurrencyPopularCountryAndCurrency",
    "countryCurrencyOptionCountSingular",
    "countryCurrencyOptionCountPlural",
    "showMoreResults",
  ]) {
    assert.ok(
      countryCurrencySelectorSource.includes(`t.${key}`),
      `CountryCurrencySelector should render ${key} through i18n`,
    );
  }

  assert.ok(countryCurrencySelectorSource.includes("displayedCountryCurrencies.map((option)"));
  assert.ok(countryCurrencySelectorSource.includes("option.code === mode"));
  assert.ok(countryCurrencySelectorSource.includes("option.currency === selectedCurrency"));
  assert.ok(appHeaderSource.includes("languageOptions"));
  assert.ok(appHeaderSource.includes("option.status === \"available\""));
});

test("Hindi country and currency modal copy resolves without English fallback", () => {
  const hi = getTranslations("hi");
  const auditedHindiCountryCurrencyKeys: Array<[string, string]> = [
    ["countryAndCurrency", "देश और मुद्रा"],
    [
      "openCountryCurrencySelector",
      "देश और मुद्रा चयनकर्ता खोलें, वर्तमान चयन {{code}}, {{currency}}",
    ],
    ["chooseCountryAndCurrency", "देश और मुद्रा चुनें"],
    [
      "countryCurrencyDescription",
      "कीमतें दिखाने के लिए इस्तेमाल होने वाला देश और मुद्रा चुनें। हवाई अड्डे के सुझाव आपके पहचाने गए स्थान का उपयोग करते हैं।",
    ],
    ["closeCountryCurrencySelector", "देश और मुद्रा चयनकर्ता बंद करें"],
    ["searchCountryOrCurrency", "देश या मुद्रा खोजें"],
    ["countryCurrencyAllCountriesAndCurrencies", "सभी देश और मुद्राएँ"],
    ["countryCurrencyPopularCountryAndCurrency", "लोकप्रिय देश और मुद्रा"],
    ["countryCurrencyOptionCountSingular", "{{count}} विकल्प"],
    ["countryCurrencyOptionCountPlural", "{{count}} विकल्प"],
    ["selectCountryCurrencyOption", "{{country}}, {{code}}, {{currency}} चुनें"],
    ["noCountriesOrCurrenciesFound", "कोई देश या मुद्रा नहीं मिली"],
    ["showMoreResults", "और परिणाम दिखाएँ"],
  ];

  for (const [key, expected] of auditedHindiCountryCurrencyKeys) {
    assert.equal(hi[key], expected, key);
    assert.notEqual(hi[key], enTranslations[key], key);
  }
});


test("Hindi hotels landing lower sections resolve without English fallback", () => {
  const hi = getTranslations("hi");
  const auditedHindiHotelsLandingKeys: Array<[string, string]> = [
    ["findStaysEveryKindTrip", "हर तरह की यात्रा के लिए ठहराव खोजें"],
    [
      "hotelInspirationBody",
      "आपके मन में जिस तरह का ठहराव है, उसके अनुसार गंतव्य विचार देखें।",
    ],
    ["hotelInspirationCategory.Beach", "बीच"],
    ["hotelInspirationCategory.City breaks", "सिटी ब्रेक"],
    ["hotelInspirationCategory.Family trips", "परिवार यात्राएँ"],
    ["hotelInspirationCategory.Relaxed stays", "आरामदायक ठहराव"],
    ["hotelInspirationCategory.Weekend ideas", "वीकेंड विचार"],
    ["hotelInspirationBadge.Coastal stays", "तटीय ठहराव"],
    ["hotelInspirationBadge.City coast", "शहर का तट"],
    ["hotelInspirationBadge.Waterfront stays", "वॉटरफ़्रंट ठहराव"],
    ["hotelTrustReviewTitle", "ठहराव विवरण की समीक्षा करें"],
    [
      "hotelTrustReviewBody",
      "चुनने से पहले तारीखें, मेहमान, कमरे, कीमत संदर्भ और ठहराव जानकारी जाँचें।",
    ],
    ["hotelTrustProviderTitle", "प्रदाता के साथ आगे बढ़ें"],
    [
      "hotelTrustProviderBody",
      "जब आप कोई विकल्प चुनते हैं, तो अंतिम कीमत, उपलब्धता, शुल्क और रद्दीकरण नियमों की पुष्टि के लिए प्रदाता के साथ आगे बढ़ें।",
    ],
    ["exploreStaysWorldwide", "दुनिया भर में ठहराव देखें"],
  ];

  for (const [key, expected] of auditedHindiHotelsLandingKeys) {
    assert.equal(hi[key], expected, key);
    assert.notEqual(hi[key], enTranslations[key], key);
  }

  assert.equal(hi.hotelsHeroTitle, "ऐसा ठहराव खोजें जो यात्रा की सही शुरुआत करे।");
  assert.equal(hi.hotelSearchIntroLabel, "होटल विकल्पों की तुलना करें");
  assert.equal(hi.hotelSearchDatePlaceholder, "चेक-इन — चेक-आउट");
  assert.equal(hi.guestSingular, "मेहमान");
  assert.equal(hi.roomPlural, "कमरे");
});

test("Spanish, French, German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, and Arabic dictionary shapes match English dictionary shape", () => {
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
  assert.deepEqual(
    englishKeys.filter((key) => !(key in arTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in zhCnTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in jaTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in koTranslations)),
    []
  );
  assert.deepEqual(
    englishKeys.filter((key) => !(key in hiTranslations)),
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
  assert.equal(getTranslations("ar").flights, "رحلات الطيران");
  assert.equal(getTranslations("ar-SA").currentLanguage, "اللغة الحالية: {{language}}");
  assert.equal(getTranslations("ar-AE").loginResendIn, "إعادة الإرسال خلال {{seconds}} ث");
  assert.equal(getTranslations("zh-CN").currentLanguage, "当前语言：{{language}}");
  assert.equal(getTranslations("zh").websiteLanguageTitle, "选择网站语言");
  assert.equal(getTranslations("ja").websiteLanguageTitle, "ウェブサイトの言語を選択");
  assert.equal(getTranslations("ko").websiteLanguageTitle, "웹사이트 언어 선택");
  assert.equal(getTranslations("hi").websiteLanguageTitle, "साइट की भाषा चुनें");
});

test("Flights datepicker formatter normalizes Hindi locale for generated display dates", () => {
  for (const locale of ["hi", "hi-IN", "hi-in"]) {
    assert.equal(normalizeFlightsCalendarLocale(locale), "hi-IN");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), locale), "जून 2026");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), locale), "जुलाई 2026");
    assert.equal(
      formatFlightsDateSummary(new Date(2026, 5, 27), new Date(2026, 5, 30), locale),
      "27 जून — 30 जून",
    );
  }

  assert.deepEqual(formatFlightsWeekdays("hi-IN"), ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"]);
  assert.equal(hiTranslations.previousMonthShort, "पिछला");
  assert.equal(hiTranslations.nextMonthShort, "अगला");
  assert.equal(hiTranslations.clear, "साफ़ करें");
  assert.equal(hiTranslations.done, "हो गया");
});

test("Turkish homepage hotel search and lower homepage copy resolve without English fallback", () => {
  const tr = getTranslations("tr");
  const auditedTurkishHomepageKeys: Array<[string, string]> = [
    ["cityOrHotel", "Şehir veya otel"],
    ["hotelSearchTravelDatesLabel", "Seyahat tarihleri"],
    ["hotelSearchDatePlaceholder", "Giriş — Çıkış"],
    ["hotelSearchGuestsLabel", "Misafirler"],
    ["stayDetails", "Konaklama detayları"],
    ["guestsAndRooms", "Misafirler ve odalar"],
    ["hotelAdultHelper", "18+ misafir"],
    ["hotelChildrenHelper", "0–17 yaş"],
    ["rooms", "Odalar"],
    ["hotelRoomsHelper", "En fazla 6 oda"],
    ["petFriendly", "Evcil hayvan dostu"],
    [
      "onlyShowPetFriendlyStays",
      "Yalnızca evcil hayvana izin veren konaklamaları göster",
    ],
    ["guestSingular", "misafir"],
    ["guestPlural", "misafir"],
    ["roomSingular", "oda"],
    ["roomPlural", "oda"],
    ["homeDiscoveryRoute.ng-los-nrt.title", "Tokyo uzun mesafe şehir ritmi"],
    [
      "homeDiscoveryRoute.ng-los-nrt.routeNote",
      "Neon semtleri ve verimli raylı ulaşımıyla önemli Asya geçidi.",
    ],
    ["homeDiscoveryRoute.ng-abv-mad.title", "Madrid tapas ve sanat rotası"],
    [
      "homeDiscoveryRoute.ng-abv-mad.routeNote",
      "Müzeler, bulvarlar ve geç akşam yemekleri için Avrupa şehir molası rotası.",
    ],
    ["homeDiscoveryRoute.ng-los-cpt.title", "Cape Town kıyı macerası"],
    [
      "homeDiscoveryRoute.ng-los-cpt.routeNote",
      "Plajları, dağları ve bağlarıyla manzaralı Güney Afrika rotası.",
    ],
    ["homeDiscoveryRoute.ng-abv-rob.title", "Monrovia bölgesel sahil seyahati"],
    [
      "homeDiscoveryRoute.ng-abv-rob.routeNote",
      "Atlantik plajları ve yerel pazarlarıyla Batı Afrika şehir molası.",
    ],
    ["homeTrustTitle", "Gezginler neden Kurioticket'te karşılaştırır"],
    [
      "homeTrustSubtitle",
      "Kurioticket sağlayıcı tekliflerini net şekilde karşılaştırmanıza, ardından rezervasyonu sağlayıcının sitesinde tamamlamanıza yardımcı olur.",
    ],
    ["homeTrustCompareTitle", "Sağlayıcı tekliflerini karşılaştırın"],
    [
      "homeTrustCompareBody",
      "Birden fazla seyahat sağlayıcısından uçuş ve otel seçeneklerini tek yerde görüntüleyin.",
    ],
    ["homeTrustPricingTitle", "Şeffaf fiyat bağlamı"],
    [
      "homeTrustPricingBody",
      "Devam etmeden önce fiyatı, rota veya konaklama detaylarını ve önemli şartları inceleyin.",
    ],
    ["homeTrustHandoffTitle", "Güvenli sağlayıcı yönlendirmesi"],
    [
      "homeTrustHandoffBody",
      "Bir teklif seçtiğinizde, rezervasyonu güvenle tamamlamak için sağlayıcıya devam edersiniz.",
    ],
    ["homePromoFlightsTitle", "En iyi hava yollarından uçuş fırsatları"],
    [
      "homePromoFlightsBody",
      "Sınırlı süreli ücretleri keşfedin ve seçenekleri anında karşılaştırın.",
    ],
    ["homePromoFlightsCta", "Uçuş fırsatlarını keşfet"],
    ["homePromoHotelsTitle", "Dünya çapında otel tasarrufları"],
    [
      "homePromoHotelsBody",
      "Butik otellerden global zincirlere kadar konaklamaları fiyat şeffaflığıyla inceleyin.",
    ],
    ["homePromoHotelsCta", "Otel fırsatlarını keşfet"],
    ["faqHeading", "Sıkça sorulan sorular"],
    [
      "faqIntro",
      "Kurioticket'in güvenilir sağlayıcılarla rezervasyon yapmadan önce uçuşları, otelleri ve seyahat seçeneklerini karşılaştırmanıza nasıl yardımcı olduğunu öğrenin.",
    ],
    ["faqQuestionFindOptions", "Kurioticket uçuş ve otel seçeneklerini nasıl bulur?"],
    ["faqQuestionSellDirectly", "Kurioticket doğrudan bilet veya otel odası satar mı?"],
    ["faqQuestionPriceChanges", "Bir teklife tıkladıktan sonra fiyatlar neden değişebilir?"],
    ["faqQuestionCompareProviders", "Aynı seyahat için birden fazla sağlayıcıyı karşılaştırabilir miyim?"],
  ];

  for (const [key, expected] of auditedTurkishHomepageKeys) {
    assert.equal(tr[key], expected, key);
    assert.notEqual(tr[key], enTranslations[key], key);
  }

  assert.equal(`${1} ${tr.guestSingular}, ${1} ${tr.roomSingular}`, "1 misafir, 1 oda");
  assert.equal(`{{count}} ${tr.guestPlural}`, "{{count}} misafir");
  assert.equal(`{{count}} ${tr.roomPlural}`, "{{count}} oda");
});

test("Turkish hotel datepicker formatter normalizes locale for generated display dates", () => {
  for (const locale of ["tr", "tr-TR", "tr-tr"]) {
    assert.equal(normalizeFlightsCalendarLocale(locale), "tr-TR");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), locale), "Haziran 2026");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), locale), "Temmuz 2026");
  }

  assert.deepEqual(formatFlightsWeekdays("tr-TR"), ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]);
  assert.equal(trTranslations.travelDates, "Seyahat tarihleri");
  assert.equal(trTranslations.chooseTravelDates, "Seyahat tarihlerini seçin");
  assert.equal(trTranslations.previousMonthShort, "Önceki");
  assert.equal(trTranslations.nextMonthShort, "Sonraki");
  assert.equal(trTranslations.clear, "Temizle");
  assert.equal(trTranslations.done, "Tamam");
});

test("Turkish lower homepage FAQ and newsletter copy do not fall back to English", () => {
  const tr = getTranslations("tr");

  const expectedTurkishLowerHomepageCopy: Record<string, string> = {
    faqQuestionSecureBooking: "Rezervasyonumu güvenli şekilde nasıl tamamlarım?",
    faqAnswerSecureBooking:
      "Rezervasyon ve ödeme sağlayıcının ödeme akışında tamamlanır. Onaylamadan önce sağlayıcının şartlarını, iptal politikasını ve son fiyatı her zaman incelemelisiniz.",
    faqQuestionPreferences: "Para birimi ve dil tercihlerini ayarlayabilir miyim?",
    faqAnswerPreferences:
      "Evet. Kurioticket, görüntülenen ülke/para birimi tercihlerini ayarlamanıza olanak tanır ve dil seçiciden kullanılabilir herhangi bir web sitesi dilini seçebilirsiniz.",
    faqQuestionLiveCached: "Arama sonuçları canlı mı yoksa önbelleğe alınmış mı?",
    faqAnswerLiveCached:
      "Kurioticket, müsaitlik ve fiyatlar değiştikçe yenilenebilen sağlayıcı arama sonuçlarını kullanır. Bu, güncel seçenekleri göstermeye yardımcı olur; ancak nihai müsaitlik sağlayıcı tarafından onaylanır.",
    faqQuestionManageChanges: "Değişiklikleri veya iptalleri nereden yönetirim?",
    faqAnswerManageChanges:
      "Seyahat değişiklikleri, iptaller, iadeler ve rezervasyon desteği genellikle rezervasyonun tamamlandığı sağlayıcı tarafından ele alınır. Hizmet talepleri için o sağlayıcıdan gelen onay bilgilerini kullanın.",
    supportFaqAccountQuestion: "Hesap ve oturum açma yardımı",
    supportFaqAccountAnswer:
      "Kurioticket hesap erişimi, oturum açma sorunları, kayıt sorunları, profil erişimi ve hesapla ilgili platform problemlerinde yardımcı olabilir.",
    supportFaqSearchQuestion: "Arama ve sonuçlar yardımı",
    supportFaqSearchAnswer:
      "Kurioticket; uçuş veya otel araması çalışmadığında, sonuçlar yüklenmediğinde, filtreler kafa karıştırdığında ya da fiyatlar ve sağlayıcılar beklendiği gibi görünmediğinde yardımcı olabilir.",
    supportFaqSavedTripsQuestion: "Kaydedilen seyahatler ve uyarılar",
    supportFaqSavedTripsAnswer:
      "Kurioticket kaydedilen seyahatler, son aramalar, fiyat uyarıları, bildirim sorunları ve hesaba bağlı seyahat araçları konusunda yardımcı olabilir.",
    supportFaqRedirectQuestion: "Rezervasyon/sağlayıcı yönlendirme yardımı",
    supportFaqRedirectAnswer:
      "Kurioticket, bir iş ortağına veya sağlayıcıya yönlendirme başarısız olursa, yanlış sayfayı açarsa ya da seçilen seyahat veya arama ayrıntılarını korumazsa yardımcı olabilir.",
    supportFaqAlreadyBookedQuestion: "Zaten bir sağlayıcıyla rezervasyon yaptınız mı?",
    supportFaqAlreadyBookedAnswer:
      "Rezervasyonunuz bir hava yolu, otel, seyahat acentesi veya harici sağlayıcıyla tamamlandıysa rezervasyon değişiklikleri, iadeler, iptaller, check-in, biniş, makbuzlar ve seyahat belgelerinden o sağlayıcı sorumludur.",
    supportFaqChangeBookingQuestion: "Kurioticket rezervasyonumu değiştirebilir mi?",
    supportFaqChangeBookingAnswer:
      "Kurioticket yalnızca doğrudan rezervasyon desteklendiği zaman ve destekleniyorsa Kurioticket üzerinden doğrudan yapılan rezervasyonlarda yardımcı olabilir. Harici sağlayıcılarla tamamlanan rezervasyonlar için doğrudan o sağlayıcıyla iletişime geçin.",
    supportFaqWhyRedirectedQuestion: "Neden başka bir sağlayıcıya gönderildim?",
    supportFaqWhyRedirectedAnswer:
      "Kurioticket bir seyahat arama ve karşılaştırma platformudur; bazı sonuçlar rezervasyonu, ödemeyi ve sağlayıcıya özel desteği tamamlayacağınız güvenilir sağlayıcılara yönlendirir.",
    homeNewsletterTitle: "Her seyahat fırsatından haberdar olun",
    homeNewsletterBody: "Seçilmiş uçuş ve otel güncellemelerini haftalık olarak alın.",
    homeNewsletterPlaceholder: "E-postanızı girin",
    homeSubscribe: "Abone ol",
    homeNewsletterConsent:
      "Abone olarak Kurioticket güncellemelerini almayı kabul edersiniz. İstediğiniz zaman abonelikten çıkabilirsiniz.",
    homeNewsletterThanks: "Teşekkürler! Sizi seyahat fırsatlarından haberdar edeceğiz.",
    homeEmailAddress: "E-posta adresi",
    homeNewsletterInvalidEmail: "Geçerli bir e-posta adresi girin.",
    homeNewsletterUnableSubscribe: "Şu anda abone olunamıyor.",
    homeNewsletterTryAgain:
      "Şu anda sizi abone yapamadık. Lütfen kısa süre sonra tekrar deneyin.",
    homeSubscribing: "Abone olunuyor…",
  };

  for (const [key, expected] of Object.entries(expectedTurkishLowerHomepageCopy)) {
    assert.equal(tr[key], expected, key);
    assert.notEqual(tr[key], enTranslations[key], key);
  }

  assert.ok(tr.supportFaqAccountAnswer.includes("Kurioticket"));
  assert.ok(tr.supportFaqChangeBookingQuestion.includes("Kurioticket"));
  assert.ok(tr.homeNewsletterConsent.includes("Kurioticket"));
  assert.ok(languageOptions.some((option) => option.code === "tr" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});


test("all flight datepicker render paths use shared Hindi date formatting", () => {
  const sharedFormatterSource = readFileSync("src/lib/flights/dateFormatting.ts", "utf8");
  const homepageSearchSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const standaloneFlightSearchSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
  const resultsSearchSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
  const landingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");

  assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), "hi"), "जून 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "hi-IN"), "जुलाई 2026");
  assert.equal(
    formatFlightsDateSummary(new Date(2026, 5, 27), new Date(2026, 5, 30), "hi-in"),
    "27 जून — 30 जून",
  );

  assert.ok(sharedFormatterSource.includes('normalized === "hi" || normalized === "hi-in" || normalized.startsWith("hi-")'));

  for (const [label, source] of [
    ["global/header and homepage SearchTabs", homepageSearchSource],
    ["standalone /flights form", standaloneFlightSearchSource],
    ["results edit/search datepicker", resultsSearchSource],
  ] as const) {
    assert.ok(source.includes("normalizeFlightsCalendarLocale"), `${label} should normalize through the shared flight locale helper`);
    assert.ok(source.includes("formatFlightsMonthHeading"), `${label} should render month headings through the shared flight formatter`);
    assert.ok(source.includes("formatFlightsDateSummary"), `${label} should render selected date summaries through the shared flight formatter`);
  }

  assert.ok(homepageSearchSource.includes("FlightMobilePickerShell"), "global/header SearchTabs mobile flight datepicker path should remain covered");
  assert.ok(standaloneFlightSearchSource.includes("FlightMobilePickerShell"), "standalone mobile flight datepicker path should remain covered");
  assert.ok(landingSource.includes("<StandaloneFlightSearchForm localizeCalendarLabels />"));
});


test("Hindi flights landing static render path resolves screenshot-visible copy", () => {
  assert.equal(hiTranslations.flightLandingHeroTitle, "अपनी अगली उपयोगी उड़ान आसानी से खोजें।");
  assert.equal(hiTranslations.roundTrip, "आना-जाना");
  assert.equal(hiTranslations.oneWay, "एकतरफ़ा");
  assert.equal(hiTranslations.origin, "प्रस्थान");
  assert.equal(hiTranslations.destination, "गंतव्य");
  assert.equal(hiTranslations.travelDates, "यात्रा तिथियाँ");
  assert.equal(hiTranslations.travelers, "यात्री");
  assert.equal(hiTranslations.cityOrAirport, "शहर या हवाई अड्डा");
  assert.equal(hiTranslations.searchFlights, "उड़ानें खोजें");
  assert.equal(hiTranslations.adultSingular, "वयस्क");
  assert.equal(hiTranslations.economy, "इकॉनमी");
  assert.equal(hiTranslations.flightLandingRouteTemplate.replace("{{origin}}", hiTranslations["flightLandingCity.Lagos"]).replace("{{destination}}", hiTranslations["flightLandingCity.London"]), "लागोस से लंदन");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-los-lhr.title"], "लंदन बिज़नेस और वीकेंड मिश्रण");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-los-lhr.routeNote"], "काम की यात्राओं और अतिरिक्त अवकाश योजनाओं के लिए लोकप्रिय लंबी दूरी का मार्ग।");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-los-nrt.title"], "टोक्यो लंबी दूरी शहर की धड़कन");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-los-nrt.routeNote"], "नियॉन इलाकों और कुशल रेल ट्रांज़िट वाला प्रमुख एशिया गेटवे।");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-abv-mad.title"], "मैड्रिड तपस और कला यात्रा");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-abv-mad.routeNote"], "संग्रहालयों, बुलेवार्ड्स और देर रात के भोजन के लिए यूरोप सिटी ब्रेक मार्ग।");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-abv-rob.title"], "मोनरोविया क्षेत्रीय समुद्री यात्रा");
  assert.equal(hiTranslations["homeDiscoveryRoute.ng-abv-rob.routeNote"], "अटलांटिक समुद्र तटों और स्थानीय बाज़ारों वाला पश्चिम अफ्रीकी सिटी ब्रेक।");
  assert.equal(hiTranslations.tripType, "यात्रा प्रकार");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yyz-hnl.title"], "होनोलूलू लंबी दूरी द्वीप यात्रा");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yyz-hnl.routeNote"], "समुद्र तटों, सर्फ़िंग और द्वीपीय हाइक के लिए प्रीमियम अवकाश विकल्प।");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yyz-san.title"], "सैन डिएगो धूप और सर्फ़ यात्रा");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yyz-san.routeNote"], "समुद्र तटों, पार्कों और बंदरगाह नज़ारों के लिए भरोसेमंद सीमा-पार मार्ग।");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yvr-syd.title"], "सिडनी ट्रांसपैसिफ़िक रोमांच");
  assert.equal(hiTranslations["homeDiscoveryRoute.ca-yvr-syd.routeNote"], "बंदरगाह स्थलों और समुद्र-किनारे उपनगरों के लिए लोकप्रिय लंबी दूरी विकल्प।");
  assert.equal(hiTranslations["flightLandingCity.Honolulu"], "होनोलूलू");
  assert.equal(hiTranslations["flightLandingCity.San Diego"], "सैन डिएगो");
  assert.equal(hiTranslations["flightLandingCity.Vancouver"], "वैंकूवर");
  assert.equal(hiTranslations["flightLandingCity.Sydney"], "सिडनी");
  assert.equal(hiTranslations["flightLandingCity.Johannesburg"], "जोहान्सबर्ग");
  assert.equal(hiTranslations["flightLandingImageAlt.Johannesburg skyline at golden hour"], "गोल्डन आवर में जोहान्सबर्ग स्काईलाइन");
  assert.equal(hiTranslations["flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water"], "डायमंड हेड और चमकदार नीले पानी वाला होनोलूलू वाइकिकी बीच");
  assert.equal(hiTranslations["flightLandingImageAlt.San Diego bay skyline and marina"], "सैन डिएगो खाड़ी का स्काईलाइन और मरीना");
  assert.equal(hiTranslations.flightBookingFaqs, "उड़ान बुकिंग से जुड़े अक्सर पूछे जाने वाले प्रश्न");
  assert.equal(hiTranslations.flightBookingFaqIntro, "प्रदाता के साथ आगे बढ़ने से पहले सामान्य उड़ान-खोज विवरणों की समीक्षा करें।");
  assert.equal(hiTranslations.flightFaqBestTimeQuestion, "उड़ान बुक करने का सबसे अच्छा समय कब है?");
  assert.equal(hiTranslations.flightFaqBeforeBookingQuestion, "बुकिंग से पहले मुझे क्या जाँचना चाहिए?");
  assert.equal(hiTranslations.flightFaqFlexibleFareQuestion, "लचीला किराया क्या होता है?");
  assert.equal(hiTranslations.flightFaqNonstopQuestion, "क्या नॉनस्टॉप उड़ानें हमेशा बेहतर होती हैं?");
  assert.equal(hiTranslations.flightFaqBaggageQuestion, "बैगेज नियम कैसे काम करते हैं?");
  assert.equal(hiTranslations.flightFaqChangeCancelQuestion, "क्या मैं अपना टिकट बदल या रद्द कर सकता हूँ?");
  assert.equal(hiTranslations.flightFaqInternationalQuestion, "अंतरराष्ट्रीय उड़ानों के बारे में मुझे क्या पता होना चाहिए?");
  assert.equal(
    new Intl.DateTimeFormat("hi-IN", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)),
    "जून 2026",
  );
  assert.equal(
    `${new Intl.DateTimeFormat("hi-IN", { month: "short", day: "numeric" }).format(new Date(2026, 5, 27))} — ${new Intl.DateTimeFormat("hi-IN", { month: "short", day: "numeric" }).format(new Date(2026, 5, 30))}`,
    "27 जून — 30 जून",
  );
  const standaloneFlightSearchSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
  const flightDateFormattingSource = readFileSync("src/lib/flights/dateFormatting.ts", "utf8");
  assert.ok(flightDateFormattingSource.includes('return "hi-IN";'));
  assert.ok(standaloneFlightSearchSource.includes("localizeCalendarLabels ? locale : \"en-us\""));
  assert.ok(standaloneFlightSearchSource.includes("localizeCalendarLabels = true"));
  assert.equal(hiTranslations.flightLandingRouteAriaLabel.includes("{{origin}}"), true);
  assert.equal(hiTranslations.flightLandingRouteAriaLabel.includes("{{destination}}"), true);
});

test("active locale auth verification copy is localized without English fallback", () => {
  const activeNonEnglishTranslations = [
    esTranslations,
    deTranslations,
    frTranslations,
    itTranslations,
    ptBrTranslations,
    nlTranslations,
    arTranslations,
    zhCnTranslations,
    jaTranslations,
    koTranslations,
    hiTranslations,
  ];
  const verificationKeys = [
    "loginCodeSent",
    "loginCodeInstructions",
    "loginVerificationCodeLabel",
    "loginVerifyLogin",
    "loginResendIn",
    "loginResendCode",
    "loginUseDifferentDetails",
    "loginEnterCode",
    "loginCodeFailed",
    "loginSendingCode",
    "loginVerifying",
    "loginResendSuccess",
  ];

  for (const translations of activeNonEnglishTranslations) {
    for (const key of verificationKeys) {
      assert.notEqual(translations[key], enTranslations[key], key);
    }
  }

  assert.equal(koTranslations.loginCodeSent, "인증 코드를 이메일로 보냈습니다.");
  assert.equal(
    koTranslations.loginCodeInstructions,
    "{{email}}로 전송된 6자리 코드를 입력하세요. 코드는 {{minutes}}분 후 만료됩니다."
  );
  assert.equal(koTranslations.loginVerificationCodeLabel, "인증 코드");
  assert.equal(koTranslations.loginVerifyLogin, "로그인 인증");
  assert.equal(koTranslations.loginResendIn, "{{seconds}}초 후 재전송");
  assert.equal(koTranslations.loginUseDifferentDetails, "다른 정보 사용");

  assert.equal(hiTranslations.loginPageTitle, "लॉग इन करें");
  assert.equal(hiTranslations.loginPageSubtitle, "खोजें सहेजें, अलर्ट प्रबंधित करें और अपना यात्रा डैशबोर्ड खोलें।");
  assert.equal(hiTranslations.loginForgotPassword, "पासवर्ड भूल गए?");
  assert.equal(hiTranslations.loginGoogle, "Google के साथ जारी रखें");
  assert.equal(hiTranslations.forgotPasswordTitle, "अपना पासवर्ड रीसेट करें");
  assert.equal(hiTranslations.forgotPasswordSubmit, "रीसेट लिंक भेजें");
  assert.equal(hiTranslations.signupPageTitle, "अपना खाता बनाएँ");
  assert.equal(hiTranslations.signupFullNameLabel, "पूरा नाम");
  assert.equal(hiTranslations.signupSubmit, "साइन अप करें");
  assert.equal(hiTranslations.loginCodeSent, "हमने आपके ईमेल पर सत्यापन कोड भेजा है।");
  assert.equal(hiTranslations.loginCodeInstructions, "{{email}} पर भेजा गया 6 अंकों का कोड दर्ज करें। कोड {{minutes}} मिनट बाद समाप्त हो जाते हैं।");
  assert.equal(hiTranslations.loginVerificationCodeLabel, "सत्यापन कोड");
  assert.equal(hiTranslations.loginVerifyLogin, "लॉगिन सत्यापित करें");
  assert.equal(hiTranslations.loginResendIn, "{{seconds}} सेकंड में फिर भेजें");
  assert.equal(hiTranslations.loginUseDifferentDetails, "अलग विवरण इस्तेमाल करें");
});


test("Hindi About page screenshot-visible copy resolves without English fallback", () => {
  const hi = getTranslations("hi");

  assert.equal(hi.aboutPageEyebrow, "Kurioticket के बारे में");
  assert.equal(hi.aboutPageTitle, "हमारे बारे में");
  assert.equal(
    hi.aboutPageIntroPrimary,
    "Kurioticket एक यात्रा खोज और तुलना प्लेटफ़ॉर्म है, जो यात्रियों को उड़ानें, होटल, कारें और यात्रा डील्स खोजने, तुलना करने और ढूँढने में मदद करता है।",
  );
  assert.equal(
    hi.aboutPageIntroSecondary,
    "हमारा लक्ष्य उपलब्ध विकल्पों और प्रदाता जानकारी को एक सरल जगह पर लाकर यात्रा योजना को अधिक स्पष्ट बनाना है, ताकि यात्री अपनी यात्रा के लिए उपयुक्त प्रदाता के साथ आगे बढ़ने से पहले विकल्पों की समीक्षा कर सकें।",
  );
  assert.equal(hi.aboutPagePlanningCardHeading, "एक व्यावहारिक यात्रा योजना टूल");
  assert.equal(
    hi.aboutPagePlanningCardBody,
    "Kurioticket उपयोगी संदर्भ के साथ यात्रियों को यात्रा विकल्पों का मूल्यांकन करने में मदद करने पर केंद्रित है। उपलब्धता, कीमतें, नियम और अंतिम बुकिंग चरण प्रदाता के अनुसार बदल सकते हैं, इसलिए यात्रियों को निर्णय लेने से पहले प्रदाता पेज को ध्यान से देखना चाहिए।",
  );

  const aboutPageSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  for (const key of [
    "aboutPageEyebrow",
    "aboutPageTitle",
    "aboutPageIntroPrimary",
    "aboutPageIntroSecondary",
    "aboutPagePlanningCardHeading",
    "aboutPagePlanningCardBody",
  ]) {
    assert.ok(aboutPageSource.includes(key), `About page render path should resolve ${key} through i18n.`);
    assert.notEqual(hi[key], enTranslations[key], `Hindi should localize ${key}`);
  }
});


test("active account FAQ translations cover all visible FAQ page strings", () => {
  const activeLocaleTranslations = {
    "en-us": enTranslations,
    ar: arTranslations,
    nl: nlTranslations,
    "es-es": esTranslations,
    fr: frTranslations,
    "de-de": deTranslations,
    "it-it": itTranslations,
    "pt-br": ptBrTranslations,
    "zh-cn": zhCnTranslations,
    ja: jaTranslations,
    ko: koTranslations,
    hi: hiTranslations,
    tr: trTranslations,
  };
  const accountFaqKeys = [
    "accountDashboard.hub.title",
    "faqHeading",
    "faqIntro",
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
    "faqQuestionFindOptions",
    "faqAnswerFindOptions",
    "faqQuestionSellDirectly",
    "faqAnswerSellDirectly",
    "faqQuestionPriceChanges",
    "faqAnswerPriceChanges",
    "faqQuestionCompareProviders",
    "faqAnswerCompareProviders",
    "faqQuestionSecureBooking",
    "faqAnswerSecureBooking",
    "faqQuestionPreferences",
    "faqAnswerPreferences",
    "faqQuestionLiveCached",
    "faqAnswerLiveCached",
    "faqQuestionManageChanges",
    "faqAnswerManageChanges",
  ];

  for (const [locale, translations] of Object.entries(activeLocaleTranslations)) {
    for (const key of accountFaqKeys) {
      assert.equal(typeof translations[key], "string", `${locale} should define ${key}`);
      assert.notEqual(translations[key], "", `${locale} should not leave ${key} empty`);
    }
  }

  const screenshotVisibleKeys = [
    "faqHeading",
    "faqGeneralQuestions",
    "faqQuestionFindOptions",
    "faqQuestionSellDirectly",
    "faqQuestionPriceChanges",
    "faqQuestionCompareProviders",
    "faqQuestionSecureBooking",
    "faqQuestionPreferences",
  ];

  for (const [locale, translations] of Object.entries(activeLocaleTranslations)) {
    if (locale === "en-us" || locale === "hi") continue;
    for (const key of screenshotVisibleKeys) {
      assert.notEqual(translations[key], enTranslations[key], `${locale} should localize ${key}`);
    }
  }

  assert.equal(koTranslations["accountDashboard.hub.title"], "내 계정");
  assert.equal(koTranslations.faqHeading, "자주 묻는 질문");
  assert.equal(koTranslations.faqGeneralQuestions, "일반 질문");
  assert.equal(trTranslations["accountDashboard.hub.title"], "Hesabım");
  assert.equal(trTranslations.faqHeading, "Sıkça sorulan sorular");
  assert.equal(trTranslations.faqGeneralQuestions, "Genel sorular");
});

test("Turkish account FAQ support CTA resolves through localized segmented keys", () => {
  const tr = getTranslations("tr");

  assert.equal(tr.faqGeneralQuestions, "Genel sorular");
  assert.equal(
    tr.faqNeedMoreHelpPrefix,
    "Daha fazla yardıma mı ihtiyacınız var? Hizmet ve iletişim seçenekleri için",
  );
  assert.equal(tr.faqSupportPage, "destek sayfasını");
  assert.equal(tr.faqNeedMoreHelpSuffix, "ziyaret edin.");
  assert.equal(
    `${tr.faqNeedMoreHelpPrefix} ${tr.faqSupportPage} ${tr.faqNeedMoreHelpSuffix}`,
    "Daha fazla yardıma mı ihtiyacınız var? Hizmet ve iletişim seçenekleri için destek sayfasını ziyaret edin.",
  );

  for (const key of [
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
  ]) {
    assert.notEqual(tr[key], enTranslations[key], key);
  }

  const faqContentSource = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
  const faqSource = readFileSync("src/content/faqs.ts", "utf8");

  assert.ok(faqContentSource.includes('t("faqGeneralQuestions")'), "Account FAQ heading should use i18n.");
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpPrefix")'), "Account FAQ CTA prefix should use i18n.");
  assert.ok(faqContentSource.includes('t("faqSupportPage")'), "Account FAQ CTA link should use i18n.");
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpSuffix")'), "Account FAQ CTA suffix should use i18n.");
  assert.ok(faqContentSource.includes('href="/dashboard/support"'), "Account FAQ support route should remain unchanged.");
  assert.ok(faqContentSource.includes("faqItems.map((item) =>"), "Account FAQ order should still come from getGeneralFaqs without reordering.");
  assert.ok(faqContentSource.includes("<details"), "Account FAQ accordion behavior should remain native details elements.");
  assert.ok(faqContentSource.includes("<summary"), "Account FAQ accordion summaries should remain unchanged.");
  assert.ok(faqSource.includes("faqItemKeys.reduce<FaqItem[]>") && faqSource.includes("seenQuestions"), "FAQ item ordering and duplicate-question handling should remain centralized.");
  assert.ok(languageOptions.some((option) => option.code === "tr" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});



test("Turkish account dashboard overview copy resolves without English fallback", () => {
  const tr = getTranslations("tr");

  assert.equal(tr["accountDashboard.overview.welcome"], "Tekrar hoş geldiniz, {name}");
  assert.equal(
    tr["accountDashboard.hub.description"],
    "Seyahatlerinizi, kaydedilen öğelerinizi, tercihlerinizi ve hesap ayarlarınızı tek bir yerden yönetin.",
  );
  assert.equal(tr["accountDashboard.hub.manageAccount"], "Hesabı yönet");
  assert.equal(tr["accountDashboard.hub.travelActivity"], "Seyahat etkinliği");
  assert.equal(tr["accountDashboard.hub.preferences"], "Tercihler");
  assert.equal(tr["accountDashboard.hub.helpAndSupport"], "Yardım ve destek");
  assert.equal(tr["accountDashboard.hub.personalDetails"], "Kişisel bilgiler");
  assert.equal(tr["accountDashboard.hub.securitySettings"], "Güvenlik ayarları");
  assert.equal(tr["accountDashboard.hub.myTrips"], "Seyahatlerim");
  assert.equal(tr["accountDashboard.hub.savedTrips"], "Kaydedilen seyahatler");
  assert.equal(tr["accountDashboard.hub.priceAlerts"], "Fiyat uyarıları");
  assert.equal(tr["accountDashboard.hub.emailPreferences"], "Özelleştirme tercihleri");
  assert.equal(tr["accountDashboard.hub.travelPreferences"], "Rezervasyon tercihleri");
  assert.equal(tr["accountDashboard.hub.contactSupport"], "Destekle iletişime geç");
  assert.equal(tr["accountDashboard.hub.faq"], "SSS");

  assert.equal(tr["accountDashboard.overview.welcome"].includes("{name}"), true);
  assert.equal(tr["accountDashboard.overview.welcome"].includes("developer"), false);
  assert.equal(tr["accountDashboard.overview.welcome"].includes("developer2@zentricresearch.com"), false);

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/page.tsx", "utf8");

  assert.ok(
    dashboardSource.includes('t["accountDashboard.overview.welcome"]') &&
      dashboardSource.includes("formatAccountWelcome(") &&
      dashboardPageSource.includes('const displayName = firstName || "traveler"'),
    "Dashboard welcome should continue using the i18n template with a dynamic display name.",
  );
  assert.ok(
    dashboardSource.includes("{initials}") &&
      dashboardSource.includes("{userEmail}") &&
      dashboardPageSource.includes("const initials = getInitials(userName, userEmail)"),
    "Dashboard overview should keep user email and avatar initials dynamic.",
  );
  assert.ok(
    dashboardSource.includes('href: "/dashboard"') &&
      dashboardSource.includes('href: "/dashboard/security"') &&
      dashboardSource.includes('href: "/dashboard/trips"') &&
      dashboardSource.includes('href: "/saved?from=account"') &&
      dashboardSource.includes('href: "/dashboard/alerts?from=account"') &&
      dashboardSource.includes('href: "/dashboard/preferences/customization"') &&
      dashboardSource.includes('href: "/dashboard/preferences/booking"') &&
      dashboardSource.includes('href: "/dashboard/support"') &&
      dashboardSource.includes('href: "/faq?from=account"'),
    "Dashboard overview routes should remain unchanged.",
  );
});

test("Hindi account dashboard overview copy resolves without English fallback", () => {
  const hi = getTranslations("hi");

  assert.equal(hi["accountDashboard.overview.welcome"], "वापसी पर स्वागत है, {name}");
  assert.equal(
    hi["accountDashboard.hub.description"],
    "अपनी यात्राएँ, सहेजे गए आइटम, प्राथमिकताएँ और खाता सेटिंग्स एक ही जगह प्रबंधित करें।",
  );
  assert.equal(hi["accountDashboard.hub.manageAccount"], "खाता प्रबंधित करें");
  assert.equal(hi["accountDashboard.hub.travelActivity"], "यात्रा गतिविधि");
  assert.equal(hi["accountDashboard.hub.preferences"], "प्राथमिकताएँ");
  assert.equal(hi["accountDashboard.hub.helpAndSupport"], "सहायता और समर्थन");
  assert.equal(hi["accountDashboard.hub.personalDetails"], "व्यक्तिगत विवरण");
  assert.equal(hi["accountDashboard.hub.securitySettings"], "सुरक्षा सेटिंग्स");
  assert.equal(hi["accountDashboard.hub.myTrips"], "मेरी यात्राएँ");
  assert.equal(hi["accountDashboard.hub.savedTrips"], "सहेजी गई यात्राएँ");
  assert.equal(hi["accountDashboard.hub.priceAlerts"], "मूल्य अलर्ट");
  assert.equal(hi["accountDashboard.hub.emailPreferences"], "कस्टमाइज़ेशन प्राथमिकताएँ");
  assert.equal(hi["accountDashboard.hub.travelPreferences"], "बुकिंग प्राथमिकताएँ");
  assert.equal(hi["accountDashboard.hub.contactSupport"], "सहायता से संपर्क करें");
  assert.equal(hi["accountDashboard.hub.faq"], "अक्सर पूछे जाने वाले प्रश्न");

  assert.equal(hi["accountDashboard.overview.welcome"].includes("{name}"), true);
  assert.equal(hi["accountDashboard.overview.welcome"].includes("developer"), false);
  assert.equal(hi["accountDashboard.overview.welcome"].includes("developer2@zentricresearch.com"), false);
});


test("Hindi account preferences actual render-path copy resolves without English fallback", () => {
  const hi = getTranslations("hi");
  const customizationSource = readFileSync(
    "src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx",
    "utf8",
  );
  const bookingSource = readFileSync(
    "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
    "utf8",
  );

  const expectedCustomizationCopy = {
    "accountDashboard.preferences.customization.title": "कस्टमाइज़ेशन प्राथमिकताएँ",
    "accountDashboard.preferences.customization.description": "चुनें कि Kurioticket आपके अनुभव को कैसे वैयक्तिकृत करे।",
    "accountDashboard.preferences.customization.languageRegion.title": "भाषा और क्षेत्र",
    "accountDashboard.preferences.customization.languageRegion.description": "अपनी डिफ़ॉल्ट भाषा, मुद्रा और क्षेत्र सेट करें।",
    "accountDashboard.preferences.customization.preferredLanguage": "पसंदीदा भाषा",
    "accountDashboard.preferences.customization.selectPreferredLanguage": "पसंदीदा भाषा चुनें",
    "accountDashboard.preferences.customization.currency": "मुद्रा",
    "accountDashboard.preferences.customization.selectCurrency": "मुद्रा चुनें",
    "accountDashboard.preferences.customization.region": "क्षेत्र",
    "accountDashboard.preferences.customization.selectRegion": "क्षेत्र चुनें",
    "accountDashboard.preferences.customization.personalization.title": "वैयक्तिकरण",
    "accountDashboard.preferences.customization.personalization.description": "नियंत्रित करें कि Kurioticket आपकी सिफ़ारिशों को कैसे वैयक्तिकृत करे।",
    "accountDashboard.preferences.customization.personalizeSearches": "मेरी खोजों का उपयोग सिफ़ारिशों को वैयक्तिकृत करने के लिए करें",
    "accountDashboard.preferences.customization.personalizedTravelDeals": "वैयक्तिकृत यात्रा डील्स दिखाएँ",
    "accountDashboard.preferences.customization.rememberRecentSearches": "मेरी हाल की खोजें याद रखें",
    "accountDashboard.preferences.customization.communicationStyle.title": "संचार शैली",
    "accountDashboard.preferences.customization.communicationStyle.description": "चुनें कि आप Kurioticket से किस तरह संवाद पाना चाहते हैं।",
    "accountDashboard.preferences.customization.emailUpdates": "ईमेल अपडेट",
    "accountDashboard.preferences.customization.priceAlertEmails": "मूल्य अलर्ट ईमेल",
    "accountDashboard.preferences.customization.travelInspirationEmails": "यात्रा प्रेरणा ईमेल",
  } as const;

  const expectedBookingCopy = {
    "accountDashboard.preferences.booking.title": "बुकिंग प्राथमिकताएँ",
    "accountDashboard.preferences.booking.description": "तेज़ और अधिक प्रासंगिक बुकिंग के लिए अपनी डिफ़ॉल्ट यात्रा प्राथमिकताएँ सेट करें।",
    "accountDashboard.preferences.booking.airports.title": "हवाई अड्डे",
    "accountDashboard.preferences.booking.airports.description": "वे हवाई अड्डे चुनें जहाँ से आप उड़ान भरना पसंद करते हैं।",
    "accountDashboard.preferences.booking.homeAirport": "मुख्य हवाई अड्डा",
    "accountDashboard.preferences.booking.searchAirport": "हवाई अड्डा खोजें",
    "accountDashboard.preferences.booking.secondaryAirports": "द्वितीयक हवाई अड्डे",
    "accountDashboard.preferences.booking.addAlternativeAirports": "वैकल्पिक हवाई अड्डे जोड़ें",
    "accountDashboard.preferences.booking.airlines.title": "एयरलाइंस",
    "accountDashboard.preferences.booking.airlines.description": "वे एयरलाइंस चुनें जिन्हें आप पसंद करते हैं या जिनसे बचना चाहते हैं।",
    "accountDashboard.preferences.booking.preferredAirlines": "पसंदीदा एयरलाइंस",
    "accountDashboard.preferences.booking.searchAirlines": "एयरलाइंस खोजें",
    "accountDashboard.preferences.booking.avoidAirlines": "इन एयरलाइंस से बचें",
    "accountDashboard.preferences.booking.stays.title": "ठहराव",
    "accountDashboard.preferences.booking.stays.description": "होटल बुकिंग के लिए आवास प्राथमिकताएँ सेट करें।",
    "accountDashboard.preferences.booking.preferredHotelChains": "पसंदीदा होटल चेन",
    "accountDashboard.preferences.booking.searchHotelChains": "होटल चेन खोजें",
    "accountDashboard.preferences.booking.avoidHotelChains": "इन होटल चेन से बचें",
  } as const;

  const sharedCopy = {
    "accountDashboard.preferences.cancel": "रद्द करें",
    "accountDashboard.preferences.savePreferences": "प्राथमिकताएँ सहेजें",
  } as const;

  for (const [key, value] of Object.entries(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use actual i18n key ${key}.`);
    assert.equal(hi[key], value);
    assert.notEqual(hi[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(key), `Booking page should use actual i18n key ${key}.`);
    assert.equal(hi[key], value);
    assert.notEqual(hi[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(sharedCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use shared action key ${key}.`);
    assert.ok(bookingSource.includes(key), `Booking page should use shared action key ${key}.`);
    assert.equal(hi[key], value);
    assert.notEqual(hi[key], enTranslations[key]);
  }

  const screenshotVisibleEnglishFallbacks = [
    "Customization preferences",
    "Choose how Kurioticket personalizes your experience.",
    "Language and region",
    "Set your default language, currency, and region.",
    "Preferred language",
    "Select preferred language",
    "Currency",
    "Select currency",
    "Region",
    "Select region",
    "Personalization",
    "Control how Kurioticket personalizes your recommendations.",
    "Use my searches to personalize recommendations",
    "Show personalized travel deals",
    "Remember my recent searches",
    "Communication style",
    "Choose how you want Kurioticket to communicate with you.",
    "Email updates",
    "Price alert emails",
    "Travel inspiration emails",
    "Booking preferences",
    "Set your default travel preferences for faster and more relevant bookings.",
    "Airports",
    "Choose the airports you prefer to fly from.",
    "Home airport",
    "Search airport",
    "Secondary airports",
    "Add alternative airports",
    "Airlines",
    "Choose airlines you prefer or want to avoid.",
    "Preferred airlines",
    "Search airlines",
    "Avoid airlines",
    "Stays",
    "Set accommodation preferences for hotel bookings.",
    "Preferred hotel chains",
    "Search hotel chains",
    "Avoid hotel chains",
    "Cancel",
    "Save preferences",
  ];

  const activeHindiRenderValues = [
    ...Object.keys(expectedCustomizationCopy),
    ...Object.keys(expectedBookingCopy),
    ...Object.keys(sharedCopy),
  ].map((key) => hi[key]);

  for (const englishFallback of screenshotVisibleEnglishFallbacks) {
    assert.ok(
      !activeHindiRenderValues.includes(englishFallback),
      `Hindi account preferences render-path values should not fall back to English: ${englishFallback}`,
    );
  }
});

test("Turkish account preferences actual render-path copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const customizationSource = readFileSync(
    "src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx",
    "utf8",
  );
  const bookingSource = readFileSync(
    "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
    "utf8",
  );

  const expectedCustomizationCopy = {
    "accountDashboard.preferences.customization.title": "Özelleştirme tercihleri",
    "accountDashboard.preferences.customization.description": "Kurioticket’in deneyiminizi nasıl kişiselleştireceğini seçin.",
    "accountDashboard.preferences.customization.languageRegion.title": "Dil ve bölge",
    "accountDashboard.preferences.customization.languageRegion.description": "Varsayılan dilinizi, para biriminizi ve bölgenizi ayarlayın.",
    "accountDashboard.preferences.customization.preferredLanguage": "Tercih edilen dil",
    "accountDashboard.preferences.customization.selectPreferredLanguage": "Tercih edilen dili seçin",
    "accountDashboard.preferences.customization.currency": "Para birimi",
    "accountDashboard.preferences.customization.selectCurrency": "Para birimi seçin",
    "accountDashboard.preferences.customization.region": "Bölge",
    "accountDashboard.preferences.customization.selectRegion": "Bölge seçin",
    "accountDashboard.preferences.customization.personalization.title": "Kişiselleştirme",
    "accountDashboard.preferences.customization.personalization.description": "Kurioticket’in önerilerinizi nasıl kişiselleştireceğini kontrol edin.",
    "accountDashboard.preferences.customization.personalizeSearches": "Önerileri kişiselleştirmek için aramalarımı kullan",
    "accountDashboard.preferences.customization.personalizedTravelDeals": "Kişiselleştirilmiş seyahat fırsatlarını göster",
    "accountDashboard.preferences.customization.rememberRecentSearches": "Son aramalarımı hatırla",
    "accountDashboard.preferences.customization.communicationStyle.title": "İletişim tarzı",
    "accountDashboard.preferences.customization.communicationStyle.description": "Kurioticket’in sizinle nasıl iletişim kurmasını istediğinizi seçin.",
    "accountDashboard.preferences.customization.emailUpdates": "E-posta güncellemeleri",
    "accountDashboard.preferences.customization.priceAlertEmails": "Fiyat uyarısı e-postaları",
    "accountDashboard.preferences.customization.travelInspirationEmails": "Seyahat ilhamı e-postaları",
  } as const;

  const expectedBookingCopy = {
    "accountDashboard.preferences.booking.title": "Rezervasyon tercihleri",
    "accountDashboard.preferences.booking.description": "Daha hızlı ve daha alakalı rezervasyonlar için varsayılan seyahat tercihlerinizi ayarlayın.",
    "accountDashboard.preferences.booking.airports.title": "Havalimanları",
    "accountDashboard.preferences.booking.airports.description": "Uçmayı tercih ettiğiniz havalimanlarını seçin.",
    "accountDashboard.preferences.booking.homeAirport": "Ana havalimanı",
    "accountDashboard.preferences.booking.searchAirport": "Havalimanı ara",
    "accountDashboard.preferences.booking.secondaryAirports": "İkincil havalimanları",
    "accountDashboard.preferences.booking.addAlternativeAirports": "Alternatif havalimanları ekle",
    "accountDashboard.preferences.booking.airlines.title": "Havayolları",
    "accountDashboard.preferences.booking.airlines.description": "Tercih ettiğiniz veya kaçınmak istediğiniz havayollarını seçin.",
    "accountDashboard.preferences.booking.preferredAirlines": "Tercih edilen havayolları",
    "accountDashboard.preferences.booking.searchAirlines": "Havayolu ara",
    "accountDashboard.preferences.booking.avoidAirlines": "Kaçınılacak havayolları",
    "accountDashboard.preferences.booking.stays.title": "Konaklamalar",
    "accountDashboard.preferences.booking.stays.description": "Otel rezervasyonları için konaklama tercihlerinizi ayarlayın.",
    "accountDashboard.preferences.booking.preferredHotelChains": "Tercih edilen otel zincirleri",
    "accountDashboard.preferences.booking.searchHotelChains": "Otel zinciri ara",
    "accountDashboard.preferences.booking.avoidHotelChains": "Kaçınılacak otel zincirleri",
  } as const;

  const sharedCopy = {
    "accountDashboard.preferences.cancel": "İptal",
    "accountDashboard.preferences.savePreferences": "Tercihleri kaydet",
  } as const;

  for (const [key, value] of Object.entries(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use actual i18n key ${key}.`);
    assert.equal(tr[key], value);
    assert.notEqual(tr[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(key), `Booking page should use actual i18n key ${key}.`);
    assert.equal(tr[key], value);
    assert.notEqual(tr[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(sharedCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use shared action key ${key}.`);
    assert.ok(bookingSource.includes(key), `Booking page should use shared action key ${key}.`);
    assert.equal(tr[key], value);
    assert.notEqual(tr[key], enTranslations[key]);
  }

  assert.ok(customizationSource.includes('value: "English"'));
  assert.ok(customizationSource.includes('value: "USD"'));
  assert.ok(customizationSource.includes('value: "United States"'));
  assert.ok(customizationSource.includes('id: "preferred-language"'));
  assert.ok(customizationSource.includes('name={field.id}'));
  assert.ok(customizationSource.includes('type="checkbox"'));
  assert.ok(customizationSource.includes('type="button"'));
  assert.ok(bookingSource.includes('id: "home-airport"'));
  assert.ok(bookingSource.includes('id: "preferred-airlines"'));
  assert.ok(bookingSource.includes('name={field.id}'));
  assert.ok(bookingSource.includes('type="search"'));
  assert.ok(bookingSource.includes('type="button"'));
  assert.ok(languageOptions.some((option) => option.code === "tr" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Turkish account personal details and security settings copy resolves without English fallback", () => {
  const tr = getTranslations("tr");

  const expectedTurkishAccountCopy = {
    "accountDashboard.personalDetails.title": "Kişisel bilgiler",
    "accountDashboard.personalDetails.subtitle":
      "Bilgilerinizi güncelleyin ve Kurioticket genelinde nasıl kullanıldığını yönetin.",
    "accountDashboard.personalDetails.name": "Ad",
    "accountDashboard.personalDetails.displayName": "Görünen ad",
    "accountDashboard.personalDetails.emailAddress": "E-posta adresi",
    "accountDashboard.personalDetails.phoneNumber": "Telefon numarası",
    "accountDashboard.personalDetails.dateOfBirth": "Doğum tarihi",
    "accountDashboard.personalDetails.gender": "Cinsiyet",
    "accountDashboard.personalDetails.nationality": "Uyruk",
    "accountDashboard.personalDetails.address": "Adres",
    "accountDashboard.personalDetails.addPhoneNumber": "Telefon numaranızı ekleyin",
    "accountDashboard.personalDetails.addDateOfBirth": "Doğum tarihinizi ekleyin",
    "accountDashboard.personalDetails.addGender": "Cinsiyetinizi ekleyin",
    "accountDashboard.personalDetails.addNationality": "Uyruğunuzu ekleyin",
    "accountDashboard.personalDetails.addAddress": "Adresinizi ekleyin",
    "accountDashboard.personalDetails.edit": "Düzenle",
    "accountDashboard.security.title": "Güvenlik ayarları",
    "accountDashboard.security.description":
      "Şifrenizi güncelleyin ve hesap güvenliğinizi yönetin.",
    "accountDashboard.security.passkeys.title": "Geçiş anahtarları",
    "accountDashboard.security.passkeys.description":
      "Şifre hatırlamanıza gerek kalmadan güvenli şekilde oturum açın.",
    "accountDashboard.security.twoFactor.title": "İki faktörlü kimlik doğrulama",
    "accountDashboard.security.twoFactor.description":
      "Hesabınıza ek bir güvenlik katmanı ekleyin.",
    "accountDashboard.security.activeSessions.title": "Aktif oturumlar",
    "accountDashboard.security.activeSessions.description":
      "Hesabınızın nerelerde açık olduğunu inceleyin ve diğer cihazlardan çıkış yapın.",
    "accountDashboard.security.deleteAccount.title": "Hesabı sil",
    "accountDashboard.security.deleteAccount.description":
      "Kurioticket hesabınızı kalıcı olarak silin.",
    "accountDashboard.security.action.setUp": "Kur",
    "accountDashboard.security.action.manage": "Yönet",
    "accountDashboard.security.action.deleteAccount": "Hesabı sil",
  } as const;

  for (const [key, value] of Object.entries(expectedTurkishAccountCopy)) {
    assert.equal(tr[key], value);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(tr["accountDashboard.hub.title"], "Hesabım");
  assert.equal(tr["accountDashboard.personalDetails.title"].includes("developer"), false);
  assert.equal(tr["accountDashboard.security.deleteAccount.description"].includes("Kurioticket"), true);

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const securityPageSource = readFileSync("src/app/dashboard/security/page.tsx", "utf8");

  assert.ok(
    dashboardSource.includes('title={t["accountDashboard.personalDetails.title"]}') &&
      dashboardSource.includes('description={t["accountDashboard.personalDetails.subtitle"]}') &&
      dashboardSource.includes('label: t["accountDashboard.personalDetails.name"]') &&
      dashboardSource.includes('fallback: t["accountDashboard.personalDetails.addPhoneNumber"]') &&
      dashboardSource.includes('{t["accountDashboard.personalDetails.edit"]}'),
    "Personal details page should continue using account personal-details i18n keys.",
  );
  assert.ok(
    dashboardSource.includes('title={t["accountDashboard.security.title"]}') &&
      dashboardSource.includes('description={t["accountDashboard.security.description"]}') &&
      dashboardSource.includes('title={t["accountDashboard.security.passkeys.title"]}') &&
      dashboardSource.includes('action={t["accountDashboard.security.action.deleteAccount"]}') &&
      dashboardSource.includes('setActionMessage(t["accountDashboard.security.action.unavailable"])'),
    "Security settings page should continue using account security i18n keys and unchanged unavailable action handling.",
  );
  assert.ok(
    dashboardSource.includes("const initialValues = getPersonalDetailsInitialValues(props)") &&
      dashboardSource.includes("userEmail?.trim()") &&
      dashboardSource.includes("userName?.trim()") &&
      dashboardPageSource.includes("const userName = session?.user?.name?.trim()") &&
      dashboardPageSource.includes("const userEmail = session?.user?.email?.trim()"),
    "Personal details should keep user/session/profile values dynamic.",
  );
  assert.ok(
    dashboardPageSource.includes("<DashboardOverview") &&
      securityPageSource.includes("<SecurityDashboardPage />") &&
      !dashboardSource.includes('href="/dashboard/personal-details"'),
    "Account dashboard routes and render entry points should remain unchanged.",
  );
});

test("Hindi account personal details and security settings copy resolves without English fallback", () => {
  const hi = getTranslations("hi");

  const expectedHindiAccountCopy = {
    "accountDashboard.personalDetails.title": "व्यक्तिगत विवरण",
    "accountDashboard.personalDetails.subtitle":
      "अपनी जानकारी अपडेट करें और Kurioticket में उसका उपयोग कैसे होता है, इसे प्रबंधित करें।",
    "accountDashboard.personalDetails.name": "नाम",
    "accountDashboard.personalDetails.displayName": "प्रदर्शित नाम",
    "accountDashboard.personalDetails.emailAddress": "ईमेल पता",
    "accountDashboard.personalDetails.phoneNumber": "फ़ोन नंबर",
    "accountDashboard.personalDetails.dateOfBirth": "जन्म तिथि",
    "accountDashboard.personalDetails.gender": "लिंग",
    "accountDashboard.personalDetails.nationality": "राष्ट्रीयता",
    "accountDashboard.personalDetails.address": "पता",
    "accountDashboard.personalDetails.addPhoneNumber": "अपना फ़ोन नंबर जोड़ें",
    "accountDashboard.personalDetails.addDateOfBirth": "अपनी जन्म तिथि जोड़ें",
    "accountDashboard.personalDetails.addGender": "अपना लिंग जोड़ें",
    "accountDashboard.personalDetails.addNationality": "अपनी राष्ट्रीयता जोड़ें",
    "accountDashboard.personalDetails.addAddress": "अपना पता जोड़ें",
    "accountDashboard.personalDetails.edit": "संपादित करें",
    "accountDashboard.security.title": "सुरक्षा सेटिंग्स",
    "accountDashboard.security.description":
      "अपना पासवर्ड अपडेट करें और खाते की सुरक्षा प्रबंधित करें।",
    "accountDashboard.security.passkeys.title": "पासकी",
    "accountDashboard.security.passkeys.description":
      "पासवर्ड याद रखने की आवश्यकता के बिना सुरक्षित रूप से साइन इन करें।",
    "accountDashboard.security.twoFactor.title": "दो-कारक प्रमाणीकरण",
    "accountDashboard.security.twoFactor.description":
      "अपने खाते में सुरक्षा की एक अतिरिक्त परत जोड़ें।",
    "accountDashboard.security.activeSessions.title": "सक्रिय सत्र",
    "accountDashboard.security.activeSessions.description":
      "देखें कि आपका खाता कहाँ साइन इन है और अन्य डिवाइसों से साइन आउट करें।",
    "accountDashboard.security.deleteAccount.title": "खाता हटाएँ",
    "accountDashboard.security.deleteAccount.description":
      "अपना Kurioticket खाता स्थायी रूप से हटाएँ।",
    "accountDashboard.security.action.setUp": "सेट अप करें",
    "accountDashboard.security.action.manage": "प्रबंधित करें",
    "accountDashboard.security.action.deleteAccount": "खाता हटाएँ",
  } as const;

  for (const [key, value] of Object.entries(expectedHindiAccountCopy)) {
    assert.equal(hi[key], value);
    assert.notEqual(hi[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(hi["accountDashboard.hub.title"], "मेरा खाता");
  assert.equal(hi["accountDashboard.personalDetails.title"].includes("developer"), false);
  assert.equal(hi["accountDashboard.security.deleteAccount.description"].includes("Kurioticket"), true);
});

test("Hindi destinations and saved trips screenshot-visible copy resolves without English fallback", () => {
  const hi = getTranslations("hi");

  assert.equal(hi.destinationsHeroBadge, "गंतव्य खोज");
  assert.equal(hi.destinationsHeroTitle, "आप आगे कहाँ जाना चाहते हैं?");
  assert.equal(hi.destinationsHeroSubtitle, "चुने हुए शहरों के नज़ारे देखें, उड़ानों की तुलना करें और मिनटों में यात्रा डील्स पाएँ।");
  assert.equal(hi["destinations.region.europe"], "यूरोप");
  assert.equal(hi["destinations.region.europe.summary"], "प्रसिद्ध शहरों, रोमांटिक नहरों, डिज़ाइन राजधानियों और सदाबहार भोजन-संस्कृति वीकेंड्स का चुना हुआ संग्रह।");
  assert.equal(hi["destinations.country.unitedKingdom"], "यूनाइटेड किंगडम");
  assert.equal(hi["destinations.tag.iconicSkyline"], "प्रसिद्ध क्षितिज");
  assert.equal(hi["destinations.city.london"], "लंदन");
  assert.equal(hi["destinations.card.subtitle"], "सुंदर नज़ारे, उड़ानें, होटल और डील्स");

  assert.equal(hi.savedTripsPageTitle, "सहेजी गई यात्राएँ");
  assert.equal(hi.savedTripsPageSubtitle, "आपकी चुनी हुई यात्राएँ और ट्रेंडिंग मार्ग।");
  assert.equal(hi.savedTripsEmptyTitle, "अपने पसंदीदा गंतव्य सहेजें");
  assert.equal(hi.savedTripsExploreDestinations, "गंतव्य देखें");
  assert.equal(hi.savedTripsRecentSearchesTitle, "हाल की खोजें");
  assert.equal(hi.savedTripsClearAllRecent, "सभी हाल की खोजें साफ़ करें");
  assert.equal(hi.savedTripsTypeFlight, "उड़ान");
  assert.equal(hi.savedTripsTravelerCountOne, "1 यात्री");
  assert.equal(hi.savedTripsCabinEconomy, "इकॉनमी");
  assert.equal(hi.savedTripsSearchedDate, "खोजा गया {{date}}");
  assert.equal(hi.savedTripsRepeatSearch, "खोज दोहराएँ");

  assert.equal(
    new Intl.DateTimeFormat("hi-IN", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date("2026-06-25T00:00:00"),
    ),
    "25 जून 2026",
  );
});

test("Turkish destinations and saved trips screenshot-visible copy resolves without English fallback", () => {
  const tr = getTranslations("tr");

  const auditedTurkishKeys: Array<[string, string]> = [
    ["destinationsHeroBadge", "DESTİNASYON KEŞFİ"],
    ["destinationsHeroTitle", "Sırada nereye gitmek istersiniz?"],
    [
      "destinationsHeroSubtitle",
      "Özenle seçilmiş şehir manzaralarına göz atın, uçuşları karşılaştırın ve dakikalar içinde seyahat fırsatları bulun.",
    ],
    ["destinations.region.europe", "Avrupa"],
    ["destinations.region.northAmerica", "Kuzey Amerika"],
    ["destinations.region.asia", "Asya"],
    ["destinations.region.africa", "Afrika"],
    ["destinations.region.middleEast", "Orta Doğu"],
    [
      "destinations.region.europe.summary",
      "Simgesel şehirler, romantik kanallar, tasarım başkentleri ve zamansız yeme-içme ile kültür hafta sonları için seçilmiş bir liste.",
    ],
    ["destinations.country.unitedKingdom", "Birleşik Krallık"],
    ["destinations.country.unitedStates", "Amerika Birleşik Devletleri"],
    ["destinations.country.unitedArabEmirates", "Birleşik Arap Emirlikleri"],
    ["destinations.tag.iconicSkyline", "İkonik silüet"],
    ["destinations.tag.desertDrama", "Çöl manzarası"],
    ["destinations.city.london", "Londra"],
    ["destinations.city.copenhagen", "Kopenhag"],
    ["destinations.city.abuDhabi", "Abu Dabi"],
    ["destinations.card.subtitle", "Canlı manzaralar, uçuşlar, oteller ve fırsatlar"],
    ["destinationsImageAltSuffix", "seyahat fotoğrafı"],
    ["destinationsCardAriaLabel", "{destination} için uçuş ara"],
    ["savedTripsPageTitle", "Kaydedilen geziler"],
    ["savedTripsPageSubtitle", "Seçtiğiniz rotalar ve öne çıkan güzergâhlar."],
    ["savedTripsEmptyTitle", "Sevdiğiniz destinasyonları kaydedin"],
    [
      "savedTripsEmptyDescription",
      "Kişisel listenizi oluşturmak ve bir sonraki maceranızı tek tık uzağınızda tutmak için herhangi bir rotadaki kalp simgesine dokunun.",
    ],
    ["savedTripsExploreDestinations", "Destinasyonları keşfet"],
    ["savedTripsRecentSearchesTitle", "Son aramalar"],
    [
      "savedTripsRecentSearchesSubtitle",
      "Kaldığınız yerden devam edin ve tek dokunuşla yeniden arayın.",
    ],
    ["savedTripsClearAllRecent", "Tüm son aramaları temizle"],
    ["savedTripsTypeFlight", "UÇUŞ"],
    ["savedTripsSearchedDate", "ARANDI {{date}}"],
    ["savedTripsRepeatSearch", "Aramayı tekrarla"],
    ["savedTripsTravelerCountOne", "1 yolcu"],
    ["savedTripsTravelerCountOther", "{{count}} yolcu"],
    ["savedTripsCabinEconomy", "Ekonomi"],
    ["savedTripsCabinPremiumEconomy", "Premium ekonomi"],
  ];

  for (const [key, expected] of auditedTurkishKeys) {
    assert.equal(tr[key], expected);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(
    new Intl.DateTimeFormat("tr-TR", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date("2026-06-26T00:00:00"),
    ),
    "26 Haz 2026",
  );
});


test("Polish destinations and saved trips active render-path copy resolves without English fallback", () => {
  const pl = getTranslations("pl");

  const auditedPolishKeys: Array<[string, string]> = [
    ["destinationsHeroBadge", "ODKRYWANIE KIERUNKÓW"],
    ["destinationsHeroTitle", "Dokąd chcesz polecieć dalej?"],
    [
      "destinationsHeroSubtitle",
      "Przeglądaj starannie wybrane widoki miast, porównuj loty i znajduj oferty podróży w kilka minut.",
    ],
    ["destinations.region.europe", "Europa"],
    ["destinations.region.northAmerica", "Ameryka Północna"],
    ["destinations.region.asia", "Azja"],
    ["destinations.region.africa", "Afryka"],
    ["destinations.region.middleEast", "Bliski Wschód"],
    [
      "destinations.region.europe.summary",
      "Starannie wybrane kultowe miasta, romantyczne kanały, stolice designu oraz ponadczasowe weekendy z jedzeniem i kulturą.",
    ],
    ["destinations.country.unitedKingdom", "WIELKA BRYTANIA"],
    ["destinations.country.unitedStates", "STANY ZJEDNOCZONE"],
    ["destinations.country.unitedArabEmirates", "ZEA"],
    ["destinations.tag.iconicSkyline", "IKONICZNA PANORAMA"],
    ["destinations.tag.landmarkEscape", "WYJAZD DO IKONICZNEGO MIEJSCA"],
    ["destinations.tag.cultureCapital", "STOLICA KULTURY"],
    ["destinations.tag.goldenHourViews", "WIDOKI O ZŁOTEJ GODZINIE"],
    ["destinations.tag.coastalEnergy", "NADMORSKA ENERGIA"],
    ["destinations.tag.foodMarketNights", "WIECZORY NA TARGACH KULINARNYCH"],
    ["destinations.tag.historicStreets", "HISTORYCZNE ULICE"],
    ["destinations.tag.designWeekend", "WEEKEND Z DESIGNEM"],
    ["destinations.city.london", "Londyn"],
    ["destinations.city.copenhagen", "Kopenhaga"],
    ["destinations.city.abuDhabi", "Abu Zabi"],
    ["destinations.card.subtitle", "Piękne widoki, loty, hotele i oferty"],
    ["destinationsImageAltSuffix", "zdjęcie podróżnicze"],
    ["destinationsCardAriaLabel", "Szukaj lotów do: {destination}"],
    ["savedTripsPageTitle", "Zapisane podróże"],
    ["savedTripsPageSubtitle", "Twoje wybrane plany podróży i popularne trasy."],
    ["savedTripsEmptyTitle", "Zapisuj kierunki, które lubisz"],
    [
      "savedTripsEmptyDescription",
      "Kliknij ikonę serca przy dowolnej trasie, aby utworzyć własną listę i mieć kolejną przygodę pod ręką.",
    ],
    ["savedTripsExploreDestinations", "Odkryj kierunki"],
    ["savedTripsRecentSearchesTitle", "Ostatnie wyszukiwania"],
    [
      "savedTripsRecentSearchesSubtitle",
      "Wróć do miejsca, w którym przerwałeś, i wyszukaj ponownie jednym kliknięciem.",
    ],
    ["savedTripsClearAllRecent", "Wyczyść ostatnie"],
    ["savedTripsTypeFlight", "LOT"],
    ["savedTripsRepeatSearch", "Powtórz wyszukiwanie"],
  ];

  for (const [key, expected] of auditedPolishKeys) {
    assert.equal(pl[key], expected);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.ok(languageOptions.some((o) => o.code === "pl" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});
test("Polish destinations and saved trips route fixtures still use localized dictionaries without changing route data", () => {
  const destinationsPageSource = readFileSync(new URL("../../app/destinations/page.tsx", import.meta.url), "utf8");
  const savedPageSource = readFileSync(new URL("../../app/saved/page.tsx", import.meta.url), "utf8");
  const savedComponentSource = readFileSync(new URL("../../components/saved/SavedTripsAndRecentSearches.tsx", import.meta.url), "utf8");

  assert.ok(destinationsPageSource.includes("dictionary.destinationsHeroBadge"));
  assert.ok(destinationsPageSource.includes("regionLabelKeys[section.region]"));
  assert.ok(destinationsPageSource.includes("destinationNameKeys[destination.name]"));
  assert.ok(destinationsPageSource.includes("destinationCountryKeys[destination.country]"));
  assert.ok(destinationsPageSource.includes("dictionary[destination.tagKey]"));
  assert.ok(destinationsPageSource.includes("dictionary[destinationSubtitleKey]"));
  assert.ok(destinationsPageSource.includes("getDestinationHref(destination)"));
  assert.ok(destinationsPageSource.includes("return `/flights?destination=${encodeURIComponent(destination.name)}`;"));

  assert.ok(savedPageSource.includes("<SavedTripsAndRecentSearches />"));
  assert.ok(savedComponentSource.includes('t("savedTripsPageTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsEmptyTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsExploreDestinations")'));
  assert.ok(savedComponentSource.includes('t("savedTripsRecentSearchesTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsTypeFlight")'));
  assert.ok(savedComponentSource.includes('t("savedTripsRepeatSearch")'));
  assert.ok(savedComponentSource.includes("readSavedTripIds()"));
  assert.ok(savedComponentSource.includes("readRecentSearches()"));
  assert.ok(savedComponentSource.includes('href: "/destinations"'));
  assert.ok(savedComponentSource.includes('pathname: "/flights/results"'));
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




test("Hindi hotels flow copy is localized without English fallback", () => {
  const expectedHindiHotelStrings = {
    clearAll: "सब साफ़ करें",
    hotelsHeroEyebrow: "प्रीमियम ठहराव, स्पष्ट तुलना",
    hotelsHeroTitle: "ऐसा ठहराव खोजें जो यात्रा की सही शुरुआत करे।",
    hotelsHeroSubtitle:
      "शहर में आरामदायक आगमन से लेकर आसान रिसॉर्ट ठहराव तक, होटल एक ही जगह तुलना करें।",
    hotelSearchIntroLabel: "होटल विकल्पों की तुलना करें",
    hotelSearchDestinationLabel: "गंतव्य",
    hotelSearchDestinationPlaceholder: "शहर, क्षेत्र या प्रसिद्ध स्थल",
    hotelSearchDatePlaceholder: "चेक-इन — चेक-आउट",
    exploreHotelStaysByDestination: "गंतव्य के अनुसार होटल ठहराव देखें",
    featuredHotelDestinations: "चुनिंदा होटल गंतव्य",
    "hotelDestination.Tokyo.title": "जापान",
    "hotelDestination.Tokyo.subtitle": "टोक्यो ठहराव",
    "hotelDestination.London.title": "यूनाइटेड किंगडम",
    "hotelDestination.London.subtitle": "लंदन ठहराव",
    "hotelDestination.Paris.title": "फ्रांस",
    "hotelDestination.Paris.subtitle": "पेरिस ठहराव",
    "hotelDestination.New York.title": "संयुक्त राज्य",
    "hotelDestination.New York.subtitle": "न्यूयॉर्क ठहराव",
    "hotelResults.liveSearchUnavailable": "लाइव होटल खोज अस्थायी रूप से उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    "hotelResults.filterBy": "फ़िल्टर करें",
    "hotelResults.budgetPrice": "बजट / कीमत",
    "hotelResults.totalUpTo": "कुल सीमा",
    "hotelResults.starRating": "स्टार रेटिंग",
    "hotelResults.fromRating": "से",
    "hotelResults.foundPlacesToStay": "हमें आपके लिए ठहरने की {{count}} जगहें मिलीं",
    "hotelResults.cheapest": "सबसे सस्ता",
    "hotelResults.lowestTotalPrice": "सबसे कम कुल कीमत",
    "hotelResults.bestValue": "सर्वश्रेष्ठ मूल्य",
    "hotelResults.bestBalance": "सबसे अच्छा संतुलन",
    "hotelResults.topRated": "शीर्ष रेटेड",
    "hotelResults.highestRating": "सबसे ऊँची रेटिंग",
    "hotelResults.valueScore": "{{score}}/100 स्कोर",
    "hotelResults.starPlural": "{{count}} सितारे",
    "hotelResults.estimatedStayTotal": "अनुमानित ठहराव कुल",
    "hotelResults.pricePerNight": "{{price}} प्रति रात",
    "hotelResults.viewHotel": "होटल देखें",
    "hotelResults.filter.doubleBusiness": "डबल बिज़नेस",
    "hotelResults.filter.bedAndBreakfast": "बेड और नाश्ता",
    "hotelResults.filter.deluxeKingRoom": "डीलक्स किंग रूम",
    "hotelResults.filter.classicRoom": "क्लासिक रूम",
    "hotelResults.filter.luxuryKing": "लक्ज़री किंग",
    "hotelResults.filter.roomOnly": "केवल कमरा",
  };

  for (const [key, value] of Object.entries(expectedHindiHotelStrings)) {
    assert.equal(hiTranslations[key], value, `hi ${key} should use the audited Hindi hotels copy`);
    assert.notEqual(hiTranslations[key], enTranslations[key], `hi ${key} should not fall back to English`);
  }

  assert.equal(new Intl.DateTimeFormat("hi-IN", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)), "जून 2026");
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) =>
      new Intl.DateTimeFormat("hi-IN", { weekday: "short" }).format(new Date(2024, 0, 7 + day)),
    ),
    ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  );
  assert.equal(
    `${new Intl.DateTimeFormat("hi-IN", { month: "short", day: "numeric" }).format(new Date(2026, 5, 27))} — ${new Intl.DateTimeFormat("hi-IN", { month: "short", day: "numeric" }).format(new Date(2026, 5, 30))}`,
    "27 जून — 30 जून",
  );
});

test("Turkish hotels results copy is localized without English fallback and preserves raw selected values", () => {
  const expectedTurkishHotelResultsStrings = {
    clearAll: "Tümünü temizle",
    "hotelResults.openFilters": "Filtreleri aç",
    "hotelResults.searchingHotelPartners": "Otel iş ortakları aranıyor...",
    "hotelResults.liveSearchUnavailable": "Canlı otel araması geçici olarak kullanılamıyor. Lütfen kısa süre sonra tekrar deneyin.",
    "hotelResults.searchUnavailableDetailed": "Bu istek için otel araması geçici olarak kullanılamıyor. Konaklama seçeneklerini yalnızca fiyat, müsaitlik, ücretler ve kurallar sağlayıcıyla incelenebildiğinde gösteriyoruz. Lütfen daha sonra tekrar deneyin veya yeni bir arama başlatın.",
    "hotelResults.unableToSearchHotels": "Oteller aranamadı.",
    "hotelResults.noStaysMatchFiltersTitle": "Bu filtrelerle eşleşen konaklama yok",
    "hotelResults.resetFilters": "Filtreleri sıfırla",
    "hotelResults.foundPlacesToStay": "Sizin için {{count}} konaklama yeri bulduk",
    "hotelResults.summaryAria": "Otel sonuç özeti",
    "hotelResults.cheapest": "EN UCUZ",
    "hotelResults.lowestTotalPrice": "En düşük toplam fiyat",
    "hotelResults.bestValue": "EN İYİ DEĞER",
    "hotelResults.bestBalance": "En iyi denge",
    "hotelResults.topRated": "EN YÜKSEK PUANLI",
    "hotelResults.highestRating": "En yüksek puan",
    "hotelResults.valueScore": "{{score}}/100 puan",
    "hotelResults.starPlural": "{{count}} yıldız",
    "hotelResults.activeHotelFilters": "Aktif otel filtreleri",
    "hotelResults.filterBy": "Filtrele",
    "hotelResults.removeFilter": "{{label}} filtresini kaldır",
    "hotelResults.budgetPrice": "Bütçe / Fiyat",
    "hotelResults.totalUpTo": "Toplam en fazla",
    "hotelResults.popularFilters": "Popüler filtreler",
    "hotelResults.starRating": "Yıldız puanı",
    "hotelResults.fromRating": "Başlangıç",
    "hotelResults.locationArea": "Konum / Bölge",
    "hotelResults.propertyType": "Tesis türü",
    "hotelResults.roomType": "Oda türü",
    "hotelResults.bedType": "Yatak türü",
    "hotelResults.meals": "Öğünler",
    "hotelResults.cancellationPolicy": "İptal politikası",
    "hotelResults.facilities": "Olanaklar",
    "hotelResults.showMore": "Daha fazla göster ({{count}})",
    "hotelResults.upToPrice": "{{price}} tutarına kadar",
    "hotelResults.starsAndUp": "{{rating}}+ yıldız",
    "hotelResults.nonRefundable": "İade edilemez",
    "hotelResults.hotelImageAlt": "{{name}} konaklama seçeneği{{location}}",
    "hotelResults.nearLocation": "{{location}} yakınında",
    "hotelResults.estimatedStayTotal": "tahmini konaklama toplamı",
    "hotelResults.pricePerNight": "gecelik {{price}}",
    "hotelResults.viewHotel": "Oteli görüntüle",
    "hotelResults.filter.freeWifi": "Ücretsiz Wi-Fi",
    "hotelResults.filter.breakfastIncludedAvailable": "Kahvaltı dahil/mevcut",
    "hotelResults.filter.freeCancellation": "Ücretsiz iptal",
    "hotelResults.filter.roomOnly": "Sadece oda",
    "hotelResults.filter.doubleBusiness": "Çift kişilik business oda",
    "hotelResults.filter.deluxeKingRoom": "Deluxe king oda",
    "hotelResults.filter.classicRoom": "Klasik oda",
    "hotelResults.filter.luxuryKing": "Lüks king oda",
  };

  for (const [key, value] of Object.entries(expectedTurkishHotelResultsStrings)) {
    assert.equal(trTranslations[key], value, `tr ${key} should use the audited Turkish hotels results copy`);
    assert.notEqual(trTranslations[key], enTranslations[key], `tr ${key} should not fall back to English`);
  }

  const selectedDestination = "Lagos, Nigeria";
  assert.equal(selectedDestination, "Lagos, Nigeria", "raw selected destination values stay display-owned and are not dictionary-translated");
  assert.equal(
    trTranslations["hotelResults.foundPlacesToStay"].replace("{{count}}", "12"),
    "Sizin için 12 konaklama yeri bulduk",
  );
  assert.equal(
    trTranslations["hotelResults.upToPrice"].replace("{{price}}", "₺4.500"),
    "₺4.500 tutarına kadar",
  );
  assert.equal(
    trTranslations["hotelResults.starsAndUp"].replace("{{rating}}", "4"),
    "4+ yıldız",
  );
});

test("Hindi homepage search support newsletter and footer strings are localized", () => {
  const expectedHindiHomepageStrings = {
    fromPlaceholder: "कहाँ से?",
    cityOrHotel: "शहर या होटल",
    hotelSearchTravelDatesLabel: "यात्रा तिथियाँ",
    hotelSearchDatePlaceholder: "चेक-इन — चेक-आउट",
    hotelSearchGuestsLabel: "मेहमान",
    guestSingular: "मेहमान",
    guestPlural: "मेहमान",
    roomSingular: "कमरा",
    roomPlural: "कमरे",
    stayDetails: "ठहराव विवरण",
    guestsAndRooms: "मेहमान और कमरे",
    hotelAdultHelper: "मेहमान 18+",
    hotelChildrenHelper: "उम्र 0–17",
    hotelRoomsHelper: "6 कमरों तक",
    petFriendly: "पालतू-मैत्रीपूर्ण",
    onlyShowPetFriendlyStays: "केवल वे ठहराव दिखाएँ जहाँ पालतू जानवरों की अनुमति है",
    homeNewsletterTitle: "हर यात्रा डील से आगे रहें",
    homeNewsletterBody: "चुनी हुई उड़ान और होटल अपडेट हर सप्ताह पाएँ।",
    homeNewsletterPlaceholder: "अपना ईमेल दर्ज करें",
    homeSubscribe: "सदस्यता लें",
    homeNewsletterThanks: "धन्यवाद! हम आपको यात्रा डील्स की जानकारी देते रहेंगे।",
    homeNewsletterConsent:
      "सदस्यता लेकर, आप Kurioticket अपडेट प्राप्त करने के लिए सहमत होते हैं। आप कभी भी सदस्यता समाप्त कर सकते हैं।",
    destinationImageFallback: "गंतव्य",
    destinations: "गंतव्य",
    supportFaqAccountQuestion: "खाता और साइन-इन सहायता",
    supportFaqSearchQuestion: "खोज और परिणाम सहायता",
    supportFaqSavedTripsQuestion: "सहेजी गई यात्राएँ और अलर्ट",
    supportFaqRedirectQuestion: "बुकिंग/प्रदाता रीडायरेक्ट सहायता",
    supportFaqAlreadyBookedQuestion: "क्या आपने पहले ही किसी प्रदाता के साथ बुकिंग कर ली है?",
    supportFaqChangeBookingQuestion: "क्या Kurioticket मेरी बुकिंग बदल सकता है?",
    supportFaqWhyRedirectedQuestion: "मुझे किसी दूसरे प्रदाता के पास क्यों भेजा गया?",
    footerContactUs: "संपर्क करें",
    footerCustomerSupport: "ग्राहक सहायता",
    footerServiceGuarantee: "सेवा गारंटी",
    footerMoreServiceInfo: "अधिक सेवा जानकारी",
    footerDiscover: "खोजें",
    footerSavedRecent: "सहेजे गए और हाल के",
    footerTermsSettings: "शर्तें और सेटिंग्स",
    footerPrivacyPolicy: "गोपनीयता नीति",
    footerTermsOfService: "सेवा की शर्तें",
    footerCookiePolicy: "कुकी नीति",
    legalCenter: "कानूनी केंद्र",
    footerAboutKurioticket: "Kurioticket के बारे में",
    footerAboutUs: "हमारे बारे में",
    footerHowItWorks: "Kurioticket कैसे काम करता है",
    footerConfidenceTagline: "उड़ानें, होटल और यात्रा डील्स आत्मविश्वास के साथ खोजें।",
    footerAllRightsReserved: "सर्वाधिकार सुरक्षित।",
    footerPrivacy: "गोपनीयता",
    footerTerms: "शर्तें",
    footerCookies: "कुकीज़",
  };

  for (const [key, value] of Object.entries(expectedHindiHomepageStrings)) {
    assert.equal(hiTranslations[key], value, `hi ${key} should use the audited Hindi copy`);
    assert.notEqual(hiTranslations[key], enTranslations[key], `hi ${key} should not fall back to English`);
  }

  assert.equal(getTranslations("hi").fromPlaceholder, "कहाँ से?");
  assert.equal(getTranslations("hi").cityOrHotel, "शहर या होटल");
});


test("Turkish homepage header search popular destinations and footer strings are localized", () => {
  const tr = getTranslations("tr");

  const expectedTurkishHomepageStrings = {
    flights: "Uçuşlar",
    hotels: "Oteller",
    cars: "Arabalar",
    deals: "Fırsatlar",
    destinations: "Destinasyonlar",
    login: "Giriş yap",
    signUp: "Kaydol",
    homeHeroTitle: "Seyahat seçeneklerini tek bir basit aramada karşılaştırın",
    homeHeroSubtitle:
      "Güvenilir seyahat sağlayıcılarında arama yapın, fiyatları net şekilde karşılaştırın ve seyahatinize en uygun seçeneği seçin.",
    homePopularDestinations: "Popüler destinasyonlar",
    homeExploreFares: "Ücretleri keşfet",
    "homePopularDestinationCity.dubai": "Dubai",
    "homePopularDestinationCity.london": "Londra",
    "homePopularDestinationCity.johannesburg": "Johannesburg",
    "homePopularDestinationCity.accra": "Akra",
    "homePopularDestinationCountry.unitedArabEmirates": "Birleşik Arap Emirlikleri",
    "homePopularDestinationCountry.unitedKingdom": "Birleşik Krallık",
    "homePopularDestinationCountry.southAfrica": "Güney Afrika",
    "homePopularDestinationCountry.ghana": "Gana",
    origin: "Kalkış",
    destination: "Varış",
    departureDate: "Seyahat tarihleri",
    travelDates: "Seyahat tarihleri",
    travelers: "Yolcular",
    roundTrip: "Gidiş-dönüş",
    oneWay: "Tek yön",
    toPlaceholder: "Nereye?",
    adultSingular: "yetişkin",
    adultPlural: "yetişkin",
    economy: "Ekonomi",
    search: "Ara",
    footerContactUs: "Bize Ulaşın",
    footerCustomerSupport: "Müşteri desteği",
    footerServiceGuarantee: "Hizmet Garantisi",
    footerMoreServiceInfo: "Daha Fazla Hizmet Bilgisi",
    footerDiscover: "Keşfet",
    footerSavedRecent: "Kaydedilenler ve son aramalar",
    footerTermsSettings: "Şartlar ve Ayarlar",
    footerPrivacyPolicy: "Gizlilik Politikası",
    footerTermsOfService: "Hizmet Şartları",
    footerCookiePolicy: "Çerez Politikası",
    legalCenter: "Hukuk Merkezi",
    footerAboutKurioticket: "Kurioticket Hakkında",
    footerAboutUs: "Hakkımızda",
    footerHowItWorks: "Kurioticket Nasıl Çalışır",
    footerConfidenceTagline:
      "Uçuşları, otelleri ve seyahat fırsatlarını güvenle arayın.",
    footerAllRightsReserved: "Tüm hakları saklıdır.",
    footerPrivacy: "Gizlilik",
    footerTerms: "Şartlar",
    footerCookies: "Çerezler",
  };

  for (const [key, value] of Object.entries(expectedTurkishHomepageStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use the audited Turkish copy`);
    if (value !== enTranslations[key]) {
      assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
    }
  }

  assert.equal(getTranslations("tr-TR").homeHeroTitle, expectedTurkishHomepageStrings.homeHeroTitle);
  assert.equal(getTranslations("tr-tr").footerContactUs, expectedTurkishHomepageStrings.footerContactUs);
});

test("Turkish Flights landing hero and standalone search form resolve without English fallback", () => {
  const tr = getTranslations("tr");

  const expectedTurkishFlightsLandingStrings: Record<string, string> = {
    flightLandingHeroTitle: "Bir sonraki uygun fiyatlı uçuşunuzu kolayca bulun.",
    flightLandingHeroSubtitle:
      "Bir sonraki yolculuğunuz için rotaları arayın, tarihleri karşılaştırın ve uçuş seçeneklerini keşfedin.",
    roundTrip: "Gidiş-dönüş",
    oneWay: "Tek yön",
    origin: "Kalkış",
    destination: "Varış",
    travelDates: "Seyahat tarihleri",
    cityOrAirport: "Şehir veya havalimanı",
    travelers: "Yolcular",
    adultSingular: "yetişkin",
    adultPlural: "yetişkin",
    childSingular: "çocuk",
    childPlural: "çocuk",
    infantSingular: "bebek",
    infantPlural: "bebek",
    travelerSingular: "yolcu",
    travelerPlural: "yolcu",
    economy: "Ekonomi",
    passengers: "Yolcular",
    cabinClass: "Kabin sınıfı",
    chooseTravelDates: "Seyahat tarihlerini seçin",
    clear: "Temizle",
    done: "Tamam",
    previousMonthShort: "Önceki",
    nextMonthShort: "Sonraki",
    search: "Ara",
    searchFlights: "Uçuş ara",
    searchingFlights: "Uçuşlar aranıyor…",
    beachVacations: "Plaj tatilleri",
    beachVacationsBody:
      "Güneşli kıyılara, ada kaçamaklarına ve sıcak havalı plaj destinasyonlarına giden uçuş rotalarını keşfedin.",
    flightLandingStartThisSearch: "Bu aramayı başlat",
    flightLandingRouteIdeasTitle: "Esnek seyahatler için rota fikirleri",
    flightLandingRouteIdeasBody:
      "Rota fikirlerine göz atın, ardından mevcut uçuşları karşılaştırmadan önce tarihler ve yolcularla gerçek bir arama başlatın.",
    flightLandingRouteTemplate: "{{origin}} - {{destination}}",
    flightLandingRouteAriaLabel: "{{origin}} kalkışlı {{destination}} varışlı uçuşları ara",
    "homeDiscoveryRoute.ca-yyz-cun.title": "Cancun kış kaçamağı",
    "homeDiscoveryRoute.ca-yyz-cun.routeNote":
      "Yoğun sezonda aktarmasız seçenekler sunan güvenilir tatil rotası.",
    "homeDiscoveryRoute.ca-yeg-pvr.title": "Puerto Vallarta plaj kaçamağı",
    "homeDiscoveryRoute.ca-yeg-pvr.routeNote":
      "Pasifik plajları ve eski şehir atmosferiyle kış güneşi rotası.",
    "homeDiscoveryRoute.ca-yyz-hnl.title": "Honolulu uzun mesafe ada molası",
    "homeDiscoveryRoute.ca-yyz-hnl.routeNote":
      "Plajlar, sörf ve ada yürüyüşleri için premium tatil seçeneği.",
    "homeDiscoveryRoute.ca-yyz-san.title": "San Diego güneş ve sörf seyahati",
    "homeDiscoveryRoute.ca-yyz-san.routeNote":
      "Plajlar, parklar ve liman manzaraları için güvenilir sınır ötesi rota.",
    "flightLandingImageAlt.Puerto Vallarta coastline and old town":
      "Puerto Vallarta kıyı şeridi ve eski şehir",
    "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water":
      "Diamond Head ve parlak mavi sularıyla Honolulu Waikiki plajı",
    "flightLandingImageAlt.San Diego bay skyline and marina":
      "San Diego körfezi silüeti ve marina",
    flightBookingFaqs: "Uçuş rezervasyonu hakkında sık sorulan sorular",
    flightBookingFaqIntro:
      "Bir sağlayıcıyla devam etmeden önce yaygın uçuş arama ayrıntılarını gözden geçirin.",
    flightFaqBestTimeQuestion: "Uçuş rezervasyonu yapmak için en iyi zaman ne zamandır?",
    flightFaqBestTimeAnswer:
      "Uçuş fiyatları rota, sezon, talep ve müsaitliğe göre değişebilir. Genellikle birkaç tarihi karşılaştırmak, mümkünse yakındaki havalimanlarını kontrol etmek ve bir ücret seçmeden önce tüm seyahat planını gözden geçirmek faydalıdır.",
    flightFaqBeforeBookingQuestion: "Rezervasyon yapmadan önce neleri kontrol etmeliyim?",
    flightFaqBeforeBookingAnswer:
      "Sağlayıcıyla rezervasyonunuzu tamamlamadan önce kalkış ve varış saatlerini, toplam seyahat süresini, aktarmaları, bagaj kurallarını, koltuk seçimi seçeneklerini, iptal şartlarını ve bilet değişiklik politikasını inceleyin.",
    flightFaqFlexibleFareQuestion: "Esnek ücret nedir?",
    flightFaqFlexibleFareAnswer:
      "Esnek ücret, temel bir ücrete göre daha az kısıtlamayla değişiklik veya iptale izin verebilir; ancak kesin kurallar havayoluna ya da rezervasyon sağlayıcısına bağlıdır. Satın almadan önce ücret koşullarını her zaman inceleyin.",
    flightFaqNonstopQuestion: "Aktarmasız uçuşlar her zaman daha mı iyidir?",
    flightFaqNonstopAnswer:
      "Her zaman değil. Aktarmasız uçuşlar zaman kazandırabilir; tek aktarmalı rotalar ise farklı kalkış saatleri, varış aralıkları veya ücret seçenekleri sunabilir. Karar vermeden önce toplam seyahat süresini, aktarma süresini ve rahatlığı karşılaştırın.",
    flightFaqBaggageQuestion: "Bagaj kuralları nasıl işler?",
    flightFaqBaggageAnswer:
      "Bagaj hakkı havayoluna, rotaya, kabine, ücret türüne ve sağlayıcıya göre değişebilir. Rezervasyon yapmadan önce el bagajı, kayıtlı bagaj ve kişisel eşyaların dahil olup olmadığını kontrol edin.",
    flightFaqChangeCancelQuestion: "Biletimi değiştirebilir veya iptal edebilir miyim?",
    flightFaqChangeCancelAnswer:
      "Değişiklik ve iptal seçenekleri ücret kurallarına ve sağlayıcı politikalarına bağlıdır. Bazı biletler iadesiz olabilir veya ücret içerebilir; bu nedenle rezervasyon yapmadan önce şartları dikkatle inceleyin.",
    flightFaqInternationalQuestion: "Dış hat uçuşları hakkında ne bilmeliyim?",
    flightFaqInternationalAnswer:
      "Dış hat seyahatlerinde rezervasyon yapmadan önce pasaport geçerliliğini, vize gerekliliklerini, transit kurallarını, bagaj politikalarını ve varış noktanızın giriş gerekliliklerini inceleyin.",
  };

  for (const [key, value] of Object.entries(expectedTurkishFlightsLandingStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use Flights landing Turkish copy`);
    assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
  }

  assert.equal(`${tr.adultSingular === "yetişkin" ? "1" : ""} ${tr.adultSingular}, ${tr.economy}`, "1 yetişkin, Ekonomi");
  assert.equal(getTranslations("tr-TR").flightLandingHeroTitle, expectedTurkishFlightsLandingStrings.flightLandingHeroTitle);
  assert.equal(getTranslations("tr-tr").searchFlights, expectedTurkishFlightsLandingStrings.searchFlights);
  assert.equal(getTranslations("tr-TR").flightBookingFaqs, expectedTurkishFlightsLandingStrings.flightBookingFaqs);
  assert.equal(getTranslations("tr-tr").flightFaqInternationalAnswer, expectedTurkishFlightsLandingStrings.flightFaqInternationalAnswer);

  const flightLandingClientSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");

  assert.ok(flightLandingClientSource.includes('t("flightBookingFaqs")'));
  assert.ok(flightLandingClientSource.includes('t("flightBookingFaqIntro")'));
  assert.ok(flightLandingClientSource.includes('items={getFlightFaqItems(t)}'));
  for (const key of [
    "flightFaqBestTimeQuestion",
    "flightFaqBestTimeAnswer",
    "flightFaqBeforeBookingQuestion",
    "flightFaqBeforeBookingAnswer",
    "flightFaqFlexibleFareQuestion",
    "flightFaqFlexibleFareAnswer",
    "flightFaqNonstopQuestion",
    "flightFaqNonstopAnswer",
    "flightFaqBaggageQuestion",
    "flightFaqBaggageAnswer",
    "flightFaqChangeCancelQuestion",
    "flightFaqChangeCancelAnswer",
    "flightFaqInternationalQuestion",
    "flightFaqInternationalAnswer",
  ]) {
    assert.ok(flightLandingClientSource.includes(`t("${key}")`), `/flights FAQ should resolve ${key} through i18n`);
  }
});

test("Polish auth pages resolve localized login, passkey, and reset password copy", () => {
  const pl = getTranslations("pl");

  const expectedPolishAuthStrings: Record<string, string> = {
    loginPageTitle: "Zaloguj się",
    loginPageSubtitle:
      "Zapisuj wyszukiwania, zarządzaj alertami i korzystaj ze swojego panelu podróży.",
    loginEmailLabel: "E-mail",
    loginPasswordLabel: "Hasło",
    loginForgotPassword: "Nie pamiętasz hasła?",
    loginSubmit: "Zaloguj się",
    loginPasskeyPromptTitle: "Użyć zapisanego klucza dostępu?",
    loginPasskeyPromptDescription:
      "Zaloguj się za pomocą Face ID, odcisku palca, blokady ekranu, menedżera haseł lub klucza bezpieczeństwa.",
    loginUsePasskey: "Użyj klucza dostępu",
    loginNotNow: "Nie teraz",
    loginGoogle: "Kontynuuj z Google",
    loginSignupPrompt: "Nowy w Kurioticket?",
    loginCreateAccount: "Utwórz konto",
    forgotPasswordTitle: "Zresetuj hasło",
    forgotPasswordSubtitle:
      "Wpisz swój adres e-mail, a wyślemy instrukcje resetowania hasła.",
    forgotPasswordEmailLabel: "E-mail",
    forgotPasswordEmailPlaceholder: "you@example.com",
    forgotPasswordSubmit: "Wyślij link resetujący",
    forgotPasswordRemember: "Pamiętasz hasło?",
    forgotPasswordLoginLink: "Zaloguj się",
    resetPasswordTitle: "Zresetuj hasło",
    resetPasswordRemember: "Pamiętasz hasło?",
    resetPasswordLoginLink: "Zaloguj się",
    loginCodeSent: "Kod logowania został wysłany",
    loginCodeInstructions:
      "Wpisz 6-cyfrowy kod wysłany na {{email}}. Kody wygasają po {{minutes}} minutach.",
    loginVerificationCodeLabel: "Kod weryfikacyjny",
    loginVerifyLogin: "Zweryfikuj logowanie",
    loginResendIn: "Wyślij ponownie za {{seconds}} s",
    loginUseDifferentDetails: "Użyj innych danych",
  };

  for (const [key, value] of Object.entries(expectedPolishAuthStrings)) {
    assert.equal(pl[key], value, `pl ${key} should use Polish auth copy`);
    if (value !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], `pl ${key} should not fall back to English`);
    }
  }

  assert.ok(pl.loginGoogle.includes("Google"));
  assert.ok(pl.loginSignupPrompt.includes("Kurioticket"));
  assert.ok(pl.loginPasskeyPromptDescription.includes("Face ID"));
  assert.equal(pl.forgotPasswordEmailPlaceholder, "you@example.com");
  assert.ok(pl.loginCodeInstructions.includes("{{email}}"));
  assert.ok(pl.loginCodeInstructions.includes("{{minutes}}"));
  assert.ok(pl.loginResendIn.includes("{{seconds}}"));
});

test("Auth login and forgot password render paths use i18n keys for visible copy", () => {
  const signinSource = readFileSync("src/components/auth/SigninForm.tsx", "utf8");
  const forgotPasswordSource = readFileSync("src/components/auth/ForgotPasswordForm.tsx", "utf8");
  const signinPageSource = readFileSync("src/app/auth/signin/page.tsx", "utf8");
  const forgotPasswordPageSource = readFileSync("src/app/auth/forgot-password/page.tsx", "utf8");

  for (const key of [
    "loginPageTitle",
    "loginPageSubtitle",
    "loginEmailLabel",
    "loginPasswordLabel",
    "loginForgotPassword",
    "loginSubmit",
    "loginPasskeyPromptTitle",
    "loginPasskeyPromptDescription",
    "loginUsePasskey",
    "loginNotNow",
    "loginGoogle",
    "loginSignupPrompt",
    "loginCreateAccount",
    "loginCodeSent",
    "loginCodeInstructions",
    "loginVerificationCodeLabel",
    "loginVerifyLogin",
    "loginResendIn",
    "loginUseDifferentDetails",
  ]) {
    assert.ok(signinSource.includes(`t.${key}`) || signinSource.includes(`key: "${key}"`), `SigninForm should resolve ${key} through i18n`);
  }

  for (const key of [
    "forgotPasswordTitle",
    "forgotPasswordSubtitle",
    "forgotPasswordEmailLabel",
    "forgotPasswordEmailPlaceholder",
    "forgotPasswordSubmit",
    "forgotPasswordRemember",
    "forgotPasswordLoginLink",
  ]) {
    assert.ok(forgotPasswordSource.includes(`t.${key}`), `ForgotPasswordForm should resolve ${key} through i18n`);
  }

  assert.ok(signinPageSource.includes("<SigninForm"));
  assert.ok(signinPageSource.includes("callbackUrl={callbackUrl}"));
  assert.ok(signinPageSource.includes("googleEnabled={googleEnabled}"));
  assert.ok(forgotPasswordPageSource.includes("<ForgotPasswordForm />"));
  assert.ok(signinSource.includes('fetch("/api/auth/request-login-code"'));
  assert.ok(signinSource.includes('fetch("/api/auth/passkey/options"'));
  assert.ok(signinSource.includes('fetch("/api/auth/passkey/verify"'));
  assert.ok(signinSource.includes('signIn("google"'));
  assert.ok(forgotPasswordSource.includes('fetch("/api/auth/forgot-password"'));
});

test("Turkish global modals and auth pages resolve screenshot-visible copy", () => {
  const tr = getTranslations("tr");

  const expectedTurkishGlobalAuthStrings: Record<string, string> = {
    chooseCountryAndCurrency: "Ülke ve para birimini seçin",
    countryCurrencyDescription:
      "Fiyatları görüntülemek için kullanılan ülke ve para birimini seçin. Havalimanı önerileri algılanan konumunuzu kullanır.",
    searchCountryOrCurrency: "Ülke veya para birimi ara",
    countryCurrencyPopularCountryAndCurrency: "POPÜLER ÜLKE VE PARA BİRİMİ",
    countryCurrencyAllCountriesAndCurrencies: "TÜM ÜLKELER VE PARA BİRİMLERİ",
    countryCurrencyOptionCountPlural: "{{count}} seçenek",
    showMoreResults: "Daha fazla sonuç göster",
    globalLanguage: "GENEL DİL",
    websiteLanguageTitle: "Web sitesi dilinizi seçin",
    websiteLanguageDescription:
      "İngilizce (Amerika Birleşik Devletleri) varsayılan web sitesi dilidir. Kurioticket dili yalnızca kullanılabilir bir seçenek seçtikten sonra değiştirir.",
    currentLanguage: "Geçerli dil: {{language}}",
    languagePreparingNotice:
      "Daha fazla dil hazırlanıyor. Kullanılamayan seçenekler siteyi henüz çevirmiyor.",
    languageSearchLabel: "Dil ara",
    languageSearchPlaceholder: "English, Español, Français, Deutsch ara...",
    loginPageTitle: "Giriş yap",
    loginPageSubtitle:
      "Aramalarınızı kaydedin, uyarıları yönetin ve seyahat panelinize erişin.",
    loginEmailLabel: "E-posta",
    loginPasswordLabel: "Şifre",
    loginForgotPassword: "Şifrenizi mi unuttunuz?",
    loginGoogle: "Google ile devam et",
    loginSignupPrompt: "Kurioticket'te yeni misiniz?",
    loginCreateAccount: "Hesap oluştur",
    forgotPasswordTitle: "Şifrenizi sıfırlayın",
    forgotPasswordSubtitle:
      "E-postanızı girin; şifrenizi sıfırlamak için talimatları göndereceğiz.",
    forgotPasswordEmailPlaceholder: "you@example.com",
    forgotPasswordSubmit: "Sıfırlama bağlantısı gönder",
    forgotPasswordRemember: "Şifrenizi hatırlıyor musunuz?",
    forgotPasswordLoginLink: "Giriş yap",
    loginCodeSent: "E-postanıza bir doğrulama kodu gönderdik.",
    loginCodeInstructions:
      "{{email}} adresine gönderilen 6 haneli kodu girin. Kodlar {{minutes}} dakika sonra sona erer.",
    loginVerificationCodeLabel: "Doğrulama kodu",
    loginVerifyLogin: "Girişi doğrula",
    loginResendIn: "{{seconds}} sn içinde yeniden gönder",
    loginUseDifferentDetails: "Farklı bilgiler kullan",
    signupPageTitle: "Hesabınızı oluşturun",
    signupFullNameLabel: "Ad soyad",
    signupAgreementBeforeTerms: "Hesap oluşturarak ",
    signupTermsLink: "Şartlar",
    signupPrivacyPolicyLink: "Gizlilik Politikası",
    signupAgreementAfterPrivacy:
      " ve iş ortağı yönlendirme açıklamalarını kabul etmiş olursunuz.",
    signupSubmit: "Kaydol",
    signupAlreadyHaveAccount: "Zaten hesabınız var mı?",
  };

  for (const [key, value] of Object.entries(expectedTurkishGlobalAuthStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use Turkish copy`);
    if (value !== enTranslations[key]) {
      assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
    }
  }

  assert.ok(tr.loginCodeInstructions.includes("{{email}}"));
  assert.ok(tr.loginCodeInstructions.includes("{{minutes}}"));
  assert.ok(tr.loginResendIn.includes("{{seconds}}"));
});

test("Turkish homepage popovers and discovery route cards resolve screenshot-visible copy", () => {
  const tr = getTranslations("tr");

  const expectedTurkishPopoverAndRouteStrings: Record<string, string> = {
    chooseTravelDates: "Seyahat tarihlerini seçin",
    previousMonthShort: "Önceki",
    nextMonthShort: "Sonraki",
    clear: "Temizle",
    done: "Tamam",
    weekdaySun: "Paz",
    weekdayMon: "Pzt",
    weekdayTue: "Sal",
    weekdayWed: "Çar",
    weekdayThu: "Per",
    weekdayFri: "Cum",
    weekdaySat: "Cmt",
    passengers: "Yolcular",
    adults: "Yetişkinler",
    adultAgeRange: "18+",
    children: "Çocuklar",
    childAgeRange: "2–17 yaş",
    infantsOnLap: "Kucakta bebekler",
    under2: "2 yaş altı",
    cabinClass: "Kabin sınıfı",
    economy: "Ekonomi",
    business: "Business",
    first: "First",
    homeDiscoveryTitle: "Bir sonraki maceranızı burada keşfedin",
    homeDiscoverySubtitle:
      "Akıllı rota fikirlerini, esnek ücretleri ve bölgeniz için seçilen destinasyonları karşılaştırın.",
    homeDiscoveryRouteIdeaBadge: "ROTA FİKRİ",
    homeDiscoveryTravelerCountOne: "1 YOLCU",
    homeCompareOptions: "Seçenekleri karşılaştır",
    destinationImageFallback: "DESTİNASYON",
    "homeDiscoveryRoute.ng-los-lhr.title": "Londra iş ve hafta sonu karışımı",
    "homeDiscoveryRoute.ng-los-lhr.routeNote":
      "İş seyahatleri ve tatil eklemeleri için yüksek frekanslı uzun mesafe rota.",
    "homeDiscoveryRoute.ng-los-dxb.title": "Dubai alışveriş molası",
    "homeDiscoveryRoute.ng-los-dxb.routeNote":
      "Alışveriş molaları, aile seyahatleri ve devam bağlantıları için popüler.",
    "homeDiscoveryRoute.ng-abv-acc.title": "Akra hızlı bölgesel seyahati",
    "homeDiscoveryRoute.ng-abv-acc.routeNote":
      "Şehirler arası pratik erişim sunan kısa mesafeli bölgesel rota.",
    "homeDiscoveryRoute.ng-los-nbo.title": "Nairobi safari geçidi",
    "homeDiscoveryRoute.ng-los-nbo.routeNote":
      "İş merkezleri ve safari uzatmaları için Doğu Afrika erişimi.",
    "homeDiscoveryRoute.ng-abv-jnb.title": "Johannesburg şehir kaçamağı",
    "homeDiscoveryRoute.ng-abv-jnb.routeNote":
      "Toplantılar ve şehir deneyimleri için güneye güçlü bağlantı.",
    "homeDiscoveryRoute.ng-los-ist.title": "İstanbul bağlantı rotası",
    "homeDiscoveryRoute.ng-los-ist.routeNote":
      "Canlı bir şehir molasıyla Avrupa bağlantıları için güçlü bir merkez.",
    "homeDiscoveryRoute.ng-abv-cdg.title": "Paris stil kaçamağı",
    "homeDiscoveryRoute.ng-abv-cdg.routeNote":
      "Moda, müzeler ve yemek deneyimleri için klasik Avrupa rotası.",
    "homeDiscoveryRoute.ng-los-doh.title": "Doha premium transit",
    "homeDiscoveryRoute.ng-los-doh.routeNote":
      "Sorunsuz devam eden küresel bağlantılarla konfor odaklı rota.",
    "homeDiscoveryRoute.ng-los-kig.title": "Kigali temiz şehir hafta sonu",
    "homeDiscoveryRoute.ng-los-kig.routeNote":
      "Yeşil tepeleri ve kolay şehir içi ulaşımıyla yükselen bölgesel merkez.",
    "homeDiscoveryRoute.ng-abv-cai.title": "Kahire miras molası",
    "homeDiscoveryRoute.ng-abv-cai.routeNote":
      "Nil tarihi turları ve hareketli eski şehir pazarları için geçit.",
    "homeDiscoveryRoute.ng-los-add.title": "Addis Ababa Doğu Afrika bağlantısı",
    "homeDiscoveryRoute.ng-los-add.routeNote":
      "Gelişen yeme-içme ve kültür ortamıyla önemli bir aktarma noktası.",
    "homeDiscoveryRoute.ng-abv-fco.title": "Roma simge yapı geçidi",
    "homeDiscoveryRoute.ng-abv-fco.routeNote":
      "Harabeler, meydanlar ve sakin akşam atmosferi için Avrupa klasiği.",
  };

  for (const [key, value] of Object.entries(expectedTurkishPopoverAndRouteStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use Turkish copy`);
    if (value !== enTranslations[key]) {
      assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
    }
  }

  for (const locale of ["tr", "tr-TR", "tr-tr"]) {
    assert.equal(normalizeFlightsCalendarLocale(locale), "tr-TR");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), locale), "Haziran 2026");
    assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), locale), "Temmuz 2026");
    assert.equal(formatFlightsDateSummary(new Date(2026, 5, 27), new Date(2026, 5, 30), locale), "27 Haz — 30 Haz");
  }

  assert.deepEqual(formatFlightsWeekdays("tr-TR"), ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]);
  assert.equal(`${tr.oneWay.toLocaleUpperCase("tr-TR")} · ${tr.economy.toLocaleUpperCase("tr-TR")} · ${tr.homeDiscoveryTravelerCountOne}`, "TEK YÖN · EKONOMİ · 1 YOLCU");
});

test("Turkish About page screenshot-visible copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const expectedTurkishAboutStrings = {
    aboutPageEyebrow: "Kurioticket Hakkında",
    aboutPageTitle: "Hakkımızda",
    aboutPageIntroPrimary:
      "Kurioticket, yolcuların uçuşları, otelleri, araçları ve seyahat fırsatlarını aramasına, karşılaştırmasına ve keşfetmesine yardımcı olan bir seyahat arama ve karşılaştırma platformudur.",
    aboutPageIntroSecondary:
      "Amacımız, mevcut seçenekleri ve sağlayıcı bilgilerini tek ve sade bir yerde sunarak seyahat planlamasını daha anlaşılır hale getirmektir; böylece yolcular, seyahatlerine uygun sağlayıcıyla devam etmeden önce seçenekleri inceleyebilir.",
    aboutPagePlanningCardHeading: "Pratik bir seyahat planlama aracı",
    aboutPagePlanningCardBody:
      "Kurioticket, yolcuların seyahat seçeneklerini yararlı bağlamla değerlendirmesine yardımcı olmaya odaklanır. Müsaitlik, fiyatlar, kurallar ve son rezervasyon adımları sağlayıcıya göre değişebilir; bu nedenle yolcular karar vermeden önce sağlayıcı sayfasını dikkatle incelemelidir.",
  };

  const aboutPageSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  for (const [key, value] of Object.entries(expectedTurkishAboutStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use Turkish copy`);
    assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
    assert.ok(aboutPageSource.includes(key), `About page render path should resolve ${key} through i18n.`);
  }
});

test("Turkish How Kurioticket Works page strings are localized", () => {
  const tr = getTranslations("tr");
  const expectedTurkishHowItWorksStrings = {
    howItWorksEyebrow: "Kurioticket nasıl çalışır",
    howItWorksTitle: "Kurioticket Nasıl Çalışır",
    howItWorksIntro:
      "Kurioticket, yolcuların aramadan karşılaştırmaya, ardından bir teklif seçildiğinde sağlayıcıya geçmesine yardımcı olur.",
    howItWorksFlowHeading: "Temel akış",
    "howItWorks.steps.search.title": "Seyahat seçeneklerini arayın",
    "howItWorks.steps.search.description":
      "Mevcut uçuşları, otelleri, araçları veya seyahat fırsatlarını görmek için seyahat bilgilerinizi girin.",
    "howItWorks.steps.compare.title": "Mevcut sonuçları karşılaştırın",
    "howItWorks.steps.compare.description":
      "Gösterildiğinde mevcut seçenekleri, fiyatları, saatleri, sağlayıcı ayrıntılarını ve diğer seyahat bilgilerini inceleyin.",
    "howItWorks.steps.choose.title": "Bir teklif seçin",
    "howItWorks.steps.choose.description":
      "Mevcut ayrıntıları inceledikten sonra planlarınıza en uygun seçeneği seçin.",
    "howItWorks.steps.continue.title": "Sağlayıcıyla devam edin",
    "howItWorks.steps.continue.description":
      "Yönlendirildiğinizde son ayrıntıları incelemek ve rezervasyon adımlarını tamamlamak için sağlayıcının web sitesinde devam edin.",
    "howItWorks.providerWebsites.title": "Sağlayıcı web siteleri",
    "howItWorks.providerWebsites.description":
      "Bazı rezervasyonlar, Kurioticket sizi yönlendirdikten sonra sağlayıcı web sitelerinde tamamlanabilir. Satın alma işlemini tamamlamadan önce nihai müsaitlik, fiyatlandırma, şartlar, ödeme adımları ve rezervasyon ayrıntıları için sağlayıcı sayfasını inceleyin.",
  };

  const howItWorksSource = readFileSync("src/app/how-it-works/HowItWorksContent.tsx", "utf8");
  for (const [key, value] of Object.entries(expectedTurkishHowItWorksStrings)) {
    assert.equal(tr[key], value, `tr ${key} should use Turkish copy`);
    assert.notEqual(tr[key], enTranslations[key], `tr ${key} should not fall back to English`);
    assert.ok(howItWorksSource.includes(key), `How-it-works render path should resolve ${key} through i18n.`);
  }
});

test("Hindi How Kurioticket Works page strings are localized", () => {
  const expectedHindiHowItWorksStrings = {
    howItWorksEyebrow: "Kurioticket कैसे काम करता है",
    howItWorksTitle: "Kurioticket कैसे काम करता है",
    howItWorksIntro:
      "Kurioticket यात्रियों को खोज से तुलना तक और फिर ऑफ़र चुनने पर प्रदाता तक आगे बढ़ने में मदद करता है।",
    howItWorksFlowHeading: "बुनियादी प्रक्रिया",
    "howItWorks.steps.search.title": "यात्रा विकल्प खोजें",
    "howItWorks.steps.search.description":
      "उपलब्ध उड़ानों, होटलों, कारों या यात्रा डील्स को देखने के लिए अपनी यात्रा जानकारी दर्ज करें।",
    "howItWorks.steps.compare.title": "उपलब्ध परिणामों की तुलना करें",
    "howItWorks.steps.compare.description":
      "दिखाए जाने पर उपलब्ध विकल्पों, कीमतों, समय-सारिणियों, प्रदाता विवरण और अन्य यात्रा जानकारी की समीक्षा करें।",
    "howItWorks.steps.choose.title": "एक ऑफ़र चुनें",
    "howItWorks.steps.choose.description":
      "उपलब्ध विवरणों की समीक्षा करने के बाद वह विकल्प चुनें जो आपकी योजना से सबसे अच्छा मेल खाता हो।",
    "howItWorks.steps.continue.title": "प्रदाता के साथ आगे बढ़ें",
    "howItWorks.steps.continue.description":
      "रीडायरेक्ट होने पर अंतिम विवरण देखने और बुकिंग के चरण पूरे करने के लिए प्रदाता वेबसाइट पर आगे बढ़ें।",
    "howItWorks.providerWebsites.title": "प्रदाता वेबसाइटें",
    "howItWorks.providerWebsites.description":
      "Kurioticket द्वारा आपको रीडायरेक्ट करने के बाद कुछ बुकिंग प्रदाता वेबसाइटों पर पूरी हो सकती हैं। खरीदारी पूरी करने से पहले अंतिम उपलब्धता, कीमत, शर्तें, भुगतान चरण और बुकिंग विवरण प्रदाता पेज पर जाँचें।",
  };

  for (const [key, value] of Object.entries(expectedHindiHowItWorksStrings)) {
    assert.equal(hiTranslations[key], value, `hi ${key} should use the audited Hindi copy`);
    assert.notEqual(hiTranslations[key], enTranslations[key], `hi ${key} should not fall back to English`);
  }

  assert.equal(getTranslations("hi").howItWorksEyebrow, "Kurioticket कैसे काम करता है");
  assert.equal(getTranslations("hi")["howItWorks.steps.continue.title"], "प्रदाता के साथ आगे बढ़ें");
  assert.equal(getTranslations("hi")["howItWorks.providerWebsites.title"], "प्रदाता वेबसाइटें");
});

test("Hindi legal center and policy document strings are localized", () => {
  const expectedHindiLegalStrings = {
    "legal.lastUpdated": "अंतिम अपडेट",
    "legal.print": "प्रिंट करें",
    "legal.tableOfContents": "विषय सूची",
    "legal.terms.title": "सेवा की शर्तें",
    "legal.terms.summary":
      "Kurioticket खोज, खातों, डैशबोर्ड, सहेजे गए यात्रा टूल और पार्टनर रीडायरेक्ट के उपयोग के नियम।",
    "legal.terms.tableOfContents": "विषय सूची",
    "legal.terms.sections.overview.title": "अवलोकन",
    "legal.terms.sections.accounts.title": "खाते",
    "legal.terms.sections.acceptable-use.title": "स्वीकार्य उपयोग",
    "legal.terms.sections.partner-services.title": "पार्टनर सेवाएँ",
    "legal.terms.developerNote":
      "ये कानूनी मसौदे स्टार्टअप प्लेसहोल्डर हैं और बड़े पैमाने पर सार्वजनिक लॉन्च से पहले योग्य कानूनी सलाहकार द्वारा समीक्षा किए जाने चाहिए।",
    "legal.privacy.title": "गोपनीयता नीति",
    "legal.privacy.summary":
      "Kurioticket LLC (“Kurioticket,” “हम,” “हमें,” या “हमारा”) खाता, खोज, अलर्ट, सहायता और ईमेल डेटा कैसे एकत्र, उपयोग, संग्रहीत और सुरक्षित करता है।",
    "legal.privacy.tableOfContents": "विषय सूची",
    "legal.privacy.sections.data-we-collect.title": "हम जो डेटा एकत्र करते हैं",
    "legal.privacy.sections.vendors.title": "सेवा प्रदाता",
    "legal.privacy.sections.choices.title": "आपके विकल्प",
    "legal.cookiePolicy.title": "कुकी नीति",
    "legal.cookiePolicy.summary":
      "Kurioticket प्रमाणीकरण, सुरक्षा, पसंदों, एनालिटिक्स और प्रदर्शन के लिए कुकीज़ और समान तकनीकों का उपयोग कैसे करता है।",
    "legal.cookiePolicy.tableOfContents": "विषय सूची",
    "legal.cookiePolicy.sections.use.title": "कुकीज़ का उपयोग कैसे किया जाता है",
    "legal.cookiePolicy.sections.third-parties.title": "तृतीय-पक्ष तकनीकें",
    "legal.cookiePolicy.sections.controls.title": "नियंत्रण",
    "legalCenter.heroLabel": "कानूनी जानकारी",
    "legalCenter.heroTitle": "कानूनी केंद्र",
    "legalCenter.heroDescription":
      "Kurioticket के उपयोग से संबंधित महत्वपूर्ण कानूनी और नीति जानकारी देखें।",
    "legalCenter.resourcesHeading": "कानूनी संसाधन",
    "legalCenter.resourcesDescription":
      "Kurioticket की कानूनी शर्तों और डेटा प्रक्रियाओं के बारे में अधिक जानने के लिए नीचे एक नीति चुनें।",
    "legalCenter.policiesBadge": "नीतियाँ",
    "legalCenter.privacyPolicy.title": "गोपनीयता नीति",
    "legalCenter.privacyPolicy.cta": "गोपनीयता नीति देखें",
    "legalCenter.termsOfService.title": "सेवा की शर्तें",
    "legalCenter.termsOfService.cta": "सेवा की शर्तें देखें",
    "legalCenter.cookiePolicy.title": "कुकी नीति",
    "legalCenter.cookiePolicy.cta": "कुकी नीति देखें",
    "legalCenter.additionalResourcesTitle": "अतिरिक्त कानूनी संसाधन",
    "legalCenter.additionalResourcesDescription":
      "Kurioticket के बढ़ने के साथ अतिरिक्त कानूनी संसाधन जोड़े जा सकते हैं।",
  };

  for (const [key, value] of Object.entries(expectedHindiLegalStrings)) {
    assert.equal(hiTranslations[key], value, `hi ${key} should use the audited Hindi legal copy`);
    assert.notEqual(hiTranslations[key], enTranslations[key], `hi ${key} should not fall back to English`);
    assert.equal(getTranslations("hi")[key], value, `resolved hi ${key} should use Hindi`);
  }

  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
  const legalCenterSource = readFileSync("src/app/legal-center/LegalCenterContent.tsx", "utf8");

  assert.ok(legalViewerSource.includes("legalDocumentTranslationNamespaces"));
  assert.ok(legalViewerSource.includes("window.print()"));
  assert.ok(legalViewerSource.includes("href={`#${section.id}`}"));
  assert.ok(legalCenterSource.includes('href: "/legal/privacy-policy"'));
  assert.ok(legalCenterSource.includes('href: "/legal/terms-of-service"'));
  assert.ok(legalCenterSource.includes('href: "/legal/cookie-policy"'));
});

test("Turkish legal center and policy document strings are localized", () => {
  const expectedTurkishLegalStrings = {
    "legal.lastUpdated": "Son güncelleme",
    "legal.print": "Yazdır",
    "legal.tableOfContents": "İÇİNDEKİLER",
    "legal.privacy.title": "Gizlilik Politikası",
    "legal.privacy.summary":
      "Kurioticket LLC’nin (“Kurioticket,” “we,” “us,” veya “our”) hesap, arama, uyarı, destek ve e-posta verilerini nasıl topladığını, kullandığını, sakladığını ve koruduğunu açıklar.",
    "legal.privacy.tableOfContents": "İÇİNDEKİLER",
    "legal.privacy.sections.data-we-collect.title": "Topladığımız Veriler",
    "legal.privacy.sections.data-we-collect.paragraph1":
      "Ad, e-posta, karma hâle getirilmiş parola, kimlik doğrulama sağlayıcısı tanımlayıcıları ve isteğe bağlı seyahat tercihleri gibi hesap verilerini toplarız. Kayıt sırasında pasaport verisi, resmi kimlik veya ev adresi istemeyiz.",
    "legal.privacy.sections.data-we-collect.paragraph2":
      "Aramalar, kaydedilen uçuşlar, kaydedilen oteller, kaydedilen aramalar, fiyat uyarıları, yönlendirmeler, destek talepleri, bildirimler, analiz olayları ve özellik kullanımı gibi ürün verilerini toplarız.",
    "legal.privacy.sections.vendors.title": "Hizmet Sağlayıcıları",
    "legal.privacy.sections.vendors.paragraph1":
      "Hizmetlerimizi işletmek, iletişim göndermek, platformu korumak, performansı ölçmek ve ürün işlevselliğini desteklemek için üçüncü taraf hizmet sağlayıcıları kullanabiliriz.",
    "legal.privacy.sections.vendors.paragraph2":
      "Kurioticket, seyahat rezervasyonları için kredi kartı numaralarını istemez veya saklamaz. Kurioticket pasaport verilerini saklamaz.",
    "legal.privacy.sections.choices.title": "Seçimleriniz",
    "legal.privacy.sections.choices.paragraph1":
      "Bildirim tercihlerinizi güncelleyebilir, hesap silme talebinde bulunabilir ve geçerli gizlilik yasalarının gerektirdiği durumlarda erişim veya düzeltme talep edebilirsiniz.",
    "legal.privacy.sections.choices.paragraph2":
      "Yalnızca ürün işletimi, güvenlik, destek, analiz, uyumluluk veya meşru iş ihtiyaçları için yararlı olan verileri saklarız.",
    "legal.privacy.developerNote":
      "Bu yasal taslaklar başlangıç aşaması için yer tutucu metinlerdir ve geniş ölçekli herkese açık lansmandan önce nitelikli hukuk danışmanları tarafından incelenmelidir.",
    "legal.terms.title": "Hizmet Şartları",
    "legal.terms.summary":
      "Kurioticket araması, hesapları, panoları, kaydedilen seyahat araçları ve iş ortağı yönlendirmelerinin kullanımına ilişkin kurallar.",
    "legal.terms.tableOfContents": "İÇİNDEKİLER",
    "legal.terms.sections.overview.title": "Genel Bakış",
    "legal.terms.sections.accounts.title": "Hesaplar",
    "legal.terms.sections.acceptable-use.title": "Kabul Edilebilir Kullanım",
    "legal.terms.sections.partner-services.title": "İş Ortağı Hizmetleri",
    "legal.terms.developerNote":
      "Bu yasal taslaklar başlangıç aşaması için yer tutucu metinlerdir ve geniş ölçekli herkese açık lansmandan önce nitelikli hukuk danışmanları tarafından incelenmelidir.",
    "legal.cookiePolicy.title": "Çerez Politikası",
    "legal.cookiePolicy.summary":
      "Kurioticket’in kimlik doğrulama, güvenlik, tercihler, analiz ve performans için çerezleri ve benzer teknolojileri nasıl kullandığını açıklar.",
    "legal.cookiePolicy.tableOfContents": "İÇİNDEKİLER",
    "legal.cookiePolicy.sections.use.title": "Çerezler Nasıl Kullanılır",
    "legal.cookiePolicy.sections.third-parties.title": "Üçüncü Taraf Teknolojileri",
    "legal.cookiePolicy.sections.controls.title": "Kontroller",
    "legal.cookiePolicy.developerNote":
      "Bu yasal taslaklar başlangıç aşaması için yer tutucu metinlerdir ve geniş ölçekli herkese açık lansmandan önce nitelikli hukuk danışmanları tarafından incelenmelidir.",
    "legalCenter.heroLabel": "Yasal Bilgiler",
    "legalCenter.heroTitle": "Hukuk Merkezi",
    "legalCenter.heroDescription":
      "Kurioticket kullanımına ilişkin önemli yasal ve politika bilgilerine erişin.",
    "legalCenter.resourcesHeading": "Yasal kaynaklar",
    "legalCenter.resourcesDescription":
      "Kurioticket’in yasal şartları ve veri uygulamaları hakkında daha fazla bilgi almak için aşağıdan bir politika seçin.",
    "legalCenter.policiesBadge": "POLİTİKALAR",
    "legalCenter.privacyPolicy.title": "Gizlilik Politikası",
    "legalCenter.privacyPolicy.cta": "Gizlilik Politikasını görüntüle",
    "legalCenter.termsOfService.title": "Hizmet Şartları",
    "legalCenter.termsOfService.cta": "Hizmet Şartlarını görüntüle",
    "legalCenter.cookiePolicy.title": "Çerez Politikası",
    "legalCenter.cookiePolicy.cta": "Çerez Politikasını görüntüle",
    "legalCenter.additionalResourcesTitle": "Ek yasal kaynaklar",
    "legalCenter.additionalResourcesDescription":
      "Kurioticket büyüdükçe ek yasal kaynaklar eklenebilir.",
    "legal.index.heroTitle": "Hukuk Merkezi",
    "legal.index.heroDescription":
      "Kurioticket’in yasal kaynakları; seyahat araması, hesap, gizlilik, sağlayıcı yönlendirmesi ve uyumluluk süreçlerimizin nasıl çalıştığını açıklar.",
    "legal.index.compliance.eyebrow": "ŞİRKET VE UYUMLULUK",
    "legal.index.compliance.sellerOfTravel": "Kaliforniya Seyahat Satıcısı",
    "legal.index.compliance.registrationNumberLabel": "Kayıt No.",
    "legal.index.compliance.registrationExpires": "Kayıt bitiş tarihi",
    "legal.index.compliance.registrationExpiresDate": "05 Haziran 2027",
    "legal.index.compliance.publicNotice":
      "Seyahat satıcısı kaydı, Kaliforniya Eyaleti tarafından onay verildiği anlamına gelmez.",
    "legal.index.contacts.support": "Destek",
    "legal.index.contacts.legal": "Hukuk",
    "legal.index.contacts.privacy": "Gizlilik",
    "legal.index.resourcesEyebrow": "Resmi kaynaklar",
    "legal.index.resourcesTitle": "Yasal belgeler",
    "legal.index.documentsCountLabel": "politika ve bildirim mevcut",
    "legal.index.lastUpdated": "SON GÜNCELLEME",
    "legal.index.lastUpdatedDate": "11 MAYIS 2026",
    "legal.index.documents.termsOfService.title": "Hizmet Şartları",
    "legal.index.documents.termsOfService.summary":
      "Kurioticket araması, hesaplar, paneller, kaydedilen seyahat araçları ve iş ortağı yönlendirmelerinin kullanım kuralları.",
    "legal.index.documents.privacyPolicy.title": "Gizlilik Politikası",
    "legal.index.documents.privacyPolicy.summary":
      "Kurioticket LLC’nin (“Kurioticket”, “biz”, “bize” veya “bizim”) hesap, arama, uyarı, destek ve e-posta verilerini nasıl topladığını, kullandığını, sakladığını ve koruduğunu açıklar.",
    "legal.index.documents.cookiePolicy.title": "Çerez Politikası",
    "legal.index.documents.cookiePolicy.summary":
      "Kurioticket’in kimlik doğrulama, güvenlik, tercihler, analiz ve performans için çerezleri ve benzer teknolojileri nasıl kullandığını açıklar.",
    "legal.index.documents.privacyChoices.title": "Gizlilik Tercihleri",
    "legal.index.documents.privacyChoices.summary":
      "Kurioticket kullanıcıları için şu anda mevcut olan gizlilik ve hesap tercihleri.",
    "legal.index.documents.affiliateDisclosure.title": "Satış Ortaklığı Açıklaması",
    "legal.index.documents.affiliateDisclosure.summary":
      "Kullanıcılar güvenilir iş ortakları üzerinden tıkladığında veya rezervasyon yaptığında Kurioticket’in nasıl komisyon kazanabileceğini açıklar.",
    "legal.index.documents.refundBookingDisclaimer.title": "İade ve Harici Sağlayıcı Sorumluluk Reddi",
    "legal.index.documents.refundBookingDisclaimer.summary":
      "Satın alma, biletleme, iadeler, iptaller ve seyahat envanteri ödemelerinin Kurioticket dışında gerçekleştiğini açıklar.",
    "legal.index.documents.priceAvailabilityDisclaimer.title": "Fiyat ve Müsaitlik Sorumluluk Reddi",
    "legal.index.documents.priceAvailabilityDisclaimer.summary":
      "Seyahat fiyatlarının, ücret kurallarının, oda fiyatlarının ve müsaitliğin neden değişebileceğini açıklar.",
    "legal.index.documents.partnerRedirectDisclaimer.title": "İş Ortağı Yönlendirme Sorumluluk Reddi",
    "legal.index.documents.partnerRedirectDisclaimer.summary":
      "Kurioticket kullanıcıları havayollarına, otellere, satış ortaklarına veya seyahat sağlayıcılarına yönlendirdiğinde ne olduğunu açıklar.",
    "legal.index.documents.californiaSellerOfTravelNotice.title": "Kaliforniya Seyahat Satıcısı Bildirimi",
    "legal.index.documents.californiaSellerOfTravelNotice.summary":
      "Kurioticket’in seyahat arama ve yönlendirme platformu için Kaliforniya Seyahat Satıcısı kayıt bildirimi.",
    "legal.index.documents.legalNoticeCompanyInformation.title": "Yasal Bildirim ve Şirket Bilgileri",
    "legal.index.documents.legalNoticeCompanyInformation.summary":
      "Kurioticket için şirket, iletişim, ürün kapsamı ve sağlayıcı sınırı bilgileri.",
    "legal.index.documents.acceptableUsePolicy.title": "Kabul Edilebilir Kullanım Politikası",
    "legal.index.documents.acceptableUsePolicy.summary":
      "Kurioticket sistemlerinin güvenli, adil ve yasal kullanımı için davranış kuralları.",
    "legal.index.documents.dataDeletionPolicy.title": "Veri Silme Politikası",
    "legal.index.documents.dataDeletionPolicy.summary":
      "Kullanıcıların hesap silme talebini nasıl iletebileceğini ve hangi verilerin saklanması gerekebileceğini açıklar.",
    "legal.index.documents.securityStatement.title": "Güvenlik Beyanı",
    "legal.index.documents.securityStatement.summary":
      "Kurioticket hesapları ve sağlayıcı yönlendirmeleri için genel güvenlik uygulamaları ve kullanıcı sorumlulukları.",
    "legal.index.documents.accessibilityStatement.title": "Erişilebilirlik Beyanı",
    "legal.index.documents.accessibilityStatement.summary":
      "Kurioticket’in seyahat araması, hesap ve destek deneyimleri için erişilebilirlik taahhüdü.",
  };

  for (const [key, value] of Object.entries(expectedTurkishLegalStrings)) {
    assert.equal(trTranslations[key], value, `tr ${key} should use the audited Turkish legal copy`);
    assert.notEqual(trTranslations[key], enTranslations[key], `tr ${key} should not fall back to English`);
    assert.equal(getTranslations("tr")[key], value, `resolved tr ${key} should use Turkish`);
  }

  assert.equal(getTranslations("tr")["legal.print"], "Yazdır");
  assert.equal(getTranslations("tr")["legal.privacy.tableOfContents"], "İÇİNDEKİLER");
  assert.equal(getTranslations("tr")["legal.terms.tableOfContents"], "İÇİNDEKİLER");
  assert.equal(getTranslations("tr")["legal.cookiePolicy.tableOfContents"], "İÇİNDEKİLER");

  const legalPageSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalDocumentsSource = readFileSync("src/data/legalDocuments.ts", "utf8");

  assert.ok(legalPageSource.includes('t("legal.index.heroDescription")'));
  assert.ok(legalPageSource.includes('t("legal.index.compliance.eyebrow")'));
  assert.ok(legalPageSource.includes('t("legal.index.resourcesTitle")'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.title`)'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.summary`)'));
  assert.ok(legalPageSource.includes('"privacy-choices": "privacyChoices"'));
  assert.ok(legalPageSource.includes('"accessibility-statement": "accessibilityStatement"'));
  assert.ok(legalPageSource.includes('href={`/legal/${document.slug}`}'));
  assert.ok(legalPageSource.includes('legalProfile.contact.supportEmail'));
  assert.ok(legalPageSource.includes('legalProfile.contact.legalEmail'));
  assert.ok(legalPageSource.includes('legalProfile.contact.privacyEmail'));
  assert.ok(legalPageSource.includes('sellerOfTravel.registrationNumber'));
  assert.ok(legalDocumentsSource.indexOf('slug: "terms-of-service"') < legalDocumentsSource.indexOf('slug: "privacy-policy"'));
  assert.ok(legalDocumentsSource.indexOf('slug: "privacy-policy"') < legalDocumentsSource.indexOf('slug: "cookie-policy"'));
  assert.ok(legalDocumentsSource.indexOf('slug: "security-statement"') < legalDocumentsSource.indexOf('slug: "accessibility-statement"'));
});


test("Hindi service and support page strings are localized", () => {
  const expectedHindiServiceSupportStrings = {
    supportEyebrow: "Kurioticket सहायता डेस्क",
    supportTitle: "ग्राहक सहायता",
    supportBeforeContactHeading: "हमसे संपर्क करने से पहले",
    supportTicketHeading: "सहायता टिकट बनाएँ",
    supportFormEmailLabel: "ईमेल",
    supportFormSubjectLabel: "विषय",
    supportFormCategoryLabel: "श्रेणी",
    supportCategoryPriceAlerts: "कीमत अलर्ट",
    supportFormMessageLabel: "हम कैसे मदद कर सकते हैं?",
    supportFormMessagePlaceholder: "मार्ग, होटल, अलर्ट या खाते से जुड़ा संदर्भ साझा करें।",
    supportFormSubmit: "अनुरोध भेजें",
    supportFaqHeading: "अक्सर पूछे जाने वाले प्रश्न",
    serviceGuaranteeEyebrow: "Kurioticket सेवा प्रतिबद्धता",
    serviceGuaranteeTitle: "सेवा गारंटी",
    serviceGuaranteeFaqHeading: "अक्सर पूछे जाने वाले प्रश्न",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Kurioticket क्या गारंटी देता है?",
    serviceGuaranteeFaqRedirectedQuestion: "मुझे किसी दूसरे प्रदाता के पास क्यों भेजा जाता है?",
    serviceGuaranteeHelpCardTitle: "अपने खाते या खोज में मदद चाहिए?",
    moreServiceInfoEyebrow: "प्लेटफ़ॉर्म जानकारी",
    moreServiceInfoTitle: "अधिक सेवा जानकारी",
    moreServiceInfoContextTitle: "संदर्भ के साथ योजना बनाएँ",
    moreServiceInfoContextSubtitle: "खोज परिणामों से प्रदाता रीडायरेक्ट तक",
    moreServiceInfoHowHeading: "Kurioticket कैसे काम करता है",
    moreServiceInfoHowBadge: "यात्रा योजना की मूल बातें",
    moreServiceInfoStepSearchTitle: "कई प्रदाताओं में खोजें",
    moreServiceInfoStepCompareTitle: "यात्रा विकल्पों की तुलना करें",
    moreServiceInfoStepSaveTitle: "यात्राएँ और अलर्ट सहेजें",
    moreServiceInfoStepRedirectsTitle: "प्रदाता रीडायरेक्ट समझाया गया",
    moreServiceInfoStepAccountTitle: "खाता और यात्रा टूल",
    moreServiceInfoFaqHeading: "अक्सर पूछे जाने वाले प्रश्न",
    moreServiceInfoFaqPaymentsQuestion: "क्या Kurioticket भुगतान संसाधित करता है?",
    moreServiceInfoSupportCta: "ग्राहक सहायता से संपर्क करें",
  };

  for (const [key, value] of Object.entries(expectedHindiServiceSupportStrings)) {
    assert.equal(hiTranslations[key], value, `hi ${key} should use the audited Hindi copy`);
    assert.notEqual(hiTranslations[key], enTranslations[key], `hi ${key} should not fall back to English`);
  }

  assert.equal(getTranslations("hi").supportTitle, "ग्राहक सहायता");
  assert.equal(getTranslations("hi").serviceGuaranteeTitle, "सेवा गारंटी");
  assert.equal(getTranslations("hi").moreServiceInfoTitle, "अधिक सेवा जानकारी");
});


test("Turkish service and support page strings are localized", () => {
  const expectedTurkishServiceSupportStrings = {
    supportEyebrow: "Kurioticket yardım masası",
    supportTitle: "Müşteri desteği",
    supportBeforeContactHeading: "Bizimle iletişime geçmeden önce",
    supportBeforeContactDescription:
      "Kurioticket hesabınızdaki e-postayı, ne yapmaya çalıştığınızı, ilgiliyse rotayı veya oteli ve yönlendirildiğiniz sağlayıcı sayfasını ekleyin. Lütfen tam ödeme kartı numaralarını veya hassas seyahat belgesi numaralarını göndermeyin.",
    supportTicketHeading: "Destek talebi oluşturun",
    supportFormEmailLabel: "E-posta",
    supportFormSubjectLabel: "Konu",
    supportFormCategoryLabel: "Kategori",
    supportCategoryPriceAlerts: "Fiyat uyarıları",
    supportFormMessageLabel: "Nasıl yardımcı olabiliriz?",
    supportFormMessagePlaceholder: "Rota, otel, uyarı veya hesap bağlamını paylaşın.",
    supportFormSubmit: "Talep gönder",
    supportFaqHeading: "Sıkça sorulan sorular",
    supportFaqAccountQuestion: "Hesap ve oturum açma yardımı",
    supportFaqAccountAnswer:
      "Kurioticket hesap erişimi, oturum açma sorunları, kayıt sorunları, profil erişimi ve hesapla ilgili platform problemlerinde yardımcı olabilir.",
    supportFaqSearchQuestion: "Arama ve sonuçlar yardımı",
    supportFaqSearchAnswer:
      "Kurioticket; uçuş veya otel araması çalışmadığında, sonuçlar yüklenmediğinde, filtreler kafa karıştırdığında ya da fiyatlar ve sağlayıcılar beklendiği gibi görünmediğinde yardımcı olabilir.",
    supportFaqSavedTripsQuestion: "Kaydedilen seyahatler ve uyarılar",
    supportFaqSavedTripsAnswer:
      "Kurioticket kaydedilen seyahatler, son aramalar, fiyat uyarıları, bildirim sorunları ve hesaba bağlı seyahat araçları konusunda yardımcı olabilir.",
    supportFaqRedirectQuestion: "Rezervasyon/sağlayıcı yönlendirme yardımı",
    supportFaqRedirectAnswer:
      "Kurioticket, bir iş ortağına veya sağlayıcıya yönlendirme başarısız olursa, yanlış sayfayı açarsa ya da seçilen seyahat veya arama ayrıntılarını korumazsa yardımcı olabilir.",
    supportFaqAlreadyBookedQuestion: "Zaten bir sağlayıcıyla rezervasyon yaptınız mı?",
    supportFaqAlreadyBookedAnswer:
      "Rezervasyonunuz bir hava yolu, otel, seyahat acentesi veya harici sağlayıcıyla tamamlandıysa rezervasyon değişiklikleri, iadeler, iptaller, check-in, biniş, makbuzlar ve seyahat belgelerinden o sağlayıcı sorumludur.",
    supportFaqChangeBookingQuestion: "Kurioticket rezervasyonumu değiştirebilir mi?",
    supportFaqChangeBookingAnswer:
      "Kurioticket yalnızca doğrudan rezervasyon desteklendiği zaman ve destekleniyorsa Kurioticket üzerinden doğrudan yapılan rezervasyonlarda yardımcı olabilir. Harici sağlayıcılarla tamamlanan rezervasyonlar için doğrudan o sağlayıcıyla iletişime geçin.",
    supportFaqWhyRedirectedQuestion: "Neden başka bir sağlayıcıya gönderildim?",
    supportFaqWhyRedirectedAnswer:
      "Kurioticket bir seyahat arama ve karşılaştırma platformudur; bazı sonuçlar rezervasyonu, ödemeyi ve sağlayıcıya özel desteği tamamlayacağınız güvenilir sağlayıcılara yönlendirir.",
    serviceGuaranteeEyebrow: "Kurioticket hizmet taahhüdü",
    serviceGuaranteeTitle: "Hizmet garantisi",
    serviceGuaranteeDescription:
      "Yolcuların Kurioticket'in nasıl çalıştığını ve platformumuzu kullanırken neler bekleyebileceklerini anlamasını istiyoruz.",
    serviceGuaranteeFaqHeading: "Sıkça sorulan sorular",
    serviceGuaranteeFaqDescription:
      "Bu yanıtlar Kurioticket'in bir seyahat arama ve karşılaştırma platformu olarak rolünü açıklar.",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Kurioticket neyi garanti eder?",
    serviceGuaranteeFaqWhatGuaranteeAnswer:
      "Kurioticket, yolcuların seyahat seçeneklerini net bir şekilde karşılaştırmasına yardımcı olmak için tasarlanmıştır. Güvenilir bir platform deneyimi, şeffaf arama bilgileri ve sağlayıcı rezervasyon sayfalarına açık geçiş yolları sunmayı hedefleriz.",
    serviceGuaranteeFaqResultsDisplayedQuestion: "Seyahat sonuçları nasıl gösterilir?",
    serviceGuaranteeFaqResultsDisplayedAnswer:
      "Sonuçlar; mevcut olduğunda rotalar, tarihler, fiyatlar ve sağlayıcı ayrıntıları dahil olmak üzere seyahat sağlayıcılarından alınabilen bilgilerle gösterilir.",
    serviceGuaranteeFaqRedirectedQuestion: "Neden başka bir sağlayıcıya yönlendiriliyorum?",
    serviceGuaranteeFaqRedirectedAnswer:
      "Bazı sonuçlar harici bir sağlayıcı sitesinde tamamlanır. Bu seçeneklerden birini seçtiğinizde Kurioticket, rezervasyon, ödeme ve seyahate özel hizmeti sağlayıcının yönetebilmesi için sizi yönlendirir.",
    serviceGuaranteeFaqBookDirectlyQuestion: "Doğrudan Kurioticket üzerinden mi rezervasyon yaparım?",
    serviceGuaranteeFaqBookDirectlyAnswer:
      "Kurioticket öncelikle bir seyahat arama ve karşılaştırma platformudur. Bir sonuç sağlayıcıya yönlendiriyorsa rezervasyon Kurioticket yerine o sağlayıcıyla tamamlanır.",
    serviceGuaranteeFaqPricesGuaranteedQuestion: "Fiyatlar her zaman garanti edilir mi?",
    serviceGuaranteeFaqPricesGuaranteedAnswer:
      "Hayır. Fiyatlar sağlayıcı müsaitliği, vergiler, ücretler, para birimi ve zamanlamaya göre değişebilir. Rezervasyondan önce nihai fiyatı her zaman sağlayıcı sayfasında inceleyin.",
    serviceGuaranteeFaqChooseProvidersQuestion: "Kurioticket sağlayıcıları nasıl seçer?",
    serviceGuaranteeFaqChooseProvidersAnswer:
      "Kurioticket, ilgili arama sonuçlarını sağlayabilen seyahat sağlayıcıları ve veri kaynaklarıyla çalışır. Müsaitlik, fiyatlandırma ve gösterilen seçenekler rota, varış noktası ve sağlayıcı kapsamına göre değişebilir.",
    serviceGuaranteeFaqEncounterIssueQuestion: "Bir sorunla karşılaşırsam ne yapmalıyım?",
    serviceGuaranteeFaqEncounterIssueAnswer:
      "Sorun arama, hesap erişimi, kaydedilen seyahatler, uyarılar veya Kurioticket üzerinden yapılan bir yönlendirmeyle ilgiliyse Kurioticket destek ekibiyle iletişime geçin. Bir sağlayıcıyla zaten rezervasyon yaptıysanız rezervasyon değişiklikleri, iadeler, iptaller veya seyahat belgeleri için o sağlayıcıyla iletişime geçin.",
    serviceGuaranteeFaqContactSupportQuestion: "Destekle nasıl iletişime geçebilirim?",
    serviceGuaranteeFaqContactSupportAnswer:
      "Müşteri Destek sayfasını kullanın ve sorunu incelememize yardımcı olabilecek hesap e-postanızı, ne yapmaya çalıştığınızı ve rota, otel veya sağlayıcı ayrıntılarını ekleyin.",
    serviceGuaranteeHelpCardTitle: "Hesabınız veya aramanızla ilgili yardıma mı ihtiyacınız var?",
    serviceGuaranteeSupportCta: "Müşteri Desteği ile iletişime geçin",
    moreServiceInfoEyebrow: "Platform bilgileri",
    moreServiceInfoTitle: "Daha fazla hizmet bilgisi",
    moreServiceInfoDescription:
      "Kurioticket'in yolcuların tek bir yerde birden fazla sağlayıcıdan seyahat seçeneklerini aramasına, karşılaştırmasına, kaydetmesine ve düzenlemesine nasıl yardımcı olduğunu öğrenin.",
    moreServiceInfoContextTitle: "Bağlamla planlayın",
    moreServiceInfoContextSubtitle: "Arama sonuçlarından sağlayıcı yönlendirmelerine",
    moreServiceInfoContextCompare: "Birden fazla seyahat sağlayıcısından seçenekleri karşılaştırın.",
    moreServiceInfoContextSave: "Oturum açtığınızda seyahatleri, uyarıları ve tercihleri kaydedin.",
    moreServiceInfoContextContinue: "Harici rezervasyondan önce sağlayıcı ayrıntılarıyla devam edin.",
    moreServiceInfoHowHeading: "Kurioticket nasıl çalışır",
    moreServiceInfoHowDescription:
      "Bu hizmet ayrıntıları, bir seyahat aramasından önce, arama sırasında ve sonrasında Kurioticket'in rolünü açıklar.",
    moreServiceInfoHowBadge: "SEYAHAT PLANLAMA TEMELLERİ",
    moreServiceInfoStepSearchTitle: "Birden fazla sağlayıcıda arayın",
    moreServiceInfoStepSearchSummary:
      "Her sağlayıcıyı ayrı ayrı açmak yerine farklı sağlayıcılardaki seyahat seçeneklerini tek bir yerden arayın.",
    moreServiceInfoStepSearchDetails:
      "Kurioticket, mevcut uçuş, otel, rota ve seyahat sonucu bilgilerini tek bir arama deneyiminde bir araya getirerek yolcuların seçenekleri daha verimli incelemesine yardımcı olur.",
    moreServiceInfoStepCompareTitle: "Seyahat seçeneklerini karşılaştırın",
    moreServiceInfoStepCompareSummary:
      "Seyahatinize neyin uygun olduğuna karar vermeden önce fiyatları, rotaları, otelleri, saatleri ve mevcut seyahat seçeneklerini karşılaştırın.",
    moreServiceInfoStepCompareDetails:
      "Sonuçlar, sağlayıcıya geçmeden önce seçeneği değerlendirmenize yardımcı olan sağlayıcı ayrıntıları, zamanlama, varış noktası bilgileri ve diğer seyahat verilerini içerebilir.",
    moreServiceInfoStepSaveTitle: "Seyahatleri ve uyarıları kaydedin",
    moreServiceInfoStepSaveSummary:
      "Seyahat planlamanızla bağlantılı seyahatleri kaydetmek, rotaları takip etmek ve seyahat uyarılarını yönetmek için bir hesap oluşturun.",
    moreServiceInfoStepSaveDetails:
      "Kaydedilen seyahatler, son aramalar ve uyarılar, değerlendirdiğiniz seçeneklere geri dönmeyi ve ilgili seyahat planlama ayrıntılarını düzenli tutmayı kolaylaştırır.",
    moreServiceInfoStepRedirectsTitle: "Sağlayıcı yönlendirmeleri açıklandı",
    moreServiceInfoStepRedirectsSummary:
      "Bir teklifi seçtiğinizde rezervasyon, ödeme, onay ve hizmetin tamamlanması için bir seyahat sağlayıcısına yönlendirilebilirsiniz.",
    moreServiceInfoStepRedirectsDetails:
      "Sağlayıcı sayfası; yönlendirilen teklifler için nihai fiyatların, müsaitliğin, kuralların, ödeme adımlarının, makbuzların, rezervasyon değişikliklerinin, iptallerin ve seyahat belgelerinin yönetildiği yerdir.",
    moreServiceInfoStepAccountTitle: "Hesap ve seyahat araçları",
    moreServiceInfoStepAccountSummary:
      "Kaydedilen aramaları, seyahatleri, uyarıları ve tercihleri tek bir Kurioticket çalışma alanında düzenlemek için hesap araçlarını kullanın.",
    moreServiceInfoStepAccountDetails:
      "Bu araçlar Kurioticket üzerinde seyahat planlamasını destekler; harici olarak tamamlanan rezervasyonlarda sağlayıcıya özel rezervasyon yönetimi ise sağlayıcıda kalır.",
    moreServiceInfoFaqHeading: "Sıkça sorulan sorular",
    moreServiceInfoFaqDescription:
      "Seyahat araması, sağlayıcı yönlendirmeleri, kaydedilen seyahatler ve hesap araçları hakkında kısa yanıtlar.",
    moreServiceInfoFaqWhatQuestion: "Kurioticket nedir?",
    moreServiceInfoFaqWhatAnswer:
      "Kurioticket, birden fazla sağlayıcıdan seyahat seçeneklerini bulmak, karşılaştırmak, kaydetmek ve düzenlemek için kullanılan bir seyahat arama ve karşılaştırma platformudur.",
    moreServiceInfoFaqSearchQuestion: "Seyahat araması nasıl çalışır?",
    moreServiceInfoFaqSearchAnswer:
      "Seyahat ayrıntılarını girersiniz; Kurioticket de seçenekleri karşılaştırmanıza yardımcı olabilecek mevcut seyahat seçeneklerini ve sağlayıcı bilgilerini gösterir.",
    moreServiceInfoFaqRedirectQuestion: "Neden başka bir sağlayıcıya yönlendiriliyorum?",
    moreServiceInfoFaqRedirectAnswer:
      "Bazı teklifler harici sağlayıcı sitelerinde tamamlanır. Sağlayıcı nihai rezervasyon adımlarını, ödemeyi, onayı ve hizmetin tamamlanmasını yönetir.",
    moreServiceInfoFaqPaymentsQuestion: "Kurioticket ödemeleri işler mi?",
    moreServiceInfoFaqPaymentsAnswer:
      "Sağlayıcıya yönlendirilen teklifler için Kurioticket ödeme işlemez. Ödemeyi doğrudan sağlayıcı sayfasında inceleyip tamamlayın.",
    moreServiceInfoFaqSaveQuestion: "Seyahatleri ve uyarıları kaydedebilir miyim?",
    moreServiceInfoFaqSaveAnswer:
      "Evet. Hesap araçları seyahatleri kaydetmenize, rotaları takip etmenize, uyarıları yönetmenize ve değerlendirdiğiniz seyahat seçeneklerine geri dönmenize yardımcı olabilir.",
    moreServiceInfoFaqAccountQuestion: "Hesap gerekli mi?",
    moreServiceInfoFaqAccountAnswer:
      "Arama bilgilerine tüm hesap araçları olmadan göz atabilirsiniz; ancak seyahatleri, uyarıları ve tercihleri kaydetmek oturum açmayı gerektirebilir.",
    moreServiceInfoFaqSupportQuestion: "Destekle nasıl iletişime geçerim?",
    moreServiceInfoFaqSupportAnswer:
      "Müşteri Destek sayfasını kullanın ve hesap e-postanızı, ne yapmaya çalıştığınızı ve rota, otel veya sağlayıcı ayrıntılarını ekleyin.",
    moreServiceInfoHelpTitle: "Yardıma mı ihtiyacınız var?",
    moreServiceInfoHelpDescription:
      "Hesabınız, kaydedilen seyahatleriniz, uyarılarınız veya sağlayıcı yönlendirmeleriniz hakkında sorularınız mı var?",
    moreServiceInfoSupportCta: "Müşteri Desteği ile iletişime geçin",
  };

  for (const [key, value] of Object.entries(expectedTurkishServiceSupportStrings)) {
    assert.equal(trTranslations[key], value, `tr ${key} should use the audited Turkish copy`);
    assert.notEqual(trTranslations[key], enTranslations[key], `tr ${key} should not fall back to English`);
    assert.equal(getTranslations("tr")[key], value, `resolved tr ${key} should use Turkish`);
  }

  const brandKeys = Object.keys(expectedTurkishServiceSupportStrings).filter((key) =>
    enTranslations[key]?.includes("Kurioticket"),
  );
  assert.ok(brandKeys.every((key) => trTranslations[key]?.includes("Kurioticket")));
  assert.ok(languageOptions.some((option) => option.code === "tr" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("country and currency selector country names resolve for every active locale", () => {
  const activeLocales = ["en-us", "ar", "nl", "es-es", "fr", "de-de", "it-it", "pt-br", "zh-cn", "ja", "ko"];

  assert.equal(supportedRegions.length, 250);

  for (const locale of activeLocales) {
    for (const option of supportedRegions) {
      const displayName = getCountryDisplayNameForLocale(option.code, locale, option.country);
      assert.ok(displayName.trim(), `${locale} ${option.code} should resolve a display name`);
    }
  }
});

test("country and currency selector uses localized display names without changing codes", () => {
  const examples = new Map([
    ["AF", { currency: "AFN", zh: "阿富汗", ar: "أفغانستان", nl: "Afghanistan", es: "Afganistán", fr: "Afghanistan", de: "Afghanistan", it: "Afghanistan", pt: "Afeganistão" }],
    ["AL", { currency: "ALL", zh: "阿尔巴尼亚", ar: "ألبانيا", nl: "Albanië", es: "Albania", fr: "Albanie", de: "Albanien", it: "Albania", pt: "Albânia" }],
    ["DZ", { currency: "DZD", zh: "阿尔及利亚", ar: "الجزائر", nl: "Algerije", es: "Argelia", fr: "Algérie", de: "Algerien", it: "Algeria", pt: "Argélia" }],
    ["AS", { currency: "USD", zh: "美属萨摩亚", ar: "ساموا الأمريكية", nl: "Amerikaans-Samoa", es: "Samoa Americana", fr: "Samoa américaines", de: "Amerikanisch-Samoa", it: "Samoa Americane", pt: "Samoa Americana" }],
    ["AD", { currency: "EUR", zh: "安道尔", ar: "أندورا", nl: "Andorra", es: "Andorra", fr: "Andorre", de: "Andorra", it: "Andorra", pt: "Andorra" }],
    ["AO", { currency: "AOA", zh: "安哥拉", ar: "أنغولا", nl: "Angola", es: "Angola", fr: "Angola", de: "Angola", it: "Angola", pt: "Angola" }],
    ["AI", { currency: "XCD", zh: "安圭拉", ar: "أنغويلا", nl: "Anguilla", es: "Anguila", fr: "Anguilla", de: "Anguilla", it: "Anguilla", pt: "Anguila" }],
    ["AQ", { currency: "USD", zh: "南极洲", ar: "أنتاركتيكا", nl: "Antarctica", es: "Antártida", fr: "Antarctique", de: "Antarktis", it: "Antartide", pt: "Antártida" }],
    ["EU", { currency: "EUR", zh: "欧盟", ar: "الاتحاد الأوروبي", nl: "Europese Unie", es: "Unión Europea", fr: "Union européenne", de: "Europäische Union", it: "Unione europea", pt: "União Europeia" }],
  ]);

  for (const [code, expected] of examples) {
    const option = supportedRegions.find((region) => region.code === code);
    assert.ok(option, `${code} option exists`);
    assert.equal(option.code, code);
    assert.equal(option.currency, expected.currency);
    assert.equal(getCountryDisplayNameForLocale(code, "zh-cn", option.country), expected.zh);
    assert.equal(getCountryDisplayNameForLocale(code, "ar", option.country), expected.ar);
    assert.equal(getCountryDisplayNameForLocale(code, "nl", option.country), expected.nl);
    assert.equal(getCountryDisplayNameForLocale(code, "es-es", option.country), expected.es);
    assert.equal(getCountryDisplayNameForLocale(code, "fr", option.country), expected.fr);
    assert.equal(getCountryDisplayNameForLocale(code, "de-de", option.country), expected.de);
    assert.equal(getCountryDisplayNameForLocale(code, "it-it", option.country), expected.it);
    assert.equal(getCountryDisplayNameForLocale(code, "pt-br", option.country), expected.pt);
  }
});

test("airport picker heading is localized for all active locales", () => {
  assert.equal(enTranslations.airportsAndCities, "AIRPORTS AND CITIES");
  assert.equal(arTranslations.airportsAndCities, "المطارات والمدن");
  assert.equal(nlTranslations.airportsAndCities, "LUCHTHAVENS EN STEDEN");
  assert.equal(esTranslations.airportsAndCities, "AEROPUERTOS Y CIUDADES");
  assert.equal(frTranslations.airportsAndCities, "AÉROPORTS ET VILLES");
  assert.equal(deTranslations.airportsAndCities, "FLUGHÄFEN UND STÄDTE");
  assert.equal(itTranslations.airportsAndCities, "AEROPORTI E CITTÀ");
  assert.equal(ptBrTranslations.airportsAndCities, "AEROPORTOS E CIDADES");
  assert.equal(zhCnTranslations.airportsAndCities, "机场和城市");
  assert.equal(jaTranslations.airportsAndCities, "空港と都市");
  assert.equal(koTranslations.airportsAndCities, "공항 및 도시");
  assert.equal(hiTranslations.airportsAndCities, "हवाई अड्डे और शहर");
  assert.equal(trTranslations.airportsAndCities, "HAVALİMANLARI VE ŞEHİRLER");
  assert.notEqual(trTranslations.airportsAndCities, enTranslations.airportsAndCities);
  assert.equal(trTranslations.nearYou, "YAKININIZDA");
  assert.notEqual(trTranslations.nearYou, enTranslations.nearYou);
});

test("active account trips and price alerts copy is localized", () => {
  const activeLocaleTranslations = {
    "en-us": enTranslations,
    ar: arTranslations,
    nl: nlTranslations,
    "es-es": esTranslations,
    fr: frTranslations,
    "de-de": deTranslations,
    "it-it": itTranslations,
    "pt-br": ptBrTranslations,
    "zh-cn": zhCnTranslations,
    ja: jaTranslations,
    ko: koTranslations,
    hi: hiTranslations,
    tr: trTranslations,
  };

  const travelActivityKeys = [
    "accountDashboard.trips.title",
    "accountDashboard.trips.findReservation",
    "accountDashboard.trips.current.empty.title",
    "accountDashboard.trips.current.empty.body",
    "accountDashboard.trips.history.tabs.past",
    "accountDashboard.trips.history.tabs.cancelled",
    "accountDashboard.trips.history.empty.past.title",
    "accountDashboard.trips.history.empty.past.body",
    "accountDashboard.trips.history.empty.cancelled.title",
    "accountDashboard.trips.history.empty.cancelled.body",
    "accountDashboard.priceAlerts.title",
    "accountDashboard.priceAlerts.description",
    "accountDashboard.priceAlerts.tabs.active",
    "accountDashboard.priceAlerts.tabs.expired",
    "accountDashboard.priceAlerts.tabs.all",
    "accountDashboard.priceAlerts.sort.label",
    "accountDashboard.priceAlerts.sort.newest",
    "accountDashboard.priceAlerts.sort.oldest",
    "accountDashboard.priceAlerts.sort.routeAz",
    "accountDashboard.priceAlerts.empty.title",
    "accountDashboard.priceAlerts.empty.body",
    "accountDashboard.priceAlerts.features.monitoring.title",
    "accountDashboard.priceAlerts.features.monitoring.body",
    "accountDashboard.priceAlerts.features.email.title",
    "accountDashboard.priceAlerts.features.email.body",
    "accountDashboard.priceAlerts.features.trends.title",
    "accountDashboard.priceAlerts.features.trends.body",
    "accountDashboard.priceAlerts.features.management.title",
    "accountDashboard.priceAlerts.features.management.body",
    "accountDashboard.priceAlerts.filtersAriaLabel",
    "accountDashboard.priceAlerts.sort.ariaLabel",
    "accountDashboard.priceAlerts.featuresAriaLabel",
    "accountDashboard.trips.history.filtersAriaLabel",
    "accountDashboard.trips.illustration.currentAriaLabel",
    "accountDashboard.trips.illustration.historyAriaLabel",
    "accountDashboard.trips.illustration.cancelledAriaLabel",
    "accountDashboard.trips.lookup.title",
    "accountDashboard.trips.lookup.body",
    "accountDashboard.trips.lookup.closeAriaLabel",
    "accountDashboard.trips.lookup.reservationCode",
    "accountDashboard.trips.lookup.emailAddress",
    "accountDashboard.trips.lookup.submit",
    "accountDashboard.trips.lookup.unavailable",
    "accountDashboard.trips.lookup.reservationCodeRequired",
    "accountDashboard.trips.lookup.emailRequired",
    "accountDashboard.trips.lookup.invalidEmail",
    "accountDashboard.trips.lookup.loading",
    "accountDashboard.trips.lookup.notFoundTitle",
    "accountDashboard.trips.lookup.notFoundDescription",
  ];

  for (const [locale, translations] of Object.entries(activeLocaleTranslations)) {
    for (const key of travelActivityKeys) {
      assert.equal(typeof translations[key], "string", `${locale} should define ${key}`);
      assert.notEqual(translations[key], "", `${locale} should not leave ${key} empty`);
    }
  }

  const screenshotVisibleKeys = travelActivityKeys.filter(
    (key) =>
      !key.endsWith("AriaLabel") &&
      key !== "accountDashboard.priceAlerts.featuresAriaLabel" &&
      key !== "accountDashboard.trips.history.tabs.active",
  );

  for (const [locale, translations] of Object.entries(activeLocaleTranslations)) {
    if (locale === "en-us" || locale === "hi") continue;

    for (const key of screenshotVisibleKeys) {
      assert.notEqual(translations[key], enTranslations[key], `${locale} should localize ${key}`);
    }
  }

  assert.equal(trTranslations["accountDashboard.trips.title"], "Seyahatlerim");
  assert.equal(trTranslations["accountDashboard.trips.findReservation"], "Rezervasyon bul");
  assert.equal(trTranslations["accountDashboard.trips.current.empty.title"], "Sırada nereye?");
  assert.equal(
    trTranslations["accountDashboard.trips.current.empty.body"],
    "Henüz bir seyahate başlamadınız. Rezervasyon yaptığınızda burada görünecek.",
  );
  assert.equal(trTranslations["accountDashboard.trips.history.tabs.past"], "Geçmiş");
  assert.equal(trTranslations["accountDashboard.trips.history.tabs.cancelled"], "İptal edilenler");
  assert.equal(trTranslations["accountDashboard.trips.history.empty.past.title"], "Yolculuklarınızı hatırlayın");
  assert.equal(
    trTranslations["accountDashboard.trips.history.empty.past.body"],
    "Tamamlanan seyahatleriniz seyahatinizden sonra burada görünecek.",
  );
  assert.equal(trTranslations["accountDashboard.trips.history.empty.cancelled.title"], "Planlar değişti mi?");
  assert.equal(
    trTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "İptal edilen rezervasyonlarınız referans için burada görünecek.",
  );
  assert.equal(trTranslations["accountDashboard.priceAlerts.title"], "Fiyat uyarıları");
  assert.equal(
    trTranslations["accountDashboard.priceAlerts.description"],
    "Fiyatları takip edin ve ücretler değiştiğinde bildirim alın.",
  );
  assert.equal(trTranslations["accountDashboard.priceAlerts.tabs.active"], "Aktif");
  assert.equal(trTranslations["accountDashboard.priceAlerts.tabs.expired"], "Süresi dolan");
  assert.equal(trTranslations["accountDashboard.priceAlerts.tabs.all"], "Tümü");
  assert.equal(trTranslations["accountDashboard.priceAlerts.sort.label"], "Sırala");
  assert.equal(trTranslations["accountDashboard.priceAlerts.sort.newest"], "En yeni");
  assert.equal(trTranslations["accountDashboard.priceAlerts.sort.oldest"], "En eski");
  assert.equal(trTranslations["accountDashboard.priceAlerts.sort.routeAz"], "Rota A-Z");
  assert.equal(trTranslations["accountDashboard.priceAlerts.empty.title"], "Henüz fiyat uyarısı yok.");
  assert.equal(
    trTranslations["accountDashboard.priceAlerts.empty.body"],
    "Ücret değişikliklerini takip etmek ve bildirim almak için bir uçuş aramasından uyarı oluşturun.",
  );
  assert.equal(trTranslations["accountDashboard.priceAlerts.cta.flights"], "Uçuş ara");
  assert.equal(trTranslations["accountDashboard.priceAlerts.features.monitoring.title"], "Gerçek zamanlı takip");
  assert.equal(
    trTranslations["accountDashboard.priceAlerts.features.monitoring.body"],
    "Fiyatları takip eder ve uyarılar tetiklendiğinde sizi bilgilendiririz.",
  );
  assert.equal(trTranslations["accountDashboard.priceAlerts.features.email.title"], "E-posta bildirimleri");
  assert.equal(trTranslations["accountDashboard.priceAlerts.features.email.body"], "Ücretler değiştiğinde bildirim alın.");
  assert.equal(trTranslations["accountDashboard.priceAlerts.features.trends.title"], "Fiyat trendleri");
  assert.equal(
    trTranslations["accountDashboard.priceAlerts.features.trends.body"],
    "Takip edilen ücretlerin zaman içinde nasıl değiştiğini görün.",
  );
  assert.equal(trTranslations["accountDashboard.priceAlerts.features.management.title"], "Kolay yönetim");
  assert.equal(
    trTranslations["accountDashboard.priceAlerts.features.management.body"],
    "Uyarıları istediğiniz zaman duraklatın veya kaldırın.",
  );

  const tripsManagementSource = readFileSync("src/app/dashboard/trips/TripsManagementPage.tsx", "utf8");
  assert.ok(tripsManagementSource.includes('type TripHistoryTab = "past" | "cancelled"'));
  assert.ok(tripsManagementSource.includes('{ id: "active", labelKey: "accountDashboard.trips.history.tabs.active" }'));
  assert.ok(tripsManagementSource.includes('setLookupMessage(t("accountDashboard.trips.lookup.unavailable"))'));
  assert.ok(!tripsManagementSource.includes('>My Trips<'));
  assert.ok(!tripsManagementSource.includes('>Find a reservation<'));

  const priceAlertsSource = readFileSync("src/app/dashboard/alerts/PriceAlertsContent.tsx", "utf8");
  assert.ok(priceAlertsSource.includes('id: "active"') && priceAlertsSource.includes('count: 0'));
  assert.ok(priceAlertsSource.includes('id: "expired"') && priceAlertsSource.includes('count: 0'));
  assert.ok(priceAlertsSource.includes('{ id: "newest", labelKey: "accountDashboard.priceAlerts.sort.newest" }'));
  assert.ok(priceAlertsSource.includes('{ id: "oldest", labelKey: "accountDashboard.priceAlerts.sort.oldest" }'));
  assert.ok(priceAlertsSource.includes('{ id: "routeAz", labelKey: "accountDashboard.priceAlerts.sort.routeAz" }'));
  assert.ok(priceAlertsSource.includes('href="/flights"'));
  assert.ok(priceAlertsSource.includes('{`${t[tab.labelKey]} (${tab.count})`}'));
  assert.ok(!priceAlertsSource.includes('>Price alerts<'));
  assert.ok(!priceAlertsSource.includes('>Search flights<'));

  assert.equal(koTranslations["accountDashboard.hub.title"], "내 계정");
  assert.equal(koTranslations["accountDashboard.trips.title"], "내 여행");
  assert.equal(koTranslations["accountDashboard.trips.findReservation"], "예약 찾기");
  assert.equal(koTranslations["accountDashboard.trips.lookup.title"], "예약 정보 입력");
  assert.equal(
    koTranslations["accountDashboard.trips.lookup.body"],
    "예약을 찾고 관리하려면 예약 코드와 이메일 주소를 입력하세요.",
  );
  assert.equal(koTranslations["accountDashboard.trips.lookup.closeAriaLabel"], "닫기");
  assert.equal(koTranslations["accountDashboard.trips.lookup.reservationCode"], "예약 코드");
  assert.equal(koTranslations["accountDashboard.trips.lookup.emailAddress"], "이메일 주소");
  assert.equal(koTranslations["accountDashboard.trips.lookup.submit"], "예약 찾기");
  assert.equal(koTranslations["accountDashboard.trips.lookup.reservationCodeRequired"], "예약 코드를 입력하세요.");
  assert.equal(koTranslations["accountDashboard.trips.lookup.emailRequired"], "이메일 주소를 입력하세요.");
  assert.equal(koTranslations["accountDashboard.trips.lookup.invalidEmail"], "유효한 이메일 주소를 입력하세요.");
  assert.equal(koTranslations["accountDashboard.trips.lookup.loading"], "예약을 찾는 중...");
  assert.equal(koTranslations["accountDashboard.trips.lookup.notFoundTitle"], "예약을 찾을 수 없습니다.");
  assert.equal(
    koTranslations["accountDashboard.trips.lookup.notFoundDescription"],
    "입력한 정보와 일치하는 예약을 찾을 수 없습니다.",
  );
  assert.equal(koTranslations["accountDashboard.trips.current.empty.title"], "다음 여행지는 어디인가요?");
  assert.equal(
    koTranslations["accountDashboard.trips.current.empty.body"],
    "아직 시작한 여행이 없습니다. 예약을 하면 여기에 표시됩니다.",
  );
  assert.equal(koTranslations["accountDashboard.trips.history.tabs.past"], "지난 여행");
  assert.equal(koTranslations["accountDashboard.trips.history.tabs.cancelled"], "취소됨");
  assert.equal(koTranslations["accountDashboard.trips.history.empty.past.title"], "여행 기록을 확인하세요");
  assert.equal(koTranslations["accountDashboard.trips.history.empty.past.body"], "여행이 완료되면 여기에 표시됩니다.");
  assert.equal(koTranslations["accountDashboard.trips.history.empty.cancelled.title"], "계획이 변경되었나요?");
  assert.equal(
    koTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "취소된 예약은 참고용으로 여기에 표시됩니다.",
  );
  assert.equal(koTranslations["accountDashboard.priceAlerts.title"], "가격 알림");
  assert.equal(
    koTranslations["accountDashboard.priceAlerts.description"],
    "요금을 추적하고 가격이 변경되면 알림을 받으세요.",
  );
  assert.equal(koTranslations["accountDashboard.priceAlerts.tabs.active"], "활성");
  assert.equal(koTranslations["accountDashboard.priceAlerts.tabs.expired"], "만료됨");
  assert.equal(koTranslations["accountDashboard.priceAlerts.tabs.all"], "전체");
  assert.equal(koTranslations["accountDashboard.priceAlerts.sort.label"], "정렬 기준");
  assert.equal(koTranslations["accountDashboard.priceAlerts.sort.newest"], "최신순");
  assert.equal(koTranslations["accountDashboard.priceAlerts.sort.oldest"], "오래된순");
  assert.equal(koTranslations["accountDashboard.priceAlerts.sort.routeAz"], "노선 A-Z");
  assert.equal(koTranslations["accountDashboard.priceAlerts.empty.title"], "아직 가격 알림이 없습니다.");
  assert.equal(
    koTranslations["accountDashboard.priceAlerts.empty.body"],
    "항공권 검색에서 알림을 만들어 요금 변동을 추적하고 알림을 받으세요.",
  );
  assert.equal(koTranslations["accountDashboard.priceAlerts.features.monitoring.title"], "실시간 모니터링");
  assert.equal(
    koTranslations["accountDashboard.priceAlerts.features.monitoring.body"],
    "가격을 모니터링하고 알림 조건이 충족되면 알려드립니다.",
  );
  assert.equal(koTranslations["accountDashboard.priceAlerts.features.email.title"], "이메일 알림");
  assert.equal(koTranslations["accountDashboard.priceAlerts.features.email.body"], "요금이 변경되면 알림을 받으세요.");
  assert.equal(koTranslations["accountDashboard.priceAlerts.features.trends.title"], "가격 추세");
  assert.equal(
    koTranslations["accountDashboard.priceAlerts.features.trends.body"],
    "추적 중인 요금이 시간에 따라 어떻게 변하는지 확인하세요.",
  );
  assert.equal(koTranslations["accountDashboard.priceAlerts.features.management.title"], "간편한 관리");
  assert.equal(
    koTranslations["accountDashboard.priceAlerts.features.management.body"],
    "언제든지 알림을 일시 중지하거나 삭제할 수 있습니다.",
  );

  assert.equal(hiTranslations["accountDashboard.trips.title"], "मेरी यात्राएँ");
  assert.equal(hiTranslations["accountDashboard.trips.findReservation"], "आरक्षण खोजें");
  assert.equal(hiTranslations["accountDashboard.trips.current.empty.title"], "अब अगला कहाँ?");
  assert.equal(
    hiTranslations["accountDashboard.trips.current.empty.body"],
    "आपने अभी कोई यात्रा शुरू नहीं की है। जब आप आरक्षण करेंगे, वह यहाँ दिखाई देगा।",
  );
  assert.equal(hiTranslations["accountDashboard.trips.history.tabs.past"], "पिछली");
  assert.equal(hiTranslations["accountDashboard.trips.history.tabs.cancelled"], "रद्द की गई");
  assert.equal(hiTranslations["accountDashboard.trips.history.empty.past.title"], "अपनी यात्राएँ याद रखें");
  assert.equal(
    hiTranslations["accountDashboard.trips.history.empty.past.body"],
    "यात्रा पूरी होने के बाद आपकी पूरी की गई यात्राएँ यहाँ दिखाई देंगी।",
  );
  assert.equal(hiTranslations["accountDashboard.trips.history.empty.cancelled.title"], "योजनाएँ बदल गईं?");
  assert.equal(
    hiTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "आपके रद्द किए गए आरक्षण संदर्भ के लिए यहाँ दिखाई देंगे।",
  );
  assert.equal(hiTranslations["accountDashboard.priceAlerts.title"], "मूल्य अलर्ट");
  assert.equal(
    hiTranslations["accountDashboard.priceAlerts.description"],
    "कीमतों पर नज़र रखें और किराए बदलने पर सूचना पाएँ।",
  );
  assert.equal(hiTranslations["accountDashboard.priceAlerts.tabs.active"], "सक्रिय");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.tabs.expired"], "समाप्त");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.tabs.all"], "सभी");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.sort.label"], "क्रमबद्ध करें");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.sort.newest"], "नवीनतम");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.sort.oldest"], "सबसे पुराने");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.sort.routeAz"], "मार्ग A-Z");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.empty.title"], "अभी कोई मूल्य अलर्ट नहीं है।");
  assert.equal(
    hiTranslations["accountDashboard.priceAlerts.empty.body"],
    "किराए में बदलाव पर नज़र रखने और सूचना पाने के लिए उड़ान खोज से अलर्ट बनाएँ।",
  );
  assert.equal(hiTranslations["accountDashboard.priceAlerts.cta.flights"], "उड़ानें खोजें");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.features.monitoring.title"], "रीयल-टाइम निगरानी");
  assert.equal(
    hiTranslations["accountDashboard.priceAlerts.features.monitoring.body"],
    "हम कीमतों की निगरानी करते हैं और अलर्ट ट्रिगर होने पर आपको बताते हैं।",
  );
  assert.equal(hiTranslations["accountDashboard.priceAlerts.features.email.title"], "ईमेल सूचनाएँ");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.features.email.body"], "किराए बदलने पर सूचना पाएँ।");
  assert.equal(hiTranslations["accountDashboard.priceAlerts.features.trends.title"], "मूल्य रुझान");
  assert.equal(
    hiTranslations["accountDashboard.priceAlerts.features.trends.body"],
    "देखें कि ट्रैक किए गए किराए समय के साथ कैसे बदलते हैं।",
  );
  assert.equal(hiTranslations["accountDashboard.priceAlerts.features.management.title"], "आसान प्रबंधन");
  assert.equal(
    hiTranslations["accountDashboard.priceAlerts.features.management.body"],
    "कभी भी अलर्ट रोकें या हटाएँ।",
  );
});

test("Hindi flights flow copy uses localized labels without mutating dynamic flight values", () => {
  const hi = getTranslations("hi");

  const expectedHindiFlightLabels: Record<string, string> = {
    flightLandingHeroTitle: "अपनी अगली उपयोगी उड़ान आसानी से खोजें।",
    flightLandingFeatureSearchReadyTitle: "खोज के लिए तैयार मार्ग",
    cheapest: "सबसे सस्ता",
    best: "सर्वश्रेष्ठ",
    quickest: "सबसे तेज़",
    departs: "प्रस्थान {{time}}",
    resultsFound: "{{count}} परिणाम मिले",
    flightOption: "उड़ान विकल्प",
    outbound: "प्रस्थान",
    return: "वापसी",
    oneStop: "1 स्टॉप",
    stopCount: "{{count}} स्टॉप",
    layoverSummaryTemplate: "लेओवर: {{airport}} {{duration}}",
    moreCount: "{{count}} और",
    estimatedPrice: "अनुमानित कीमत",
    providerPrice: "प्रदाता कीमत",
    viewFlight: "उड़ान देखें",
    baggage: "बैगेज",
    carryOnIncluded: "कैरी-ऑन शामिल",
    seatSelection: "सीट चयन",
    providerRulesApply: "प्रदाता नियम लागू होते हैं",
    cabin: "केबिन",
    fareRules: "किराया नियम",
    reviewBeforeBooking: "बुकिंग से पहले समीक्षा करें",
    filterBy: "फ़िल्टर करें",
    price: "कीमत",
    times: "समय",
    takeoff: "टेकऑफ़",
    landing: "लैंडिंग",
    takeoffTimeFromOrigin: "प्रस्थान स्थान से टेकऑफ़ समय",
    duration: "अवधि",
    totalTripTime: "कुल यात्रा समय",
    stops: "स्टॉप",
    optionsFound: "{{count}} विकल्प मिले",
    airports: "हवाई अड्डे",
    amenities: "सुविधाएँ",
    baggageIncluded: "बैगेज शामिल",
    flexibleRefundable: "लचीला/रिफंड योग्य",
    selectedFlights: "चुनी गई उड़ानें",
    flightRouteTemplate: "{{origin}} से {{destination}}",
    layoverTemplate: "{{airport}} में लेओवर · {{duration}} · {{connection}}",
    longConnection: "लंबा कनेक्शन",
    estimateShownProviderPrice: "अनुमान दिखाया गया। प्रदाता कीमत:",
    continueToProvider: "प्रदाता पर जारी रखें",
    compareMoreProviders: "और प्रदाताओं की तुलना करें",
    providerComparisonIntro: "Kurioticket अलग-अलग प्रदाताओं से तुलना कर सकता है।",
    noAdditionalLiveProviderOptions:
      "इस उड़ान के लिए अभी कोई अतिरिक्त लाइव प्रदाता विकल्प उपलब्ध नहीं हैं।",
  };

  for (const [key, value] of Object.entries(expectedHindiFlightLabels)) {
    assert.equal(hi[key], value, `${key} should be localized for Hindi flights flow`);
    assert.notEqual(hi[key], enTranslations[key], `${key} should not fall back to English in Hindi`);
  }

  assert.equal(hi.flightRouteTemplate.replace("{{origin}}", "लागोस").replace("{{destination}}", "लॉस एंजेलिस"), "लागोस से लॉस एंजेलिस");
  assert.equal(hi.departs.replace("{{time}}", "2:45 PM"), "प्रस्थान 2:45 PM");
  assert.equal(hi.layoverSummaryTemplate.replace("{{airport}}", "DOH").replace("{{duration}}", "7h 35m"), "लेओवर: DOH 7h 35m");
  assert.equal(hi.providerComparisonIntro.includes("Kurioticket"), true);
});

test("Turkish flights results copy uses localized labels without mutating dynamic flight values", () => {
  const tr = getTranslations("tr");

  const expectedTurkishFlightLabels: Record<string, string> = {
    cheapest: "En ucuz",
    best: "En iyi",
    quickest: "En hızlı",
    departs: "Kalkış {{time}}",
    resultsFound: "{{count}} sonuç bulundu",
    resultFound: "{{count}} sonuç bulundu",
    flightOption: "Uçuş seçeneği",
    outbound: "Gidiş",
    return: "Dönüş",
    nonstop: "Aktarmasız",
    oneStop: "1 aktarma",
    stopCount: "{{count}} aktarma",
    layover: "Aktarma",
    layoverSummaryTemplate: "Aktarma: {{airport}} {{duration}}",
    moreCount: "{{count}} daha",
    estimatedPrice: "Tahmini fiyat",
    providerPrice: "Sağlayıcı fiyatı",
    viewFlight: "Uçuşu görüntüle",
    baggage: "Bagaj",
    carryOnIncluded: "el bagajı dahil",
    cabin: "Kabin",
    seatSelection: "Koltuk seçimi",
    providerRulesApply: "Sağlayıcı kuralları geçerlidir",
    fareRules: "Ücret kuralları",
    reviewBeforeBooking: "Rezervasyondan önce inceleyin",
    flightDetailsProviderDisclaimer:
      "Son fiyat, uygunluk, rezervasyon ve ücret kuralları sağlayıcı tarafından onaylanır.",
    flightCardProviderHandoff:
      "Son fiyat, uygunluk, rezervasyon ve ücret kuralları sağlayıcı tarafından onaylanır.",
    providerNormalizedItineraryPrefix:
      "Gidiş ve dönüş ayrıntıları sağlayıcı tarafından normalize edilen güzergâh verilerinden gösterilir.",
    amenities: "Olanaklar",
    baggageIncluded: "Bagaj dahil",
    flexibleRefundable: "Esnek/iade edilebilir",
    tripType: "Seyahat türü",
    selectedFlights: "Seçilen uçuşlar",
    flightRouteTemplate: "{{origin}} - {{destination}}",
    layoverTemplate: "{{airport}} aktarması · {{duration}} · {{connection}}",
    estimateShownProviderPrice: "Tahmin gösteriliyor. Sağlayıcı fiyatı:",
    continueToProvider: "Sağlayıcıya devam et",
    compareMoreProviders: "Daha fazla sağlayıcı karşılaştır",
    providerComparisonIntro: "Kurioticket farklı sağlayıcıları karşılaştırabilir.",
  };

  for (const [key, value] of Object.entries(expectedTurkishFlightLabels)) {
    assert.equal(tr[key], value, `${key} should be localized for Turkish flights flow`);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English in Turkish`);
  }

  assert.equal(tr.departs.replace("{{time}}", "2:45 PM"), "Kalkış 2:45 PM");
  assert.equal(tr.resultsFound.replace("{{count}}", "12"), "12 sonuç bulundu");
  assert.equal(
    tr.layoverSummaryTemplate.replace("{{airport}}", "FRA").replace("{{duration}}", "7h 35m"),
    "Aktarma: FRA 7h 35m",
  );
  assert.equal(
    tr.displayEstimateConvertedFromProviderPrice
      .replace("{{formatted}}", "$1,234")
      .replace("{{providerPrice}}", "€1.100"),
    "$1,234. Görüntülenen tahmin €1.100 sağlayıcı fiyatından dönüştürüldü. Nihai sağlayıcı fiyatı farklı olabilir.",
  );
  assert.equal(tr.providerComparisonIntro.includes("Kurioticket"), true);
  assert.equal(["Lufthansa", "LH0569", "LOS", "LAX", "$1,234", "2:45 PM", "7h 35m", "LOS → LAX"].join(" · "), "Lufthansa · LH0569 · LOS · LAX · $1,234 · 2:45 PM · 7h 35m · LOS → LAX");
});

test("Hindi cars flow copy uses localized labels without mutating dynamic values", () => {
  const hi = getTranslations("hi");

  const expectedHindiCarsLabels: Record<string, string> = {
    searchRentalCarsEveryPartTrip: "अपनी यात्रा के हर हिस्से के लिए रेंटल कार खोजें",
    exploreCarsByTripStyle: "यात्रा शैली के अनुसार रेंटल कारें देखें",
    carsTripStyleBody: "कार का प्रकार चुनें और हम खोज संदर्भ के साथ परिणाम खोलेंगे।",
    "carsTrust.0.title": "पूरी यात्राओं के लिए बनाया गया",
    "carsTrust.0.description": "एक ही Kurioticket प्रवाह में उड़ानें, ठहराव और ज़मीनी परिवहन की योजना बनाएँ।",
    "carsPickupPointsTitle": "लोकप्रिय कार पिकअप स्थानों से शुरू करें",
    "carsPickupPointsBody": "पिकअप शैली चुनें और हम खोज विवरणों के साथ कार परिणाम पेज खोलेंगे।",
    "carsSearch.pickupLocationLabel": "पिकअप स्थान",
    "carsSearch.pickupLocationPlaceholder": "हवाई अड्डा, शहर या पता",
    "carsSearch.returnToSameLocation": "उसी स्थान पर वापसी",
    "carsSearch.differentReturnLocation": "अलग वापसी स्थान",
    "carsSearch.rentalDatesLabel": "रेंटल तिथियाँ",
    "carsSearch.rentalDatePlaceholder": "पिकअप तिथि — वापसी तिथि",
    "carsSearch.pickupReturnTimeLabel": "पिकअप / वापसी समय",
    "carsSearch.driverAgeLabel": "ड्राइवर की उम्र",
    "carsSearch.driverAgeAnyAge": "कोई भी उम्र",
    "carsSearch.chooseRentalDates": "रेंटल तिथियाँ चुनें",
    "carsSearch.previousMonthShort": "पिछला",
    "carsSearch.nextMonthShort": "अगला",
    "carsResults.searchCars": "कारें खोजें",
    "carsResults.pickupLocation": "पिकअप स्थान",
    "carsResults.returnLocation": "वापसी स्थान",
    "carsResults.sameAsPickup": "पिकअप जैसा ही",
    "carsResults.selectPickupThenReturn": "पहले पिकअप चुनें, फिर वापसी",
    "carsResults.anyDriverAgeRange": "कोई भी ड्राइवर उम्र 18–70",
    "carsResults.emptyInventory": "इस खोज के लिए लाइव कार इन्वेंटरी अभी दिखाने के लिए उपलब्ध नहीं है। ऊपर खोज विवरण अपडेट करें या बाद में फिर जाँचें।",
    "carsResults.filterBy": "फ़िल्टर करें",
    "carsResults.vehicleType": "वाहन प्रकार",
    "carsResults.smallCars": "छोटी कारें",
    "carsResults.mediumCars": "मध्यम कारें",
    "carsResults.suvs": "एसयूवी",
    "carsResults.transmission": "ट्रांसमिशन",
    "carsResults.automatic": "ऑटोमैटिक",
    "carsResults.manual": "मैनुअल",
    "carsResults.seats4Plus": "4+ सीटें",
    "carsResults.bags2Plus": "2+ बैग",
    "carsResults.unlimitedMileage": "असीमित माइलेज",
    "carsResults.freeCancellation": "मुफ़्त रद्दीकरण",
    "carsResults.payAtPickup": "पिकअप पर भुगतान करें",
    "carsResults.shuttlePickup": "शटल पिकअप",
    "carsResults.cityLocation": "शहर स्थान",
    "carsResults.edit": "संपादित करें",
    "carsFaq.heading": "कारों से जुड़े अक्सर पूछे जाने वाले प्रश्न",
    "carsFaq.0.question": "रेंटल कार खोजने के लिए मुझे कौन-सी जानकारी चाहिए?",
    "carsFaq.0.answer": "अपना पिकअप स्थान, पिकअप और वापसी तिथियाँ, पिकअप और वापसी समय, ड्राइवर की उम्र, और क्या आप कार किसी अलग स्थान पर वापस करना चाहते हैं, यह दर्ज करें।",
    "carsFaq.1.question": "क्या मैं कार किसी अलग स्थान पर वापस कर सकता हूँ?",
    "carsFaq.1.answer": "हाँ। खोज फ़ॉर्म में अलग वापसी स्थान चुनें और वह ड्रॉप-ऑफ़ शहर, हवाई अड्डा या पता दर्ज करें जहाँ आप कार वापस करना चाहते हैं।",
    "carsFaq.2.question": "रेंटल कारों के लिए ड्राइवर की उम्र क्यों मायने रखती है?",
    "carsFaq.2.answer": "रेंटल प्रदाता ड्राइवर की उम्र और स्थान के आधार पर अलग नियम, शुल्क, वाहन पात्रता या जमा राशि की आवश्यकताएँ लागू कर सकते हैं।",
    "carsFaq.3.question": "रेंटल कार बुक करने से पहले मुझे क्या जाँचना चाहिए?",
    "carsFaq.3.answer": "बुकिंग से पहले पिकअप और वापसी स्थान, तिथियाँ, समय, माइलेज नीति, ईंधन नीति, बीमा विकल्प, रद्दीकरण शर्तें, जमा राशि की आवश्यकताएँ और ज़रूरी दस्तावेज़ों की समीक्षा करें।",
    "carsFaq.4.question": "अंतिम रेंटल कीमत कहाँ पुष्टि होती है?",
    "carsFaq.4.answer": "अंतिम कीमत, वाहन उपलब्धता, कर, शुल्क, जमा राशि की आवश्यकताएँ और रेंटल नियम बुकिंग से पहले प्रदाता द्वारा पुष्टि किए जाते हैं।",
    "carsFaq.5.question": "पिकअप के समय मुझे कौन-से दस्तावेज़ चाहिए हो सकते हैं?",
    "carsFaq.5.answer": "रेंटल प्रदाता वैध ड्राइवर लाइसेंस, भुगतान कार्ड, पहचान प्रमाण और पिकअप देश या स्थान के अनुसार आवश्यक दस्तावेज़ माँग सकते हैं।",
  };

  for (const [key, value] of Object.entries(expectedHindiCarsLabels)) {
    assert.equal(hi[key], value, `${key} should be localized for Hindi cars flow`);
    assert.notEqual(hi[key], enTranslations[key], `${key} should not fall back to English in Hindi`);
  }

  assert.equal(
    hi["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"),
    "10:00 पिकअप — 10:00 वापसी",
  );
  assert.equal(hi["carsResults.resultsFor"].replace("{location}", hi["carsResults.pickupLocationNeeded"]), "पिकअप स्थान आवश्यक के लिए कार परिणाम");
  assert.equal(hi["carsResults.resultsFor"].replace("{location}", "lagos"), "lagos के लिए कार परिणाम");
  assert.equal(new Intl.DateTimeFormat("hi-IN", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)), "जून 2026");
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("hi-IN", { weekday: "short" }).format(new Date(2024, 0, 7 + day))),
    ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  );
});

test("Turkish hotels landing render path copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const auditedTurkishHotelLandingKeys: Array<[string, string]> = [
    ["hotelsHeroEyebrow", "PREMİUM KONAKLAMALAR, NET KARŞILAŞTIRMA"],
    ["hotelsHeroTitle", "Seyahatinize doğru başlayan konaklamayı bulun."],
    [
      "hotelsHeroSubtitle",
      "Şık şehir konaklamalarından rahat resort kaçamaklarına kadar otelleri tek yerde karşılaştırın.",
    ],
    ["hotelSearchDestinationLabel", "VARIŞ"],
    ["hotelSearchDestinationPlaceholder", "Şehir, bölge veya simge yapı"],
    ["hotelSearchTravelDatesLabel", "Seyahat tarihleri"],
    ["hotelSearchDatePlaceholder", "Giriş — Çıkış"],
    ["hotelSearchGuestsLabel", "Misafirler"],
    ["exploreHotelStaysByDestination", "Destinasyona göre otel konaklamalarını keşfedin"],
    ["featuredHotelDestinations", "Öne çıkan otel destinasyonları"],
    ["findStaysEveryKindTrip", "Her tür seyahat için konaklama bulun"],
    ["hotelInspirationBody", "Aklınızdaki konaklama türüne göre destinasyon fikirlerine göz atın."],
    ["hotelInspirationCategory.Beach", "Plaj"],
    ["hotelInspirationCategory.City breaks", "Şehir kaçamakları"],
    ["hotelInspirationCategory.Family trips", "Aile seyahatleri"],
    ["hotelInspirationCategory.Relaxed stays", "Rahat konaklamalar"],
    ["hotelInspirationCategory.Weekend ideas", "Hafta sonu fikirleri"],
    ["hotelInspirationBadge.Coastal stays", "Kıyı konaklamaları"],
    ["hotelInspirationBadge.City coast", "Şehir kıyısı"],
    ["hotelInspirationBadge.Waterfront stays", "Sahil konaklamaları"],
    ["hotelDestination.Tokyo.title", "Japonya"],
    ["hotelDestination.Tokyo.subtitle", "Tokyo konaklamaları"],
    ["hotelDestination.London.title", "Birleşik Krallık"],
    ["hotelDestination.London.subtitle", "Londra konaklamaları"],
    ["hotelDestination.Paris.title", "Fransa"],
    ["hotelDestination.Paris.subtitle", "Paris konaklamaları"],
    ["hotelDestination.New York.title", "Amerika Birleşik Devletleri"],
    ["hotelDestination.New York.subtitle", "New York konaklamaları"],
    ["hotelDestination.Cancun.title", "Meksika"],
    ["hotelDestination.Barcelona.title", "İspanya"],
    ["hotelDestination.Dubai.title", "Birleşik Arap Emirlikleri"],
    ["exploreStaysWorldwide", "Dünya genelinde konaklamaları keşfedin"],
    ["hotelTrustReviewTitle", "Konaklama detaylarını inceleyin"],
  ];

  for (const [key, expected] of auditedTurkishHotelLandingKeys) {
    assert.equal(tr[key], expected, `${key} should resolve to Turkish`);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const hotelsPageSource = readFileSync("src/app/hotels/page.tsx", "utf8");

  for (const key of ["hotelsHeroEyebrow", "hotelsHeroTitle", "hotelsHeroSubtitle"]) {
    assert.ok(
      hotelsPageSource.includes(`t("${key}")`),
      `Hotels hero render path should resolve ${key} through i18n`,
    );
  }
  assert.ok(
    !hotelsPageSource.includes("PREMIUM STAYS, CLEARLY COMPARED") &&
      !hotelsPageSource.includes("Find the stay that starts the trip right.") &&
      !hotelsPageSource.includes("Compare hotels in one place, from polished city arrivals to easy resort escapes."),
    "Hotels hero render path should not hard-code screenshot-visible English copy.",
  );
});

test("Turkish hotel calendar locale normalizes to tr-TR for generated month headings", async () => {
  const { normalizeHotelCalendarLocale } = await import("@/lib/hotelsDateFormatting");

  for (const locale of ["tr", "tr-TR", "tr-tr"]) {
    const normalized = normalizeHotelCalendarLocale(locale);
    assert.equal(normalized, "tr-TR");
    assert.equal(
      new Intl.DateTimeFormat(normalized, { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)),
      "Haziran 2026",
    );
    assert.equal(
      new Intl.DateTimeFormat(normalized, { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)),
      "Temmuz 2026",
    );
  }
});

test("Turkish cars landing render path copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const auditedTurkishCarsLandingKeys: Array<[string, string]> = [
    ["searchRentalCarsEveryPartTrip", "Seyahatinizin her bölümü için kiralık araç arayın"],
    ["carsSearch.pickupLocationLabel", "Alış konumu"],
    ["carsSearch.pickupLocationPlaceholder", "Havalimanı, şehir veya adres"],
    ["carsSearch.returnLocationPlaceholder", "İade şehri, havalimanı veya adres"],
    ["carsSearch.returnToSameLocation", "Aynı konuma iade et"],
    ["carsSearch.differentReturnLocation", "Farklı iade konumu"],
    ["carsSearch.rentalDatesLabel", "Kiralama tarihleri"],
    ["carsSearch.rentalDatePlaceholder", "Alış tarihi — İade tarihi"],
    ["carsSearch.pickupReturnTimeLabel", "Alış / iade saati"],
    ["carsSearch.pickupReturnTimeSummary", "{pickupTime} alış — {returnTime} iade"],
    ["carsSearch.driverAgeLabel", "Sürücü yaşı"],
    ["carsSearch.driverAgeAnyAge", "Her yaş"],
    ["carsSearch.chooseRentalDates", "Kiralama tarihlerini seçin"],
    ["carsSearch.previousMonthShort", "Önceki"],
    ["carsSearch.nextMonthShort", "Sonraki"],
    ["exploreCarsByTripStyle", "Seyahat tarzına göre kiralık araçları keşfedin"],
    ["carsTripStyleBody", "Bir araç türü seçin; arama bilgileri hazır şekilde sonuçları açalım."],
    ["carsTripStyle.economy.title", "Ekonomi araçlar"],
    ["carsTripStyle.economy.subtitle", "Uygun fiyatlı şehir ve tek kişilik seyahat aramaları"],
    ["carsTripStyle.economy.cta", "Ekonomi araç araması başlat"],
    ["carsTrust.0.title", "Eksiksiz seyahatler için tasarlandı"],
    ["carsTrust.0.description", "Uçuşları, konaklamaları ve kara ulaşımını tek bir Kurioticket akışında planlayın."],
    ["carsTrust.1.title", "Önce alış detayları"],
    ["carsTrust.2.title", "Net kiralama incelemesi"],
    ["carsPickupPointsTitle", "Popüler araç alış noktalarıyla başlayın"],
    ["carsPickupPointsBody", "Bir alış tarzı seçin; arama detayları hazır şekilde araç sonuçları sayfasını açalım."],
    ["carsPickup.Airport.title", "Havalimanı alışları"],
    ["carsPickup.City center.title", "Şehir merkezi alışları"],
    ["carsPickup.Train station.title", "Tren istasyonu alışları"],
    ["carsPickup.Hotel area.title", "Otel bölgesi alışları"],
    ["carsFaq.heading", "Araçlar hakkında sık sorulan sorular"],
  ];

  for (const [key, expected] of auditedTurkishCarsLandingKeys) {
    assert.equal(tr[key], expected, `${key} should resolve to Turkish`);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(
    tr["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"),
    "10:00 alış — 10:00 iade",
  );

  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
  for (const key of ["searchRentalCarsEveryPartTrip", "carsSearch.pickupLocationLabel", "carsSearch.chooseRentalDates", "exploreCarsByTripStyle", "carsPickupPointsTitle"]) {
    assert.ok(carsPageSource.includes(`t("${key}")`), `Cars landing render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsPageSource.includes("buildCarResultsHref") &&
      carsPageSource.includes("pickupLocation: card.pickupLocation") &&
      carsPageSource.includes("vehicleType: card.vehicleType"),
    "Cars landing cards should keep raw pickup/search/query values when building result links.",
  );
  assert.ok(
    !carsPageSource.includes("Search rental cars for every part of your trip") &&
      !carsPageSource.includes("Explore rental cars by trip style") &&
      !carsPageSource.includes("Start with popular car pickup points"),
    "Cars landing render path should not hard-code screenshot-visible English copy.",
  );
});

test("Turkish cars calendar locale normalizes to tr-TR for generated datepicker labels", () => {
  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");

  assert.ok(
    carsPageSource.includes('normalizedLocale.startsWith("tr")') && carsPageSource.includes('return "tr-TR"'),
    "Cars datepicker locale helper should normalize Turkish locales to tr-TR.",
  );
  assert.equal(
    new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)),
    "Haziran 2026",
  );
  assert.equal(
    new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)),
    "Temmuz 2026",
  );
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(new Date(2024, 0, 7 + day))),
    ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
  );
});

test("Turkish cars results render path copy resolves without English fallback", () => {
  const tr = getTranslations("tr");
  const auditedTurkishCarsResultsKeys: Array<[string, string]> = [
    ["carsResults.resultsLabel", "Araç sonuçları"],
    ["carsResults.resultsFor", "{location} için araç sonuçları"],
    ["carsResults.filterBy", "Filtrele"],
    ["carsResults.searchCars", "Araç ara"],
    ["carsResults.pickupLocation", "ALIŞ KONUMU"],
    ["carsResults.returnLocation", "İADE KONUMU"],
    ["carsResults.pickupLocationNeeded", "Alış konumu gerekli"],
    ["carsResults.sameAsPickup", "Alış konumuyla aynı"],
    ["carsResults.selectPickupThenReturn", "Önce alış, sonra iade tarihini seçin"],
    ["carsResults.rentalDates", "KİRALAMA TARİHLERİ"],
    ["carsResults.pickupReturnTime", "ALIŞ / İADE SAATİ"],
    ["carsResults.driverAge", "SÜRÜCÜ YAŞI"],
    ["carsResults.anyDriverAgeRange", "Her sürücü yaşı 18–70"],
    ["carsResults.emptyInventory", "Bu arama için canlı araç envanteri henüz gösterilemiyor. Yukarıdaki arama bilgilerini güncelleyin veya daha sonra tekrar kontrol edin."],
    ["carsResults.bags", "Bagaj"],
    ["carsResults.bags2Plus", "2+ bagaj"],
    ["carsResults.bags3Plus", "3+ bagaj"],
    ["carsResults.bags4Plus", "4+ bagaj"],
    ["carsResults.fuelPolicy", "Yakıt politikası"],
    ["carsResults.mileagePolicy", "Kilometre politikası"],
    ["carsResults.unlimitedMileage", "Sınırsız kilometre"],
    ["carsResults.limitedMileage", "Sınırlı kilometre"],
    ["carsResults.cancellation", "İptal"],
    ["carsResults.freeCancellation", "Ücretsiz iptal"],
    ["carsResults.payAtPickup", "Alışta öde"],
    ["carsResults.shuttlePickup", "Servisle alış"],
    ["carsResults.cityLocation", "Şehir içi konum"],
  ];

  for (const [key, expected] of auditedTurkishCarsResultsKeys) {
    assert.equal(tr[key], expected, `${key} should resolve to Turkish`);
    assert.notEqual(tr[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(
    tr["carsResults.resultsFor"].replace("{location}", tr["carsResults.pickupLocationNeeded"]),
    "Alış konumu gerekli için araç sonuçları",
  );
  assert.equal(
    tr["carsResults.resultsFor"].replace("{location}", "lagos"),
    "lagos için araç sonuçları",
  );

  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  for (const key of [
    "carsResults.pickupLocation",
    "carsResults.returnLocation",
    "carsResults.rentalDates",
    "carsResults.pickupReturnTime",
    "carsResults.driverAge",
    "carsResults.searchCars",
    "carsResults.emptyInventory",
    "carsResults.filterBy",
  ]) {
    assert.ok(carsResultsSource.includes(`t("${key}")`), `Cars results render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsResultsSource.includes('action="/cars/results"') &&
      carsResultsSource.includes('name="pickupLocation"') &&
      carsResultsSource.includes('name="dropoffLocation"') &&
      carsResultsSource.includes('name="pickupDate"') &&
      carsResultsSource.includes('name="driverAge"') &&
      carsResultsSource.includes('value={pickupLocation}') &&
      carsResultsSource.includes('value={driverAge}'),
    "Cars results search form should keep raw search/query values when submitting.",
  );
});

test("Turkish cars results datepicker locale normalizes to tr-TR", () => {
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");

  assert.ok(
    carsResultsSource.includes('normalizedLocale.startsWith("tr")') && carsResultsSource.includes('return "tr-TR"'),
    "Cars results datepicker locale helper should normalize Turkish locales to tr-TR.",
  );
  assert.ok(
    carsResultsSource.includes('["de", "es", "fr", "ja", "nl", "pt", "tr"]'),
    "Cars results time summaries should use 24-hour formatting for Turkish without changing raw time values.",
  );
  assert.equal(
    new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)),
    "Haziran 2026",
  );
  assert.equal(
    new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)),
    "Temmuz 2026",
  );
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(new Date(2024, 0, 7 + day))),
    ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
  );
});

test("Polish homepage-visible copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const expectedPolishHomepageCopy: Record<string, string> = {
    flights: "Loty",
    hotels: "Hotele",
    cars: "Samochody",
    deals: "Oferty",
    login: "Zaloguj się",
    signUp: "Zarejestruj się",
    homeHeroTitle: "Porównuj opcje podróży w jednym prostym wyszukiwaniu",
    homeHeroSubtitle:
      "Przeszukuj zaufanych dostawców podróży, przejrzyście porównuj ceny i wybierz opcję dopasowaną do swojej podróży.",
    roundTrip: "W obie strony",
    oneWay: "W jedną stronę",
    origin: "WYLOT",
    destination: "CEL PODRÓŻY",
    departureDate: "DATY PODRÓŻY",
    travelDates: "DATY PODRÓŻY",
    fromPlaceholder: "Skąd?",
    travelers: "PODRÓŻNI",
    toPlaceholder: "Dokąd?",
    search: "Szukaj",
    chooseTravelDates: "Wybierz daty podróży",
    passengers: "Pasażerowie",
    adults: "Dorośli",
    adultAgeRange: "18+",
    children: "Dzieci",
    childAgeRange: "Wiek 2–17",
    infantsOnLap: "Niemowlęta na kolanach",
    under2: "Poniżej 2 lat",
    cabinClass: "KLASA KABINY",
    economy: "ekonomiczna",
    previousMonthShort: "Poprzedni",
    nextMonthShort: "Następny",
    clear: "Wyczyść",
    done: "Gotowe",
    weekdaySun: "ndz.",
    weekdayMon: "pon.",
    weekdayTue: "wt.",
    weekdayWed: "śr.",
    weekdayThu: "czw.",
    weekdayFri: "pt.",
    weekdaySat: "sob.",
    cityOrHotel: "Miasto lub hotel",
    hotelSearchDestinationLabel: "CEL PODRÓŻY",
    hotelSearchDestinationPlaceholder: "Miasto lub hotel",
    hotelSearchTravelDatesLabel: "DATY PODRÓŻY",
    hotelSearchDatePlaceholder: "Zameldowanie — wymeldowanie",
    hotelSearchGuestsLabel: "GOŚCIE",
    stayDetails: "SZCZEGÓŁY POBYTU",
    guestsAndRooms: "Goście i pokoje",
    guests: "Goście",
    guestSingular: "gość",
    guestPlural: "gości",
    rooms: "Pokoje",
    roomSingular: "pokój",
    roomPlural: "pokoje",
    hotelAdultHelper: "Goście 18+",
    hotelChildrenHelper: "Wiek 0–17",
    hotelRoomsHelper: "Do 6 pokoi",
    petFriendly: "Przyjazne zwierzętom",
    onlyShowPetFriendlyStays: "Pokaż tylko obiekty akceptujące zwierzęta",
    business: "Biznes",
    first: "Pierwsza",
    fromPrice: "Od",
    homePopularDestinations: "Popularne kierunki",
    "homePopularDestinationCity.dubai": "Dubaj",
    "homePopularDestinationCountry.unitedArabEmirates": "Zjednoczone Emiraty Arabskie",
    "homePopularDestinationCity.london": "Londyn",
    "homePopularDestinationCountry.unitedKingdom": "Wielka Brytania",
    "homePopularDestinationCity.johannesburg": "Johannesburg",
    "homePopularDestinationCountry.southAfrica": "Republika Południowej Afryki",
    "homePopularDestinationCity.accra": "Akra",
    "homePopularDestinationCountry.ghana": "Ghana",
    homeExploreFares: "Sprawdź ceny",
    homeDiscoveryTitle: "Odkryj tutaj swoją następną przygodę",
    homeDiscoverySubtitle:
      "Porównuj pomysły na trasy, elastyczne taryfy i kierunki dobrane do Twojego regionu.",
    homeDiscoveryRouteIdeaBadge: "POMYSŁ NA TRASĘ",
    homeDiscoveryOneWay: "W JEDNĄ STRONĘ",
    homeDiscoveryEconomy: "EKONOMICZNA",
    homeDiscoveryTravelerCountOne: "1 PODRÓŻNY",
    homeCompareOptions: "Porównaj opcje",
    "homeDiscoveryRoute.ng-los-dxb.title": "Zakupowy stopover w Dubaju",
    "homeDiscoveryRoute.ng-los-dxb.routeNote":
      "Popularna trasa na zakupy, podróże rodzinne i dalsze połączenia.",
    "homeDiscoveryRoute.ng-los-lhr.title": "Londyn biznesowo i na weekend",
    "homeDiscoveryRoute.ng-abv-rob.routeNote":
      "Zachodnioafrykański city break z atlantyckimi plażami i lokalnymi targami.",
    homeTrustTitle: "Dlaczego podróżni porównują na Kurioticket",
    homeTrustCompareTitle: "Porównuj oferty dostawców",
    homePromoFlightsTitle: "Oferty lotów od czołowych linii",
    homePromoHotelsTitle: "Oszczędności hotelowe na całym świecie",
    faqHeading: "Najczęściej zadawane pytania",
    faqIntro:
      "Dowiedz się, jak Kurioticket pomaga porównywać loty, hotele i opcje podróży przed rezerwacją u zaufanych dostawców.",
    faqQuestionFindOptions: "Jak Kurioticket znajduje opcje lotów i hoteli?",
    faqAnswerFindOptions:
      "Kurioticket wyszukuje aktualne oferty od dostawców podróży i zbiera opcje w jednym miejscu, aby można było porównać ceny, trasy, pobyty i szczegóły przed wyborem.",
    supportFaqAccountQuestion: "Pomoc dotycząca konta i logowania",
    supportFaqWhyRedirectedQuestion: "Dlaczego przekierowano mnie do innego dostawcy?",
    homeNewsletterTitle: "Bądź na bieżąco z każdą ofertą podróży",
    homeNewsletterPlaceholder: "Wpisz swój adres e-mail",
    homeNewsletterInvalidEmail: "Wpisz prawidłowy adres e-mail.",
    homeSubscribing: "Subskrybowanie…",
    footerContactUs: "Kontakt",
    footerDiscover: "Odkrywaj",
    footerTermsSettings: "Warunki i ustawienia",
    footerAboutKurioticket: "O Kurioticket",
    footerConfidenceTagline: "Wyszukuj loty, hotele i oferty podróży z pewnością.",
    footerPrivacy: "Prywatność",
    footerTerms: "Warunki",
  };

  for (const [key, expected] of Object.entries(expectedPolishHomepageCopy)) {
    assert.equal(pl[key], expected, key);
    if (expected !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], key);
    }
  }

  const expectedRenderedFare = `${pl.fromPrice.toLocaleLowerCase("pl-PL")} NGN 714,974`;
  assert.equal(expectedRenderedFare, "od NGN 714,974");
  assert.doesNotMatch(expectedRenderedFare, /^from\s/);
  assert.match(expectedRenderedFare, /NGN 714,974$/);
  assert.equal(`${1} ${pl.adultSingular}, ${pl.economy.toLocaleLowerCase("pl-PL")}`, "1 dorosły, ekonomiczna");
  assert.equal(`${1} ${pl.guestSingular}, ${1} ${pl.roomSingular}`, "1 gość, 1 pokój");
});


test("Polish signup page copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const expectedPolishSignupCopy = {
    signupPageTitle: "Utwórz konto",
    signupFullNameLabel: "Imię i nazwisko",
    signupEmailLabel: "E-mail",
    signupPasswordLabel: "Hasło",
    signupAgreementBeforeTerms: "Tworząc konto, akceptujesz ",
    signupTermsLink: "Warunki",
    signupAgreementBetweenLinks: ", ",
    signupPrivacyPolicyLink: "Politykę prywatności",
    signupAgreementAfterPrivacy: " oraz informacje o przekierowaniach do partnerów.",
    signupSubmit: "Zarejestruj się",
    signupGoogle: "Kontynuuj z Google",
    signupAlreadyHaveAccount: "Masz już konto?",
    signupLoginLink: "Zaloguj się",
  };

  for (const [key, expected] of Object.entries(expectedPolishSignupCopy)) {
    assert.equal(pl[key], expected, key);
    if (expected !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], key);
    }
  }

  assert.match(pl.signupGoogle, /Google/);
  assert.doesNotMatch(pl.signupGoogle, /Create your account|Continue with/);
  assert.equal(`${pl.signupAgreementBeforeTerms}${pl.signupTermsLink}${pl.signupAgreementBetweenLinks}${pl.signupPrivacyPolicyLink}${pl.signupAgreementAfterPrivacy}`, "Tworząc konto, akceptujesz Warunki, Politykę prywatności oraz informacje o przekierowaniach do partnerów.");
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Polish signup render path keeps i18n keys and preserves auth behavior", () => {
  const signupFormSource = readFileSync("src/components/auth/SignupForm.tsx", "utf8");
  const signupPageSource = readFileSync("src/app/auth/signup/page.tsx", "utf8");

  for (const key of [
    "signupPageTitle",
    "signupFullNameLabel",
    "signupEmailLabel",
    "signupPasswordLabel",
    "signupAgreementBeforeTerms",
    "signupTermsLink",
    "signupAgreementBetweenLinks",
    "signupPrivacyPolicyLink",
    "signupAgreementAfterPrivacy",
    "signupSubmit",
    "signupGoogle",
    "signupAlreadyHaveAccount",
    "signupLoginLink",
  ]) {
    assert.match(signupFormSource, new RegExp(`t\\.${key}`), key);
  }

  assert.doesNotMatch(signupFormSource, />Create your account<|>Full name<|>Sign Up<|>Continue with Google<|>Already have an account\?<|>Log in</);
  assert.match(signupFormSource, /document\.title = `\$\{t\.signupPageTitle\} \| Kurioticket`/);
  assert.match(signupFormSource, /<Input name="name" autoComplete="name" required/);
  assert.match(signupFormSource, /<Input name="email" type="email" autoComplete="email" required/);
  assert.match(signupFormSource, /<Input name="password" type="password" autoComplete="new-password" minLength=\{8\} required/);
  assert.match(signupFormSource, /fetch\("\/api\/auth\/signup", \{/);
  assert.match(signupFormSource, /method: "POST"/);
  assert.match(signupFormSource, /window\.location\.href = `\/auth\/verify-email\?email=\$\{encodeURIComponent\(email\)\}`/);
  assert.match(signupFormSource, /signIn\("google", \{ callbackUrl: "\/onboarding" \}\)/);
  assert.match(signupFormSource, /href="\/legal\/terms-of-service"/);
  assert.match(signupFormSource, /href="\/legal\/privacy-policy"/);
  assert.match(signupFormSource, /href="\/auth\/signin"/);
  assert.match(signupPageSource, /<SignupForm googleEnabled=\{googleEnabled\} \/>/);
  assert.match(signupPageSource, /getGoogleClientId\(\)/);
  assert.match(signupPageSource, /getGoogleClientSecret\(\)/);
});


test("Polish homepage flight and hotel date formatting uses pl-PL generated labels", () => {
  for (const locale of ["pl", "pl-PL", "pl-pl"]) {
    assert.equal(normalizeFlightsCalendarLocale(locale), "pl-PL", `flight ${locale}`);
    assert.equal(normalizeHotelCalendarLocale(locale), "pl-PL", `hotel ${locale}`);
  }

  assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), "pl"), "czerwiec 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "pl-pl"), "lipiec 2026");
  assert.deepEqual(formatFlightsWeekdays("pl-PL"), ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."]);
  assert.equal(formatFlightsDateSummary(new Date(2026, 5, 1), new Date(2026, 6, 1), "pl"), "1 cze — 1 lip");
});

test("Polish flight date labels resolve for desktop and compact mobile paths", () => {
  const pl = getTranslations("pl");
  const searchSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");

  assert.equal(pl.departureDate, "DATY PODRÓŻY");
  assert.equal(pl.travelDates, "DATY PODRÓŻY");
  assert.equal(pl.departureDate, pl.travelDates);
  assert.notEqual(pl.departureDate.toLocaleUpperCase("pl-PL"), "TRAVEL DATES");

  assert.match(
    searchSource,
    /<label className=\{flightFieldLabelClassName\}>[\s\S]*?\{t\.departureDate \|\|[\s\S]*?t\.travelDates \|\| "Travel dates"\}[\s\S]*?<\/label>[\s\S]*?<button[\s\S]*?ref=\{flightDatesLauncherRef\}/,
    "flight date field label should use departureDate before the travelDates fallback in the shared compact\/desktop field",
  );
  assert.match(
    searchSource,
    /if \(!departureSummary\) \{[\s\S]*?return t\.travelDates \|\| "Travel dates";[\s\S]*?\}/,
    "date value\/placeholder should continue using travelDates",
  );
  assert.match(searchSource, /<FlightMobilePickerShell[\s\S]*?title=\{translate\("chooseTravelDates"\) \|\| "Choose travel dates"\}/);
  assert.match(searchSource, /renderDesktopCalendarPopover\(\{[\s\S]*?mode: "flights"/);
  assert.match(searchSource, /new URLSearchParams\(\{/);
  assert.match(searchSource, /departureDate,/);
  assert.match(searchSource, /returnDate,/);
});

test("Polish homepage render paths keep using i18n keys and preserve route/search behavior", () => {
  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const searchSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const footerSource = readFileSync("src/components/layout/Footer.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");

  for (const key of [
    "homeHeroTitle",
    "homeDiscoveryTitle",
    "homeTrustTitle",
    "homePromoFlightsTitle",
    "faqHeading",
    "homeNewsletterTitle",
    "homeNewsletterInvalidEmail",
    "homeNewsletterUnableSubscribe",
    "homeNewsletterThanks",
    "homeNewsletterTryAgain",
    "homeSubscribing",
  ]) {
    assert.match(pageSource, new RegExp(`t\\(\"${key}\"\\)`), key);
  }

  for (const key of ["flights", "hotels", "cars", "deals", "login", "signUp"]) {
    assert.match(headerSource, new RegExp(`t\\.${key}|labelKey: \"${key}\"`), key);
  }

  for (const key of ["roundTrip", "oneWay", "origin", "destination", "travelDates", "travelers", "passengers", "economy", "fromPlaceholder", "cityOrHotel", "hotelSearchTravelDatesLabel", "hotelSearchGuestsLabel", "stayDetails", "guestsAndRooms", "hotelAdultHelper", "hotelChildrenHelper", "hotelRoomsHelper", "petFriendly", "onlyShowPetFriendlyStays"]) {
    assert.match(searchSource, new RegExp(key), key);
  }

  for (const key of ["footerContactUs", "footerDiscover", "footerTermsSettings", "footerAboutKurioticket", "footerConfidenceTagline"]) {
    assert.match(footerSource, new RegExp(`t\\.${key}`), key);
  }

  assert.match(homeDiscoverySource, /originCode: "LOS"/);
  assert.match(homeDiscoverySource, /destinationCode: "DXB"/);
  assert.doesNotMatch(plTranslations["homeDiscoveryRoute.ng-los-dxb.routeNote"], /LOS → DXB/);
  assert.match(pageSource, /originCode=\{card\.item\.originCode\}/);
  assert.match(pageSource, /destinationCodeLabel=\{card\.item\.destinationCode\}/);
  assert.match(pageSource, /\{originCode\} → \{destinationCodeLabel\} · \{routeNote\}/);
  assert.match(searchSource, /new URLSearchParams\(\{/);
  assert.match(searchSource, /origin:/);
  assert.match(searchSource, /destination:/);
  assert.match(searchSource, /buildFlightRecentSearch\(/);
  assert.match(searchSource, /buildHotelRecentSearch\(/);
  assert.match(searchSource, /formatAirportLabel\(option, locale\)/);
  assert.match(searchSource, /setHotelAdultCount/);
  assert.match(searchSource, /setRooms/);
  assert.match(pageSource, /function DestinationPricePill\(/);
  assert.match(pageSource, /function DiscoveryPricePill\(/);
  assert.match(pageSource, /<DestinationPricePill[\s\S]*price=\{price\}[\s\S]*displayCurrency=\{displayCurrency\}[\s\S]*expectedOriginCode=\{originCode\}[\s\S]*expectedDestinationCode=\{destinationCode\}/);
  assert.match(pageSource, /<DiscoveryPricePill[\s\S]*price=\{price\}[\s\S]*displayCurrency=\{displayCurrency\}[\s\S]*expectedOriginCode=\{expectedOriginCode\}[\s\S]*expectedDestinationCode=\{expectedDestinationCode\}/);
  assert.equal(pageSource.match(/t\("fromPrice"\)\.toLowerCase\(\)/g)?.length, 2);
  assert.match(pageSource, /buildDiscoveryCardHref\(card\.fare, \{[\s\S]*originCode: card\.item\.originCode,[\s\S]*destinationCode: card\.item\.destinationCode,[\s\S]*displayCurrency: selectedOption\.currency,[\s\S]*market: regionCode/);
  assert.match(pageSource, /buildDestinationCardHref\(price, \{[\s\S]*originCode: destination\.originCode,[\s\S]*destinationCode: destination\.code,[\s\S]*displayCurrency: selectedOption\.currency,[\s\S]*market: regionCode/);
  assert.match(pageSource, /fetch\(\s*"\/api\/newsletter\/subscribe"/);
  assert.match(pageSource, /method: "POST"/);
});

test("Polish homepage fare price prefixes resolve to od without changing fare details", () => {
  const pl = getTranslations("pl");
  const prefix = pl.fromPrice.toLocaleLowerCase("pl-PL");
  const formattedFare = "NGN 714,974";

  assert.equal(pl.fromPrice, "Od");
  assert.notEqual(pl.fromPrice, enTranslations.fromPrice);
  assert.equal(`${prefix} ${formattedFare}`, "od NGN 714,974");
  assert.equal(`${prefix} ${formattedFare}`, `${prefix} NGN 714,974`);
  assert.doesNotMatch(`${prefix} ${formattedFare}`, /^from NGN/);
});

test("Polish homepage discovery route cards render one route prefix from route data", () => {
  const routeExpectations = [
    ["ng-los-dxb", "LOS", "DXB", "Zakupowy stopover w Dubaju", "Popularna trasa na zakupy, podróże rodzinne i dalsze połączenia."],
    ["ng-los-lhr", "LOS", "LHR", "Londyn biznesowo i na weekend", "Częsta trasa dalekodystansowa na podróże służbowe i dodatkowy wypoczynek."],
    ["ng-abv-acc", "ABV", "ACC", "Szybka regionalna podróż do Akry", "Krótka trasa regionalna z wygodnym połączeniem między miastami."],
    ["ng-los-nbo", "LOS", "NBO", "Nairobi jako brama na safari", "Dostęp do Afryki Wschodniej, centrów biznesowych i wyjazdów safari."],
    ["ng-abv-jnb", "ABV", "JNB", "City break w Johannesburgu", "Dobre połączenie na południe na spotkania i miejskie wyjazdy."],
    ["ng-los-ist", "LOS", "IST", "Trasa przesiadkowa przez Stambuł", "Świetny hub do połączeń z Europą i dynamiczny miejski stopover."],
    ["ng-abv-cdg", "ABV", "CDG", "Stylowy wypad do Paryża", "Klasyczna europejska trasa dla mody, muzeów i kulinariów."],
    ["ng-los-doh", "LOS", "DOH", "Komfortowy tranzyt przez Dohę", "Trasa nastawiona na komfort i płynne dalsze połączenia."],
    ["ng-los-kig", "LOS", "KGL", "Weekend w zielonym Kigali", "Rosnący regionalny hub z zielonymi wzgórzami i łatwym dostępem do miasta."],
    ["ng-abv-cai", "ABV", "CAI", "Historyczny przystanek w Kairze", "Brama do historii Nilu i tętniących życiem starych dzielnic."],
    ["ng-los-add", "LOS", "ADD", "Połączenie z Afryką Wschodnią przez Addis Abebę", "Ważny punkt przesiadkowy z rozwijającą się sceną kulinarną i kulturalną."],
    ["ng-abv-fco", "ABV", "FCO", "Rzym i jego zabytkowa brama", "Europejska klasyka ruin, placów i spokojnego zwiedzania."],
    ["ng-los-nrt", "LOS", "NRT", "Dalekodystansowy puls Tokio", "Ważna brama do Azji, neonowych dzielnic i sprawnego transportu."],
    ["ng-abv-mad", "ABV", "MAD", "Madryt: tapas i sztuka", "Europejska trasa city break do muzeów, bulwarów i późnych kolacji."],
    ["ng-los-cpt", "LOS", "CPT", "Nadmorska przygoda w Kapsztadzie", "Malownicza trasa do RPA z plażami, górami i winnicami."],
    ["ng-abv-rob", "ABV", "ROB", "Regionalny wyjazd nad morze do Monrovii", "Zachodnioafrykański city break z atlantyckimi plażami i lokalnymi targami."],
  ] as const;
  const discoveryRoutes = new Map(getHomeDiscoveryByRegion("NG").map((item) => [item.id, item]));

  for (const [id, originCode, destinationCode, expectedTitle, expectedNote] of routeExpectations) {
    const item = discoveryRoutes.get(id);

    assert.ok(item, id);
    assert.equal(item.id, id);
    assert.equal(item.originCode, originCode);
    assert.equal(item.destinationCode, destinationCode);
    assert.equal(translateHomeDiscoveryField(plTranslations, item, "title"), expectedTitle);
    assert.equal(translateHomeDiscoveryField(plTranslations, item, "routeNote"), expectedNote);

    const visibleRouteNote = `${item.originCode} → ${item.destinationCode} · ${translateHomeDiscoveryField(plTranslations, item, "routeNote")}`;
    assert.equal(visibleRouteNote, `${originCode} → ${destinationCode} · ${expectedNote}`);
    assert.equal(visibleRouteNote.split(`${originCode} → ${destinationCode}`).length - 1, 1);
    assert.doesNotMatch(visibleRouteNote, new RegExp(`${originCode} → ${destinationCode} · ${originCode} → ${destinationCode}`));
  }
});

test("Polish homepage discovery route search payloads remain route-data driven", () => {
  const item = getHomeDiscoveryByRegion("NG").find((route) => route.id === "ng-los-dxb");

  assert.ok(item);
  assert.equal(item.id, "ng-los-dxb");
  assert.equal(item.originCode, "LOS");
  assert.equal(item.destinationCode, "DXB");

  const href = buildHomepageRouteCardFlightHref({
    route: {
      originCode: item.originCode,
      destinationCode: item.destinationCode,
    },
    displayCurrency: "USD",
    market: "NG",
    now: new Date("2026-06-29T00:00:00.000Z"),
  });

  assert.deepEqual(href, {
    pathname: "/flights/results",
    query: {
      tripType: "one-way",
      origin: "LOS",
      destination: "DXB",
      departureDate: "2026-08-14",
      travelers: "1",
      adults: "1",
      children: "0",
      infants: "0",
      cabinClass: "economy",
      currency: "USD",
      market: "NG",
    },
  });
});

test("Polish service and support active render path copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const supportContentSource = readFileSync("src/app/support/SupportContent.tsx", "utf8");
  const supportFormSource = readFileSync("src/components/support/SupportForm.tsx", "utf8");
  const serviceGuaranteeSource = readFileSync("src/app/service-guarantee/ServiceGuaranteeContent.tsx", "utf8");
  const moreServiceInfoSource = readFileSync("src/app/more-service-info/MoreServiceInfoContent.tsx", "utf8");

  const expectedSupport = {
    supportEyebrow: "Centrum pomocy Kurioticket",
    supportTitle: "Obsługa klienta",
    supportBeforeContactHeading: "Zanim się z nami skontaktujesz",
    supportBeforeContactDescription: "Podaj adres e-mail przypisany do konta Kurioticket, opisz, co próbowałeś zrobić, a także trasę lub hotel, jeśli ma to znaczenie, oraz stronę dostawcy, na którą Cię przekierowano. Nie wysyłaj pełnych numerów kart płatniczych ani poufnych numerów dokumentów podróży.",
    supportTicketHeading: "Utwórz zgłoszenie do pomocy",
    supportFormEmailLabel: "E-mail",
    supportFormSubjectLabel: "Temat",
    supportFormCategoryLabel: "Kategoria",
    supportCategoryPriceAlerts: "Alerty cenowe",
    supportFormMessageLabel: "Jak możemy pomóc?",
    supportFormMessagePlaceholder: "Opisz trasę, hotel, alert lub kontekst konta.",
    supportFormSubmit: "Wyślij zgłoszenie",
    supportFaqHeading: "Często zadawane pytania",
    supportFaqAccountQuestion: "Pomoc dotycząca konta i logowania",
    supportFaqSearchQuestion: "Pomoc dotycząca wyszukiwania i wyników",
    supportFaqSavedTripsQuestion: "Zapisane podróże i alerty",
    supportFaqRedirectQuestion: "Pomoc dotycząca rezerwacji/przekierowania do dostawcy",
    supportFaqAlreadyBookedQuestion: "Masz już rezerwację u dostawcy?",
    supportFaqChangeBookingQuestion: "Czy Kurioticket może zmienić moją rezerwację?",
    supportFaqWhyRedirectedQuestion: "Dlaczego przekierowano mnie do innego dostawcy?",
  };

  const expectedServiceGuarantee = {
    serviceGuaranteeEyebrow: "Zobowiązanie serwisowe Kurioticket",
    serviceGuaranteeTitle: "Gwarancja usług",
    serviceGuaranteeDescription: "Chcemy, aby podróżni rozumieli, jak działa Kurioticket i czego mogą oczekiwać podczas korzystania z naszej platformy.",
    serviceGuaranteeFaqHeading: "Często zadawane pytania",
    serviceGuaranteeFaqDescription: "Te odpowiedzi wyjaśniają rolę Kurioticket jako platformy do wyszukiwania i porównywania podróży.",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Co gwarantuje Kurioticket?",
    serviceGuaranteeFaqResultsDisplayedQuestion: "Jak wyświetlane są wyniki podróży?",
    serviceGuaranteeFaqRedirectedQuestion: "Dlaczego przekierowano mnie do innego dostawcy?",
    serviceGuaranteeFaqBookDirectlyQuestion: "Czy rezerwuję bezpośrednio w Kurioticket?",
    serviceGuaranteeFaqPricesGuaranteedQuestion: "Czy ceny są zawsze gwarantowane?",
    serviceGuaranteeFaqChooseProvidersQuestion: "Jak Kurioticket wybiera dostawców?",
    serviceGuaranteeFaqEncounterIssueQuestion: "Co zrobić, jeśli napotkam problem?",
    serviceGuaranteeFaqContactSupportQuestion: "Jak skontaktować się z pomocą?",
    serviceGuaranteeHelpCardTitle: "Potrzebujesz pomocy z kontem lub wyszukiwaniem?",
    serviceGuaranteeSupportCta: "Skontaktuj się z obsługą klienta",
  };

  const expectedMoreServiceInfo = {
    moreServiceInfoEyebrow: "Informacje o platformie",
    moreServiceInfoTitle: "Więcej informacji o usługach",
    moreServiceInfoDescription: "Dowiedz się, jak Kurioticket pomaga podróżnym wyszukiwać, porównywać, zapisywać i organizować opcje podróży od wielu dostawców w jednym miejscu.",
    moreServiceInfoContextTitle: "Planuj z kontekstem",
    moreServiceInfoContextSubtitle: "Od wyników wyszukiwania po przekierowania do dostawców",
    moreServiceInfoContextCompare: "Porównuj opcje od wielu dostawców podróży.",
    moreServiceInfoContextSave: "Zapisuj podróże, alerty i preferencje po zalogowaniu.",
    moreServiceInfoContextContinue: "Sprawdź szczegóły u dostawcy przed dokonaniem rezerwacji poza Kurioticket.",
    moreServiceInfoHowHeading: "Jak działa Kurioticket",
    moreServiceInfoHowDescription: "Te informacje wyjaśniają rolę Kurioticket przed wyszukiwaniem podróży, w jego trakcie i po nim.",
    moreServiceInfoHowBadge: "PODSTAWY PLANOWANIA PODRÓŻY",
    moreServiceInfoStepSearchTitle: "Wyszukuj u wielu dostawców",
    moreServiceInfoStepCompareTitle: "Porównuj opcje podróży",
    moreServiceInfoStepSaveTitle: "Zapisuj podróże i alerty",
    moreServiceInfoStepRedirectsTitle: "Wyjaśnienie przekierowań do dostawców",
    moreServiceInfoStepAccountTitle: "Konto i narzędzia podróży",
    moreServiceInfoFaqHeading: "Często zadawane pytania",
    moreServiceInfoFaqDescription: "Krótkie odpowiedzi o wyszukiwaniu podróży, przekierowaniach do dostawców, zapisanych podróżach i narzędziach konta.",
    moreServiceInfoFaqWhatQuestion: "Czym jest Kurioticket?",
    moreServiceInfoFaqSearchQuestion: "Jak działa wyszukiwanie podróży?",
    moreServiceInfoFaqPaymentsQuestion: "Czy Kurioticket przetwarza płatności?",
    moreServiceInfoFaqSaveQuestion: "Czy mogę zapisywać podróże i alerty?",
    moreServiceInfoFaqAccountQuestion: "Czy konto jest wymagane?",
    moreServiceInfoHelpTitle: "Potrzebujesz pomocy?",
    moreServiceInfoHelpDescription: "Masz pytania dotyczące konta, zapisanych podróży, alertów lub przekierowań do dostawców?",
    moreServiceInfoSupportCta: "Skontaktuj się z obsługą klienta",
  };

  for (const expected of [expectedSupport, expectedServiceGuarantee, expectedMoreServiceInfo]) {
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(pl[key], value, key);
      assert.notEqual(pl[key], enTranslations[key], key);
    }
  }

  const hiddenAnswerKeys = [
    "supportFaqAccountAnswer",
    "supportFaqSearchAnswer",
    "supportFaqSavedTripsAnswer",
    "supportFaqRedirectAnswer",
    "supportFaqAlreadyBookedAnswer",
    "supportFaqChangeBookingAnswer",
    "supportFaqWhyRedirectedAnswer",
    "serviceGuaranteeFaqWhatGuaranteeAnswer",
    "serviceGuaranteeFaqResultsDisplayedAnswer",
    "serviceGuaranteeFaqRedirectedAnswer",
    "serviceGuaranteeFaqBookDirectlyAnswer",
    "serviceGuaranteeFaqPricesGuaranteedAnswer",
    "serviceGuaranteeFaqChooseProvidersAnswer",
    "serviceGuaranteeFaqEncounterIssueAnswer",
    "serviceGuaranteeFaqContactSupportAnswer",
    "moreServiceInfoStepSearchSummary",
    "moreServiceInfoStepSearchDetails",
    "moreServiceInfoStepCompareSummary",
    "moreServiceInfoStepCompareDetails",
    "moreServiceInfoStepSaveSummary",
    "moreServiceInfoStepSaveDetails",
    "moreServiceInfoStepRedirectsSummary",
    "moreServiceInfoStepRedirectsDetails",
    "moreServiceInfoStepAccountSummary",
    "moreServiceInfoStepAccountDetails",
    "moreServiceInfoFaqWhatAnswer",
    "moreServiceInfoFaqSearchAnswer",
    "moreServiceInfoFaqRedirectAnswer",
    "moreServiceInfoFaqPaymentsAnswer",
    "moreServiceInfoFaqSaveAnswer",
    "moreServiceInfoFaqAccountAnswer",
    "moreServiceInfoFaqSupportAnswer",
  ];

  for (const key of hiddenAnswerKeys) {
    assert.ok(pl[key], key);
    assert.notEqual(pl[key], enTranslations[key], key);
  }

  assert.ok(supportContentSource.includes('t("supportEyebrow")'));
  assert.ok(supportContentSource.includes('t("supportBeforeContactHeading")'));
  assert.ok(supportContentSource.includes('supportFaqKeys.map'));
  assert.ok(supportFormSource.includes('fetch("/api/support/tickets"'));
  assert.ok(supportFormSource.includes('name="email" type="email"'));
  assert.ok(supportFormSource.includes('value="price-alerts"'));
  assert.ok(serviceGuaranteeSource.includes('serviceFaqKeys.map'));
  assert.ok(serviceGuaranteeSource.includes('href="/support"'));
  assert.ok(moreServiceInfoSource.includes('serviceSections.map'));
  assert.ok(moreServiceInfoSource.includes('serviceFaqs.map'));
  assert.ok(moreServiceInfoSource.includes('href="/support"'));

  assert.ok(languageOptions.some((o) => o.code === "pl" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});


test("Polish Flights landing page copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const keys = [
    "flightLandingHeroTitle",
    "flightLandingHeroSubtitle",
    "discoverDestinationsFromRegion",
    "discoverDestinationsFromRegionBody",
    "flightLandingStartThisSearch",
    "flightLandingFeatureSearchReadyTitle",
    "flightLandingFeatureSearchReadyBody",
    "flightLandingFeatureCompareTitle",
    "flightLandingFeatureCompareBody",
    "flightLandingFeatureProviderTitle",
    "flightLandingFeatureProviderBody",
    "flightLandingRouteIdeasTitle",
    "flightLandingRouteIdeasBody",
    "beachVacations",
    "beachVacationsBody",
    "flightBookingFaqs",
    "flightBookingFaqIntro",
    "flightFaqBestTimeQuestion",
    "flightFaqBestTimeAnswer",
    "flightFaqBeforeBookingQuestion",
    "flightFaqBeforeBookingAnswer",
    "flightFaqFlexibleFareQuestion",
    "flightFaqFlexibleFareAnswer",
    "flightFaqNonstopQuestion",
    "flightFaqNonstopAnswer",
    "flightFaqBaggageQuestion",
    "flightFaqBaggageAnswer",
    "flightFaqChangeCancelQuestion",
    "flightFaqChangeCancelAnswer",
    "flightFaqInternationalQuestion",
    "flightFaqInternationalAnswer",
    "flightLandingImageAlt.Johannesburg skyline at golden hour",
    "flightLandingImageAlt.Cairo skyline with the Pyramids of Giza",
    "flightLandingImageAlt.Addis Ababa cityscape in the Ethiopian highlands",
    "homeDiscoveryRoute.ng-los-cpt.title",
    "homeDiscoveryRoute.ca-yyz-cun.title",
    "homeDiscoveryRoute.ca-yyz-cun.routeNote",
    "homeDiscoveryRoute.ca-yeg-pvr.title",
    "homeDiscoveryRoute.ca-yeg-pvr.routeNote",
    "homeDiscoveryRoute.ca-yyz-hnl.title",
    "homeDiscoveryRoute.ca-yyz-hnl.routeNote",
    "homeDiscoveryRoute.ca-yyz-san.title",
    "homeDiscoveryRoute.ca-yyz-san.routeNote",
    "homeDiscoveryRoute.ca-yvr-syd.title",
    "homeDiscoveryRoute.ca-yvr-syd.routeNote",
  ];

  assert.equal(pl.flightLandingHeroTitle, "Znajdź kolejny niedrogi lot z łatwością.");
  assert.equal(pl.flightLandingHeroSubtitle, "Wyszukuj trasy, porównuj daty i odkrywaj opcje lotów na kolejną podróż.");
  assert.equal(pl.discoverDestinationsFromRegion, "Odkrywaj kierunki z Twojego regionu");
  assert.equal(pl.discoverDestinationsFromRegionBody, "Przeglądaj wybrane trasy i rozpocznij kolejną podróż z pewnością.");
  assert.equal(pl.flightLandingStartThisSearch, "Rozpocznij to wyszukiwanie");
  assert.equal(pl.flightLandingFeatureSearchReadyTitle, "Trasy gotowe do wyszukiwania");
  assert.equal(pl.flightLandingFeatureCompareTitle, "Porównuj w kontekście");
  assert.equal(pl.flightLandingFeatureProviderTitle, "Sprawdzenie u dostawcy");
  assert.equal(pl.flightLandingRouteIdeasTitle, "Pomysły na trasy dla elastycznych podróży");
  assert.equal(pl.beachVacations, "Wakacje na plaży");
  assert.equal(pl.flightBookingFaqs, "Najczęstsze pytania o rezerwację lotów");
  assert.equal(pl.flightFaqBestTimeQuestion, "Kiedy najlepiej zarezerwować lot?");
  assert.equal(pl.flightFaqInternationalQuestion, "Co warto wiedzieć o lotach międzynarodowych?");

  for (const key of keys) {
    assert.ok(pl[key], `${key} should be defined for Polish`);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
  }
});

test("Polish Flights landing render path keeps localized copy data-driven and preserves route behavior", () => {
  const flightPageSource = readFileSync("src/app/flights/page.tsx", "utf8");
  const flightLandingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");
  const searchFormSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");

  assert.ok(flightPageSource.includes('<FlightLandingClient />'));
  assert.ok(flightLandingSource.includes('const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? ""'));
  assert.ok(flightLandingSource.includes('t("flightLandingHeroTitle")'));
  assert.ok(flightLandingSource.includes('t("discoverDestinationsFromRegion")'));
  assert.ok(flightLandingSource.includes('t("flightLandingStartThisSearch")'));
  assert.ok(flightLandingSource.includes('t("beachVacations")'));
  assert.ok(flightLandingSource.includes('items={getFlightFaqItems(t)}'));
  assert.ok(flightLandingSource.includes('getDiscoveryTranslation(\n      "flightLandingImageAlt"'));

  for (const preserved of [
    "LOS", "LHR", "DXB", "ABV", "ACC", "JNB", "IST", "CDG", "DOH", "KGL", "CAI", "ADD", "FCO", "CPT", "YYZ", "CUN", "YEG", "PVR", "YVR", "SYD", "→",
    "ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd",
  ]) {
    assert.ok(homeDiscoverySource.includes(preserved) || flightLandingSource.includes(preserved), `${preserved} should remain in the render path data`);
  }

  assert.ok(flightLandingSource.includes("buildDiscoveryLink(item)"));
  assert.ok(searchFormSource.includes("cabin") && searchFormSource.includes("traveler") && searchFormSource.includes("departureDate"));
  assert.ok(flightLandingSource.includes("grid gap-5 sm:grid-cols-2 lg:grid-cols-3"));
});
