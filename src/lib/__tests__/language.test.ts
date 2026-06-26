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
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";
import { supportedRegions } from "@/lib/region/supportedRegions";

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

test("selected available Spanish, French, German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, and Arabic locales persist and update document language", () => {
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

  setLanguageInStorage("tr-TR");
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

test("German, Italian, Dutch, Portuguese, Chinese, Japanese, Korean, and Hindi shorthand locales normalize to available options", () => {
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
});

test("available locale options keep Dutch, Portuguese, Chinese, Japanese, Korean, Hindi, and Arabic available and other preparing locales unavailable", () => {
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
  assert.ok(availableLocaleOptions.filter((option) => option.code !== "ar" && option.status === "available").every((option) => option.direction === "ltr"));
  assert.ok(availableLocaleOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
  assert.ok(languageOptions.filter((option) => option.status !== "available").every((option) => option.code !== "ar"));
});

test("Dutch, Portuguese, Japanese, Korean, and Hindi dictionaries resolve through getTranslations", () => {
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
  ];

  for (const [key, expected] of auditedHindiHomepageKeys) {
    assert.equal(hi[key], expected, key);
    assert.notEqual(hi[key], enTranslations[key], key);
  }
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

test("Hindi flights landing static render path resolves screenshot-visible copy", () => {
  assert.equal(hiTranslations.flightLandingHeroTitle, "अपनी अगली किफायती उड़ान आसानी से खोजें।");
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
  assert.equal(hiTranslations["flightLandingCity.Johannesburg"], "जोहान्सबर्ग");
  assert.equal(hiTranslations["flightLandingImageAlt.Johannesburg skyline at golden hour"], "गोल्डन आवर में जोहान्सबर्ग स्काईलाइन");
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
    homeNewsletterConsent:
      "सदस्यता लेकर, आप Kurioticket अपडेट प्राप्त करने के लिए सहमत होते हैं। आप कभी भी सदस्यता समाप्त कर सकते हैं।",
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
  assert.equal(typeof hiTranslations.airportsAndCities, "string");
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
});
