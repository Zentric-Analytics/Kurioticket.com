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
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";
import { supportedRegions } from "@/lib/region/supportedRegions";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";

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

test("selected available Spanish, French, German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, Turkish, and Arabic locales persist and update document language", () => {
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

  setLanguageInStorage("ar");
  assert.equal(getLanguageFromStorage(), "ar");
  assert.equal(documentMock.documentElement.lang, "ar");
  assert.equal(documentMock.documentElement.dir, "rtl");

  setLanguageInStorage("ar-AE");
  assert.equal(getLanguageFromStorage(), "ar");
  assert.equal(documentMock.documentElement.lang, "ar");
  assert.equal(documentMock.documentElement.dir, "rtl");
});

test("remaining preparing locales are not persisted as selected", () => {
  const store = new Map<string, string>();
  const windowMock: WindowLike = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    dispatchEvent: () => true,
  };
  Object.defineProperty(globalThis, "window", { value: windowMock, configurable: true });

  setLanguageInStorage("pl-PL");
  assert.equal(getLanguageFromStorage(), "en-us");
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

test("German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, and Turkish shorthand locales normalize to available options", () => {
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
});

test("available locale options keep Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, Turkish, and Arabic available and other preparing locales unavailable", () => {
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
  assert.ok(availableLocaleOptions.filter((option) => option.code !== "ar" && option.status === "available").every((option) => option.direction === "ltr"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "ar"));
});

test("Dutch, Portuguese, Japanese, Korean, Hindi, and Turkish dictionaries resolve through getTranslations", () => {
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
