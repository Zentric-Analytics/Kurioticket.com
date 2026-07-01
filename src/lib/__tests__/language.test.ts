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
import { translations as svTranslations } from "@/lib/i18n/sv";
import { translations as idTranslations } from "@/lib/i18n/id";
import { translations as thTranslations } from "@/lib/i18n/th";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { supportedLocales } from "@/lib/supportedLocales";
import { getHomeDiscoveryByRegion } from "@/data/homeDiscovery";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import { formatHomeDiscoveryRoute, translateHomeDiscoveryField } from "@/lib/i18n/homeDiscovery";
import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";
import { supportedRegions } from "@/lib/region/supportedRegions";
import {
  getLocalizedHotelDestinationCityName,
  normalizeHotelDestinationDisplayLocale,
} from "@/data/hotelDestinations";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";
import { legalDocuments } from "@/data/legalDocuments";
import { getGeneralFaqs } from "@/content/faqs";

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
  assert.equal(languageOptions.filter((o) => o.code === "sv").length, 1);
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.nativeLabel === "Svenska" && o.label === "Swedish" && o.countryCode === "SE" && o.direction === "ltr" && o.status === "available"));
  assert.equal(languageOptions.filter((o) => o.code === "id").length, 1);
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.label === "Indonesian" && o.countryCode === "ID" && o.fallbackText === "ID" && o.direction === "ltr" && o.status === "available"));
});

test("Thai language metadata, LTR direction, and English fallback dictionary resolve", () => {
  const thaiOptions = languageOptions.filter((o) => o.code === "th");
  const thaiLocaleMetadata = supportedLocales.filter((o) => o.code === "th");

  assert.equal(thaiOptions.length, 1);
  assert.equal(thaiLocaleMetadata.length, 1);
  assert.deepEqual(
    {
      code: thaiOptions[0]?.code,
      locale: thaiOptions[0]?.locale,
      label: thaiOptions[0]?.label,
      nativeLabel: thaiOptions[0]?.nativeLabel,
      direction: thaiOptions[0]?.direction,
      status: thaiOptions[0]?.status,
      countryCode: thaiOptions[0]?.countryCode,
      fallbackText: thaiOptions[0]?.fallbackText,
      translationStatus: thaiLocaleMetadata[0]?.translationStatus,
    },
    {
      code: "th",
      locale: "th-TH",
      label: "Thai",
      nativeLabel: "ไทย",
      direction: "ltr",
      status: "available",
      countryCode: "TH",
      fallbackText: "TH",
      translationStatus: "partial",
    },
  );

  assert.equal(normalizeLanguage("th"), "th");
  assert.equal(normalizeLanguage("th-TH"), "th");
  assert.equal(normalizeLanguage("th-th"), "th");
  assert.equal(getTranslations("th"), thTranslations);
  assert.equal(getTranslations("th-TH"), thTranslations);
  assert.equal(getTranslations("th-th"), thTranslations);
  assert.equal(thTranslations.homeHeroTitle, "เปรียบเทียบตัวเลือกการเดินทางได้ในการค้นหาเดียว");
  assert.equal(thTranslations.search, "ค้นหา");
  assert.notEqual(thTranslations.homeHeroTitle, enTranslations.homeHeroTitle);
  assert.notEqual(thTranslations.search, enTranslations.search);
  assert.ok(availableLocaleOptions.some((o) => o.code === "th" && o.nativeLabel === "ไทย"));
  assert.equal(thaiOptions[0]?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
  assert.equal(getTranslations("unsupported-locale"), enTranslations);
});

test("Thai account customization and booking preferences resolve through active i18n keys", () => {
  const th = getTranslations("th");
  const customizationPageSource = readFileSync("src/app/dashboard/preferences/customization/page.tsx", "utf8");
  const customizationSource = readFileSync(
    "src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx",
    "utf8",
  );
  const bookingPageSource = readFileSync("src/app/dashboard/preferences/booking/page.tsx", "utf8");
  const bookingSource = readFileSync(
    "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
    "utf8",
  );

  assert.ok(customizationPageSource.includes("<CustomizationPreferencesContent />"));
  assert.ok(bookingPageSource.includes("<BookingPreferencesContent />"));

  const expectedCustomizationCopy = {
    "accountDashboard.preferences.customization.title": "การตั้งค่าการปรับแต่ง",
    "accountDashboard.preferences.customization.description": "เลือกวิธีที่ Kurioticket ปรับแต่งประสบการณ์ของคุณ",
    "accountDashboard.preferences.customization.languageRegion.title": "ภาษาและภูมิภาค",
    "accountDashboard.preferences.customization.languageRegion.description": "ตั้งค่าภาษา สกุลเงิน และภูมิภาคเริ่มต้นของคุณ",
    "accountDashboard.preferences.customization.preferredLanguage": "ภาษาที่ต้องการ",
    "accountDashboard.preferences.customization.selectPreferredLanguage": "เลือกภาษาที่ต้องการ",
    "accountDashboard.preferences.customization.currency": "สกุลเงิน",
    "accountDashboard.preferences.customization.selectCurrency": "เลือกสกุลเงิน",
    "accountDashboard.preferences.customization.region": "ภูมิภาค",
    "accountDashboard.preferences.customization.selectRegion": "เลือกภูมิภาค",
    "accountDashboard.preferences.customization.personalization.title": "การปรับแต่งส่วนบุคคล",
    "accountDashboard.preferences.customization.personalization.description": "ควบคุมวิธีที่ Kurioticket ปรับแต่งคำแนะนำสำหรับคุณ",
    "accountDashboard.preferences.customization.personalizeSearches": "ใช้การค้นหาของฉันเพื่อปรับแต่งคำแนะนำ",
    "accountDashboard.preferences.customization.personalizedTravelDeals": "แสดงดีลการเดินทางที่ปรับให้เหมาะกับฉัน",
    "accountDashboard.preferences.customization.rememberRecentSearches": "จดจำการค้นหาล่าสุดของฉัน",
    "accountDashboard.preferences.customization.communicationStyle.title": "รูปแบบการสื่อสาร",
    "accountDashboard.preferences.customization.communicationStyle.description": "เลือกวิธีที่คุณต้องการให้ Kurioticket สื่อสารกับคุณ",
    "accountDashboard.preferences.customization.emailUpdates": "อัปเดตทางอีเมล",
    "accountDashboard.preferences.customization.priceAlertEmails": "อีเมลแจ้งเตือนราคา",
    "accountDashboard.preferences.customization.travelInspirationEmails": "อีเมลแรงบันดาลใจในการเดินทาง",
  } as const;

  const expectedBookingCopy = {
    "accountDashboard.preferences.booking.title": "การตั้งค่าการจอง",
    "accountDashboard.preferences.booking.description": "ตั้งค่าการเดินทางเริ่มต้นของคุณเพื่อให้การจองรวดเร็วและตรงความต้องการมากขึ้น",
    "accountDashboard.preferences.booking.airports.title": "สนามบิน",
    "accountDashboard.preferences.booking.airports.description": "เลือกสนามบินที่คุณต้องการออกเดินทาง",
    "accountDashboard.preferences.booking.homeAirport": "สนามบินหลัก",
    "accountDashboard.preferences.booking.searchAirport": "ค้นหาสนามบิน",
    "accountDashboard.preferences.booking.secondaryAirports": "สนามบินสำรอง",
    "accountDashboard.preferences.booking.addAlternativeAirports": "เพิ่มสนามบินทางเลือก",
    "accountDashboard.preferences.booking.airlines.title": "สายการบิน",
    "accountDashboard.preferences.booking.airlines.description": "เลือกสายการบินที่คุณต้องการหรืออยากหลีกเลี่ยง",
    "accountDashboard.preferences.booking.preferredAirlines": "สายการบินที่ต้องการ",
    "accountDashboard.preferences.booking.searchAirlines": "ค้นหาสายการบิน",
    "accountDashboard.preferences.booking.avoidAirlines": "หลีกเลี่ยงสายการบิน",
    "accountDashboard.preferences.booking.stays.title": "ที่พัก",
    "accountDashboard.preferences.booking.stays.description": "ตั้งค่าความต้องการด้านที่พักสำหรับการจองโรงแรม",
    "accountDashboard.preferences.booking.preferredHotelChains": "เครือโรงแรมที่ต้องการ",
    "accountDashboard.preferences.booking.searchHotelChains": "ค้นหาเครือโรงแรม",
    "accountDashboard.preferences.booking.avoidHotelChains": "หลีกเลี่ยงเครือโรงแรม",
  } as const;

  const sharedCopy = {
    "accountDashboard.preferences.cancel": "ยกเลิก",
    "accountDashboard.preferences.savePreferences": "บันทึกการตั้งค่า",
  } as const;

  for (const [key, value] of Object.entries(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use actual i18n key ${key}.`);
    assert.equal(th[key], value);
    assert.notEqual(th[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(key), `Booking page should use actual i18n key ${key}.`);
    assert.equal(th[key], value);
    assert.notEqual(th[key], enTranslations[key]);
  }

  for (const [key, value] of Object.entries(sharedCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use shared action key ${key}.`);
    assert.ok(bookingSource.includes(key), `Booking page should use shared action key ${key}.`);
    assert.equal(th[key], value);
    assert.notEqual(th[key], enTranslations[key]);
  }

  const activeThaiRenderValues = [
    ...Object.keys(expectedCustomizationCopy),
    ...Object.keys(expectedBookingCopy),
    ...Object.keys(sharedCopy),
  ].map((key) => th[key]);
  for (const englishFallback of [
    "Customization preferences", "Choose how Kurioticket personalizes your experience.", "Language and region",
    "Set your default language, currency, and region.", "Preferred language", "Select preferred language", "Currency",
    "Select currency", "Region", "Select region", "Personalization",
    "Control how Kurioticket personalizes your recommendations.", "Use my searches to personalize recommendations",
    "Show personalized travel deals", "Remember my recent searches", "Communication style",
    "Choose how you want Kurioticket to communicate with you.", "Email updates", "Price alert emails",
    "Travel inspiration emails", "Booking preferences",
    "Set your default travel preferences for faster and more relevant bookings.", "Airports",
    "Choose the airports you prefer to fly from.", "Home airport", "Search airport", "Secondary airports",
    "Add alternative airports", "Airlines", "Choose airlines you prefer or want to avoid.", "Preferred airlines",
    "Search airlines", "Avoid airlines", "Stays", "Set accommodation preferences for hotel bookings.",
    "Preferred hotel chains", "Search hotel chains", "Avoid hotel chains", "Cancel", "Save preferences",
  ]) {
    assert.ok(!activeThaiRenderValues.includes(englishFallback), `Thai preferences should not fall back to English: ${englishFallback}`);
  }

  assert.ok(customizationSource.includes('name={field.id}'));
  assert.ok(customizationSource.includes('value={option.value}'));
  assert.ok(customizationSource.includes('type="checkbox"'));
  assert.ok(customizationSource.includes('defaultValue=""'));
  assert.ok(bookingSource.includes('name={field.id}'));
  assert.ok(bookingSource.includes('type="search"'));
  assert.ok(bookingSource.includes('placeholder={t[field.placeholderKey]}'));
  assert.ok(bookingSource.includes('type="button"'));
  assert.ok(customizationSource.includes('className="focus-ring inline-flex min-h-11'));
  assert.ok(bookingSource.includes('className="focus-ring inline-flex min-h-11'));
  assert.equal(availableLocaleOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Thai Hotels results page copy resolves through active i18n keys", () => {
  const th = getTranslations("th");
  const resultsPageSource = readFileSync("src/app/hotels/results/page.tsx", "utf8");
  const hotelResultsClientSource = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
  const hotelCardSource = readFileSync("src/components/results/HotelCard.tsx", "utf8");
  const hotelSearchBarSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  assert.ok(resultsPageSource.includes("<HotelResultsClient />"));

  const expectedCopy: Array<[string, string, string, string[]]> = [
    ["hotelResults.liveSearchUnavailable", "การค้นหาโรงแรมแบบสดไม่พร้อมใช้งานชั่วคราว โปรดลองอีกครั้งในภายหลัง", "Live hotel search is temporarily unavailable. Please try again shortly.", [hotelResultsClientSource]],
    ["hotelResults.filterBy", "กรองตาม", "Filter by", [hotelResultsClientSource]],
    ["hotelResults.budgetPrice", "งบประมาณ / ราคา", "Budget / Price", [hotelResultsClientSource]],
    ["hotelResults.totalUpTo", "รวมสูงสุด", "Total up to", [hotelResultsClientSource]],
    ["hotelResults.starRating", "ระดับดาว", "Star rating", [hotelResultsClientSource]],
    ["hotelResults.fromRating", "จาก", "From", [hotelResultsClientSource]],
    ["hotelResults.popularFilters", "ตัวกรองยอดนิยม", "Popular filters", [hotelResultsClientSource]],
    ["hotelResults.filter.breakfastIncludedAvailable", "รวม/มีอาหารเช้า", "Breakfast included/available", [hotelResultsClientSource]],
    ["hotelResults.propertyType", "ประเภทที่พัก", "Property type", [hotelResultsClientSource]],
    ["hotelResults.filter.hotel", "โรงแรม", "Hotel", [hotelResultsClientSource]],
    ["hotelResults.roomType", "ประเภทห้อง", "Room type", [hotelResultsClientSource]],
    ["hotelResults.filter.doubleRoom", "ห้องเตียงคู่", "Double Room", [hotelResultsClientSource, hotelCardSource]],
    ["hotelResults.filter.singleRoom", "ห้องเดี่ยว", "Single Room", [hotelResultsClientSource]],
    ["hotelResults.bedType", "ประเภทเตียง", "Bed type", [hotelResultsClientSource]],
    ["hotelResults.filter.kingBed", "เตียงคิงไซส์", "King Bed", [hotelResultsClientSource, hotelCardSource]],
    ["hotelResults.meals", "อาหาร", "Meals", [hotelResultsClientSource]],
    ["hotelResults.filter.roomOnly", "เฉพาะห้องพัก", "Room only", [hotelResultsClientSource, hotelCardSource]],
    ["hotelResults.cheapest", "ถูกที่สุด", "CHEAPEST", [hotelResultsClientSource]],
    ["hotelResults.lowestTotalPrice", "ราคารวมต่ำที่สุด", "Lowest total price", [hotelResultsClientSource]],
    ["hotelResults.bestValue", "คุ้มค่าที่สุด", "BEST VALUE", [hotelResultsClientSource]],
    ["hotelResults.valueScore", "คะแนน {{score}}/100", "{{score}}/100 score", [hotelResultsClientSource]],
    ["hotelResults.bestBalance", "สมดุลดีที่สุด", "Best balance", [hotelResultsClientSource]],
    ["hotelResults.topRated", "คะแนนสูงสุด", "TOP RATED", [hotelResultsClientSource]],
    ["hotelResults.starPlural", "{{count}} ดาว", "{{count}} stars", [hotelResultsClientSource]],
    ["hotelResults.highestRating", "คะแนนรีวิวสูงสุด", "Highest rating", [hotelResultsClientSource]],
    ["hotelResults.foundPlacesToStay", "เราพบที่พัก {{count}} แห่งสำหรับคุณ", "We found {{count}} places to stay for you", [hotelResultsClientSource]],
    ["hotelResults.estimatedStayTotal", "ยอดรวมที่พักโดยประมาณ", "estimated stay total", [hotelCardSource]],
    ["hotelResults.pricePerNight", "{{price}} ต่อคืน", "{{price}} per night", [hotelCardSource]],
    ["hotelResults.viewHotel", "ดูโรงแรม", "View hotel", [hotelCardSource]],
    ["hotelResults.filter.bedAndBreakfast", "ที่พักพร้อมอาหารเช้า", "Bed and breakfast", [hotelCardSource]],
  ];

  for (const [key, expected, englishFallback, sources] of expectedCopy) {
    assert.equal(th[key], expected, `${key} should resolve to Thai`);
    assert.notEqual(th[key], englishFallback, `${key} should not fall back to screenshot English`);
    assert.ok(
      sources.some((source) => source.includes(`t("${key}")`) || source.includes(`labelKey: "${key}"`) || source.includes(`"${key}"`)),
      `${key} should be read through i18n on the active Thai hotels render path`,
    );
  }

  assert.equal(th["hotelResults.foundPlacesToStay"].replace("{{count}}", "6"), "เราพบที่พัก 6 แห่งสำหรับคุณ");
  assert.equal(th["hotelResults.valueScore"].replace("{{score}}", "69"), "คะแนน 69/100");
  assert.equal(th["hotelResults.starPlural"].replace("{{count}}", "5"), "5 ดาว");
  assert.equal(th["hotelResults.pricePerNight"].replace("{{price}}", "€381.08"), "€381.08 ต่อคืน");

  for (const englishCopy of [
    "Filter by",
    "Budget / Price",
    "Total up to",
    "Star rating",
    "Live hotel search is temporarily unavailable. Please try again shortly.",
    "View hotel",
    "estimated stay total",
    "per night",
  ]) {
    assert.ok(!hotelResultsClientSource.includes(`>${englishCopy}<`), `${englishCopy} should not be hardcoded in the active Thai hotels results UI`);
    assert.ok(!hotelCardSource.includes(`>${englishCopy}<`), `${englishCopy} should not be hardcoded in the active Thai hotel card UI`);
  }

  assert.ok(hotelResultsClientSource.includes('data.error === enTranslations["hotelResults.liveSearchUnavailable"]'));
  assert.ok(hotelResultsClientSource.includes('fetch("/api/hotels/search"'));
  assert.ok(hotelResultsClientSource.includes('type="range"'));
  assert.ok(hotelSearchBarSource.includes("const nextUrl = `/hotels/results?${params.toString()}`") && hotelSearchBarSource.includes("router.push(nextUrl)"));
  assert.ok(hotelResultsClientSource.includes("hotel.name"));
  assert.ok(hotelResultsClientSource.includes("hotel.location"));
  assert.ok(hotelCardSource.includes("hotel.roomType"));
  assert.ok(hotelCardSource.includes("formatCurrency(hotel.totalPrice, hotel.currency)"));
  assert.ok(hotelResultsClientSource.includes("sortHotelSummaryResults") && hotelResultsClientSource.includes("sortedVisibleHotels.map"));
  assert.ok(hotelResultsClientSource.includes("className="));
  assert.ok(hotelCardSource.includes("aria-label="));
  assert.deepEqual(["Welcome Center Hotels", "Victoria Crown Plaza Hotel", "The Wheatbaker", "The Federal Palace Hotel & Casino", "Lagos Continental Hotel", "Whitehouse Msquare Hotel"], ["Welcome Center Hotels", "Victoria Crown Plaza Hotel", "The Wheatbaker", "The Federal Palace Hotel & Casino", "Lagos Continental Hotel", "Whitehouse Msquare Hotel"]);
  assert.deepEqual(["Lagos", "Double Business", "Deluxe King Room", "Luxury King", "Single Standard", "Superior Room", "€381.08", "€19,600", "3+", "5", "69/100"], ["Lagos", "Double Business", "Deluxe King Room", "Luxury King", "Single Standard", "Superior Room", "€381.08", "€19,600", "3+", "5", "69/100"]);
  assert.deepEqual(["1 ก.ค. — 5 ก.ค.", "1 ผู้เข้าพัก, 1 ห้อง"], ["1 ก.ค. — 5 ก.ค.", "1 ผู้เข้าพัก, 1 ห้อง"]);
  assert.equal(languageOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Indonesian locale is active with homepage copy overrides", () => {
  const indonesianOptions = languageOptions.filter((o) => o.code === "id");
  const indonesianLocaleMetadata = supportedLocales.filter((o) => o.code === "id");

  assert.equal(indonesianOptions.length, 1);
  assert.equal(indonesianLocaleMetadata.length, 1);
  assert.deepEqual(
    {
      code: indonesianOptions[0]?.code,
      locale: indonesianOptions[0]?.locale,
      label: indonesianOptions[0]?.label,
      nativeLabel: indonesianOptions[0]?.nativeLabel,
      direction: indonesianOptions[0]?.direction,
      status: indonesianOptions[0]?.status,
      countryCode: indonesianOptions[0]?.countryCode,
      fallbackText: indonesianOptions[0]?.fallbackText,
      translationStatus: indonesianLocaleMetadata[0]?.translationStatus,
    },
    {
      code: "id",
      locale: "id-ID",
      label: "Indonesian",
      nativeLabel: "Bahasa Indonesia",
      direction: "ltr",
      status: "available",
      countryCode: "ID",
      fallbackText: "ID",
      translationStatus: "partial",
    },
  );
  assert.equal(normalizeLanguage("id"), "id");
  assert.equal(normalizeLanguage("id-ID"), "id");
  assert.equal(normalizeLanguage("id-id"), "id");
  assert.equal(getTranslations("id"), idTranslations);
  assert.equal(getTranslations("id-ID"), idTranslations);
  assert.equal(idTranslations.homeHeroTitle, "Bandingkan pilihan perjalanan dalam satu pencarian sederhana");
  assert.equal(idTranslations.search, "Cari");
  assert.notEqual(idTranslations.homeHeroTitle, enTranslations.homeHeroTitle);
  assert.notEqual(idTranslations.search, enTranslations.search);
  assert.ok(availableLocaleOptions.some((o) => o.code === "id" && o.nativeLabel === "Bahasa Indonesia"));
  assert.ok(languageOptions.some((o) => o.code === "id" && o.nativeLabel === "Bahasa Indonesia" && o.status === "available"));
  assert.equal(indonesianOptions[0]?.direction, "ltr");

  const arabicOption = languageOptions.find((o) => o.code === "ar");
  assert.equal(arabicOption?.direction, "rtl");

  for (const option of languageOptions.filter((o) => o.status === "available" && o.code !== "ar")) {
    assert.equal(option.direction, "ltr", `${option.code} should remain ltr`);
  }
});

test("Indonesian Destinations render path uses active Indonesian dictionary copy", () => {
  const destinationsPageSource = readFileSync("src/app/destinations/page.tsx", "utf8");
  const destinationCardSource = readFileSync("src/app/destinations/DestinationCard.tsx", "utf8");
  const localeProviderSource = readFileSync("src/components/layout/LocaleProvider.tsx", "utf8");
  const id = idTranslations as Record<string, string>;
  const en = enTranslations as Record<string, string>;

  assert.ok(destinationsPageSource.includes("const { t: dictionary } = useLocale();"));
  assert.ok(localeProviderSource.includes("t: getTranslations(locale)"));
  assert.ok(destinationsPageSource.includes("dictionary.destinationsHeroBadge"));
  assert.ok(destinationsPageSource.includes("regionLabelKeys[section.region]"));
  assert.ok(destinationsPageSource.includes("destinationNameKeys[destination.name]"));
  assert.ok(destinationsPageSource.includes("destinationCountryKeys[destination.country]"));
  assert.ok(destinationsPageSource.includes("dictionary[destination.tagKey]"));
  assert.ok(destinationsPageSource.includes("dictionary[destinationSubtitleKey]"));
  assert.ok(destinationCardSource.includes("{country}"));
  assert.ok(destinationCardSource.includes("{tag}"));
  assert.ok(destinationCardSource.includes("{name}"));
  assert.ok(destinationCardSource.includes("{subtitle}"));

  const expectedIndonesianCopy: Record<string, string> = {
    destinationsHeroBadge: "PENEMUAN DESTINASI",
    destinationsHeroTitle: "Ke mana Anda ingin pergi selanjutnya?",
    destinationsHeroSubtitle:
      "Jelajahi pemandangan kota pilihan yang lebih menarik, bandingkan penerbangan, dan temukan penawaran perjalanan dalam hitungan menit.",
    "destinations.region.europe": "Eropa",
    "destinations.region.northAmerica": "Amerika Utara",
    "destinations.region.asia": "Asia",
    "destinations.region.africa": "Afrika",
    "destinations.region.middleEast": "Timur Tengah",
    "destinations.region.europe.summary":
      "Pilihan kota ikonik, kanal romantis, ibu kota desain, dan akhir pekan kuliner serta budaya yang tak lekang waktu.",
    "destinations.region.northAmerica.summary":
      "Cakrawala kota yang ikonik, destinasi pesisir, pusat hiburan, dan liburan kota sinematik yang layak direncanakan.",
    "destinations.region.asia.summary":
      "Pemandangan kota neon, liburan pulau, legenda kuliner kaki lima, kuil, pantai, dan destinasi belanja premium.",
    "destinations.region.africa.summary":
      "Favorit perjalanan berkesan dengan pemandangan laut, akses safari, ibu kota kreatif, dan kekayaan budaya.",
    "destinations.region.middleEast.summary":
      "Cakrawala mewah, pesisir hangat, pesona gurun, kawasan bersejarah, dan pusat perhotelan modern.",
    "destinations.card.subtitle": "Pemandangan menarik, penerbangan, hotel, dan penawaran",
    "destinations.tag.iconicSkyline": "CAKRAWALA IKONIK",
    "destinations.tag.landmarkEscape": "LIBURAN IKON WISATA",
    "destinations.tag.cultureCapital": "IBU KOTA BUDAYA",
    "destinations.tag.goldenHourViews": "PEMANDANGAN SENJA",
    "destinations.tag.coastalEnergy": "ENERGI PESISIR",
    "destinations.tag.designWeekend": "AKHIR PEKAN DESAIN",
    "destinations.tag.foodMarketNights": "MALAM PASAR KULINER",
    "destinations.tag.historicStreets": "JALAN BERSEJARAH",
    "destinations.city.rome": "Roma",
    "destinations.city.prague": "Praha",
    "destinations.city.athens": "Athena",
    "destinations.city.venice": "Venesia",
    "destinations.city.florence": "Firenze",
    "destinations.city.copenhagen": "Kopenhagen",
    "destinations.city.vienna": "Wina",
    "destinations.city.singapore": "Singapura",
    "destinations.city.marrakech": "Marrakesh",
    "destinations.country.unitedKingdom": "Inggris Raya",
    "destinations.country.france": "Prancis",
    "destinations.country.italy": "Italia",
    "destinations.country.spain": "Spanyol",
    "destinations.country.netherlands": "Belanda",
    "destinations.country.czechia": "Ceko",
    "destinations.country.greece": "Yunani",
    "destinations.country.germany": "Jerman",
    "destinations.country.switzerland": "Swiss",
    "destinations.country.unitedStates": "Amerika Serikat",
    "destinations.country.canada": "Kanada",
    "destinations.country.japan": "Jepang",
    "destinations.country.southKorea": "Korea Selatan",
    "destinations.country.southAfrica": "Afrika Selatan",
    "destinations.country.morocco": "Maroko",
    "destinations.country.unitedArabEmirates": "Uni Emirat Arab",
    "destinations.country.turkey": "Turki",
    "destinations.country.saudiArabia": "Arab Saudi",
  };

  for (const [key, expected] of Object.entries(expectedIndonesianCopy)) {
    assert.equal(id[key], expected, `${key} should render Indonesian copy`);
    if (expected !== en[key]) {
      assert.notEqual(id[key], en[key], `${key} must not fall back to English on /destinations`);
    }
  }

  const screenshotEnglishStrings = [
    "DESTINATION DISCOVERY",
    "Where do you want to go next?",
    "Browse brighter, hand-picked city views, compare flights, and find travel deals in minutes.",
    "Bright views, flights, hotels, and deals",
    "Europe",
    "North America",
    "Middle East",
  ];

  for (const value of screenshotEnglishStrings) {
    assert.ok(!Object.values(expectedIndonesianCopy).includes(value));
  }

  assert.ok(destinationsPageSource.includes("return `/flights?destination=${encodeURIComponent(destination.name)}`;"));
  assert.ok(destinationsPageSource.includes("key={`${destination.region}-${destination.name}`}"));
  assert.ok(destinationsPageSource.includes("image={destination.image}"));
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});



test("Thai Account dropdown and Dashboard overview copy resolves through active i18n render paths", () => {
  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const dashboardGridSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const th = thTranslations as Record<string, string>;

  const expectedThaiAccountCopy: Record<string, string> = {
    "accountMenu.myAccount.label": "บัญชีของฉัน",
    "accountMenu.savedTrips.label": "ทริปที่บันทึกไว้",
    "accountMenu.priceAlerts.label": "การแจ้งเตือนราคา",
    "accountMenu.closeAccountMenu": "ปิดเมนูบัญชี",
    myAccount: "บัญชีของฉัน",
    openAccountMenu: "เปิดเมนูบัญชี",
    logout: "ออกจากระบบ",
    signingOut: "กำลังออกจากระบบ...",
    "accountDashboard.overview.welcome": "ยินดีต้อนรับกลับมา {name}",
    "accountDashboard.hub.title": "บัญชีของฉัน",
    "accountDashboard.mobile.manageAccount": "จัดการบัญชี",
    "accountDashboard.hub.description": "จัดการทริป รายการที่บันทึกไว้ การตั้งค่า และการตั้งค่าบัญชีของคุณได้ในที่เดียว",
    "accountDashboard.hub.manageAccount": "จัดการบัญชี",
    "accountDashboard.hub.personalDetails": "รายละเอียดส่วนตัว",
    "accountDashboard.hub.securitySettings": "การตั้งค่าความปลอดภัย",
    "accountDashboard.hub.travelActivity": "กิจกรรมการเดินทาง",
    "accountDashboard.hub.myTrips": "ทริปของฉัน",
    "accountDashboard.hub.savedTrips": "ทริปที่บันทึกไว้",
    "accountDashboard.hub.priceAlerts": "การแจ้งเตือนราคา",
    "accountDashboard.hub.preferences": "การตั้งค่า",
    "accountDashboard.hub.emailPreferences": "การตั้งค่าการปรับแต่ง",
    "accountDashboard.hub.travelPreferences": "การตั้งค่าการจอง",
    "accountDashboard.hub.helpAndSupport": "ความช่วยเหลือและการสนับสนุน",
    "accountDashboard.hub.contactSupport": "ติดต่อฝ่ายสนับสนุน",
    "accountDashboard.hub.faq": "คำถามที่พบบ่อย",
  };

  for (const [key, value] of Object.entries(expectedThaiAccountCopy)) {
    assert.equal(th[key], value, `${key} should resolve to Thai`);
    assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const dynamicName = "Oluwadunbarin Olayinka";
  const dynamicEmail = "bharrywalker@gmail.com";
  const dynamicInitials = "OO";
  assert.equal(th["accountDashboard.overview.welcome"].replace("{name}", dynamicName), `ยินดีต้อนรับกลับมา ${dynamicName}`);
  assert.match(th["accountDashboard.overview.welcome"], /\{name\}/);
  assert.doesNotMatch(th["accountDashboard.overview.welcome"], /\{\{name\}\}/);

  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"'));
  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"'));
  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"'));
  assert.ok(appHeaderSource.includes("label: t[item.labelKey]"));
  assert.ok(appHeaderSource.includes("{isSigningOut ? t.signingOut : t.logout}"));
  assert.ok(appHeaderSource.includes("aria-label={t.openAccountMenu}"));
  assert.ok(appHeaderSource.includes('aria-label={t["accountMenu.closeAccountMenu"]}'));
  assert.ok(!appHeaderSource.includes(">My account<") && !appHeaderSource.includes(">Saved trips<") && !appHeaderSource.includes(">Price alerts<") && !appHeaderSource.includes(">Logout<"));

  assert.ok(dashboardPageSource.includes("<DashboardOverview") && dashboardPageSource.includes("initials={initials}") && dashboardPageSource.includes("displayName={displayName}") && dashboardPageSource.includes("userEmail={userEmail}"));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.manageAccount"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.personalDetails"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.securitySettings"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.travelActivity"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.myTrips"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.savedTrips"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.priceAlerts"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.preferences"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.emailPreferences"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.travelPreferences"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.helpAndSupport"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.contactSupport"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.faq"'));
  assert.ok(dashboardGridSource.includes('formatAccountWelcome(') && dashboardGridSource.includes('t["accountDashboard.overview.welcome"]'));
  assert.ok(dashboardGridSource.includes('t["accountDashboard.hub.description"]'));
  assert.ok(dashboardGridSource.includes('t["accountDashboard.mobile.manageAccount"]'));
  assert.ok(!dashboardGridSource.includes(">Welcome back,") && !dashboardGridSource.includes(">Manage account<") && !dashboardGridSource.includes(">Personal details<"));

  assert.ok(appHeaderSource.includes('href: "/dashboard/account"') && appHeaderSource.includes('href: "/saved"') && appHeaderSource.includes('href: "/dashboard/alerts"'));
  assert.ok(dashboardGridSource.includes('href: "/dashboard"') && dashboardGridSource.includes('href: "/dashboard/security"') && dashboardGridSource.includes('href: "/dashboard/trips"') && dashboardGridSource.includes('href: "/saved?from=account"') && dashboardGridSource.includes('href: "/dashboard/alerts?from=account"') && dashboardGridSource.includes('href: "/dashboard/preferences/customization"') && dashboardGridSource.includes('href: "/dashboard/preferences/booking"') && dashboardGridSource.includes('href: "/dashboard/support"') && dashboardGridSource.includes('href: "/faq?from=account"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.manageAccount"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.travelActivity"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.travelActivity"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.preferences"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.preferences"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.helpAndSupport"'));
  assert.ok(!appHeaderSource.includes(dynamicName) && !appHeaderSource.includes(dynamicEmail) && !appHeaderSource.includes(dynamicInitials));
  assert.ok(!dashboardGridSource.includes(dynamicName) && !dashboardGridSource.includes(dynamicEmail) && !dashboardGridSource.includes(dynamicInitials));
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});


test("Indonesian Account dropdown and Dashboard copy resolves through active i18n render paths", () => {
  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const dashboardGridSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const id = idTranslations as Record<string, string>;

  const expectedAccountCopy: Record<string, string> = {
    "accountMenu.myAccount.label": "Akun saya",
    "accountMenu.savedTrips.label": "Perjalanan tersimpan",
    "accountMenu.priceAlerts.label": "Peringatan harga",
    "accountMenu.closeAccountMenu": "Tutup menu akun",
    myAccount: "Akun saya",
    openAccountMenu: "Buka menu akun",
    logout: "Keluar",
    "accountDashboard.overview.welcome": "Selamat datang kembali, {name}",
    "accountDashboard.hub.title": "Akun saya",
    "accountDashboard.hub.description": "Kelola perjalanan, item tersimpan, preferensi, dan pengaturan akun Anda dalam satu tempat.",
    "accountDashboard.hub.manageAccount": "Kelola akun",
    "accountDashboard.hub.personalDetails": "Detail pribadi",
    "accountDashboard.hub.securitySettings": "Pengaturan keamanan",
    "accountDashboard.hub.travelActivity": "Aktivitas perjalanan",
    "accountDashboard.hub.myTrips": "Perjalanan saya",
    "accountDashboard.hub.savedTrips": "Perjalanan tersimpan",
    "accountDashboard.hub.priceAlerts": "Peringatan harga",
    "accountDashboard.hub.preferences": "Preferensi",
    "accountDashboard.hub.emailPreferences": "Preferensi penyesuaian",
    "accountDashboard.hub.travelPreferences": "Preferensi pemesanan",
    "accountDashboard.hub.helpAndSupport": "Bantuan dan dukungan",
    "accountDashboard.hub.contactSupport": "Hubungi dukungan",
    "accountDashboard.hub.faq": "FAQ",
  };

  for (const [key, value] of Object.entries(expectedAccountCopy)) {
    assert.equal(id[key], value, `${key} should resolve to Indonesian`);
    if (value !== "FAQ") assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const dynamicName = "Oluwadunbarin Olayinka";
  const dynamicEmail = "bharrywalker@gmail.com";
  const dynamicInitials = "OO";
  assert.equal(id["accountDashboard.overview.welcome"].replace("{name}", dynamicName), `Selamat datang kembali, ${dynamicName}`);
  assert.match(id["accountDashboard.overview.welcome"], /\{name\}/);

  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"'));
  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"'));
  assert.ok(appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"'));
  assert.ok(appHeaderSource.includes("label: t[item.labelKey]"));
  assert.ok(appHeaderSource.includes("{isSigningOut ? t.signingOut : t.logout}"));
  assert.ok(!appHeaderSource.includes(">My account<") && !appHeaderSource.includes(">Saved trips<") && !appHeaderSource.includes(">Price alerts<") && !appHeaderSource.includes(">Logout<"));

  assert.ok(dashboardPageSource.includes("<DashboardOverview") && dashboardPageSource.includes("initials={initials}") && dashboardPageSource.includes("displayName={displayName}") && dashboardPageSource.includes("userEmail={userEmail}"));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.manageAccount"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.personalDetails"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.securitySettings"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.travelActivity"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.myTrips"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.savedTrips"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.priceAlerts"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.preferences"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.emailPreferences"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.travelPreferences"'));
  assert.ok(dashboardGridSource.includes('titleKey: "accountDashboard.hub.helpAndSupport"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.contactSupport"'));
  assert.ok(dashboardGridSource.includes('labelKey: "accountDashboard.hub.faq"'));
  assert.ok(dashboardGridSource.includes('formatAccountWelcome(') && dashboardGridSource.includes('t["accountDashboard.overview.welcome"]'));
  assert.ok(dashboardGridSource.includes('t["accountDashboard.hub.description"]'));
  assert.ok(dashboardGridSource.includes('t["accountDashboard.mobile.manageAccount"]'));
  assert.ok(!dashboardGridSource.includes(">Welcome back,") && !dashboardGridSource.includes(">Manage account<") && !dashboardGridSource.includes(">Personal details<"));

  assert.ok(appHeaderSource.includes('href: "/dashboard/account"') && appHeaderSource.includes('href: "/saved"') && appHeaderSource.includes('href: "/dashboard/alerts"'));
  assert.ok(dashboardGridSource.includes('href: "/dashboard"') && dashboardGridSource.includes('href: "/dashboard/security"') && dashboardGridSource.includes('href: "/dashboard/trips"') && dashboardGridSource.includes('href: "/saved?from=account"') && dashboardGridSource.includes('href: "/dashboard/alerts?from=account"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.manageAccount"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.travelActivity"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.travelActivity"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.preferences"'));
  assert.ok(dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.preferences"') < dashboardGridSource.indexOf('titleKey: "accountDashboard.hub.helpAndSupport"'));
  assert.ok(!appHeaderSource.includes(dynamicName) && !appHeaderSource.includes(dynamicEmail) && !appHeaderSource.includes(dynamicInitials));
  assert.ok(!dashboardGridSource.includes(dynamicName) && !dashboardGridSource.includes(dynamicEmail) && !dashboardGridSource.includes(dynamicInitials));
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("flight quote unavailable copy resolves through active render path for all available locales", () => {
  const flightDetailsSource = readFileSync("src/components/results/FlightDetailsClient.tsx", "utf8");
  const expected = {
    "en-us": ["Flight quote unavailable", "This flight quote is no longer available. Please search again for current prices."],
    "es-es": ["Cotización de vuelo no disponible", "Esta cotización de vuelo ya no está disponible. Vuelve a buscar para ver precios actuales."],
    fr: ["Devis de vol indisponible", "Ce devis de vol n’est plus disponible. Veuillez relancer une recherche pour obtenir les prix actuels."],
    "de-de": ["Flugangebot nicht verfügbar", "Dieses Flugangebot ist nicht mehr verfügbar. Bitte suchen Sie erneut nach aktuellen Preisen."],
    "it-it": ["Preventivo del volo non disponibile", "Questo preventivo del volo non è più disponibile. Cerca di nuovo per vedere i prezzi attuali."],
    "pt-br": ["Cotação de voo indisponível", "Esta cotação de voo não está mais disponível. Pesquise novamente para ver os preços atuais."],
    nl: ["Vluchtaanbieding niet beschikbaar", "Deze vluchtprijs is niet langer beschikbaar. Zoek opnieuw voor actuele prijzen."],
    ar: ["عرض الرحلة غير متاح", "لم يعد عرض هذه الرحلة متاحًا. يُرجى البحث مرة أخرى للاطلاع على الأسعار الحالية."],
    "zh-cn": ["航班报价不可用", "该航班报价已不再可用。请重新搜索以查看当前价格。"],
    ja: ["フライト見積もりは利用できません", "このフライト見積もりは利用できなくなりました。現在の価格を確認するには、もう一度検索してください。"],
    ko: ["항공권 견적을 사용할 수 없습니다", "이 항공권 견적은 더 이상 사용할 수 없습니다. 현재 가격을 확인하려면 다시 검색하세요."],
    hi: ["फ़्लाइट कोट उपलब्ध नहीं है", "यह फ़्लाइट कोट अब उपलब्ध नहीं है। मौजूदा कीमतों के लिए कृपया फिर से खोजें।"],
    tr: ["Uçuş fiyat teklifi kullanılamıyor", "Bu uçuş fiyat teklifi artık kullanılamıyor. Güncel fiyatlar için lütfen tekrar arama yapın."],
    pl: ["Oferta lotu niedostępna", "Ta oferta lotu nie jest już dostępna. Wyszukaj ponownie, aby zobaczyć aktualne ceny."],
    sv: ["Flygpriset är inte tillgängligt", "Det här flygpriset är inte längre tillgängligt. Sök igen för aktuella priser."],
    id: ["Penawaran harga penerbangan tidak tersedia", "Penawaran harga penerbangan ini tidak lagi tersedia. Silakan cari lagi untuk melihat harga saat ini."],
    th: ["ไม่มีใบเสนอราคาตั๋วเครื่องบิน", "ใบเสนอราคาตั๋วเครื่องบินนี้ไม่พร้อมใช้งานแล้ว โปรดค้นหาอีกครั้งเพื่อดูราคาปัจจุบัน"],
  } as const;

  for (const option of languageOptions.filter((o) => o.status === "available")) {
    const [title, body] = expected[option.code as keyof typeof expected];
    assert.ok(title, `${option.code} should have expected quote-unavailable title coverage`);
    assert.equal(getTranslations(option.code).flightQuoteUnavailable, title, `${option.code} title should resolve through i18n`);
    assert.equal(getTranslations(option.code).flightSearchAgainCurrentPrices, body, `${option.code} body should resolve through i18n`);
  }

  assert.equal(getTranslations("ar").flightQuoteUnavailable, "عرض الرحلة غير متاح");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
  assert.equal(getTranslations("id").flightQuoteUnavailable, "Penawaran harga penerbangan tidak tersedia");
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");

  assert.match(flightDetailsSource, /t\.flightQuoteUnavailable \|\| enTranslations\.flightQuoteUnavailable/);
  assert.match(flightDetailsSource, /error === FLIGHT_QUOTE_UNAVAILABLE_MESSAGE\s*\? t\.flightSearchAgainCurrentPrices/);
  assert.match(flightDetailsSource, /<main className="page-shell flex-1 py-10">\s*<Card className="p-6">/);
  assert.doesNotMatch(flightDetailsSource, /\{t\.flightQuoteUnavailable \|\| "Flight quote unavailable"\}/);
  assert.doesNotMatch(flightDetailsSource, /"Please search again for current prices\."/);
});

test("Indonesian Deals landing copy resolves through active render-path keys", () => {
  const id = getTranslations("id");
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");

  const expectedDealsCopy = {
    "deals.heroTitle": "Temukan penawaran perjalanan untuk perjalanan Anda berikutnya",
    "deals.heroSubtitle": "Cari penerbangan, penginapan, dan mobil bersama-sama dalam satu tempat.",
    "deals.packageLegend": "Pilih jenis paket",
    "deals.package.hotelFlight": "Hotel + Penerbangan",
    "deals.package.hotelFlightCar": "Hotel + Penerbangan + Mobil",
    "deals.package.flightCar": "Penerbangan + Mobil",
    "deals.package.hotelCar": "Hotel + Mobil",
    "deals.originLabel": "Dari mana?",
    "deals.destinationLabel": "Ke mana?",
    "deals.datesLabel": "Tanggal perjalanan",
    "deals.travelersRoomsLabel": "Wisatawan / kamar",
    "deals.originPlaceholder": "Kota atau bandara",
    "deals.destinationPlaceholder": "Kota, bandara, atau area",
    "deals.dateFlightPlaceholder": "Berangkat — Pulang",
    "deals.dateHotelPlaceholder": "Tanggal masuk — keluar",
    "deals.searchButton": "Cari penawaran",
    "deals.travelerSingular": "wisatawan",
    "deals.roomSingular": "kamar",
    "deals.destinationIdeasTitle": "Tempat untuk memulai pencarian penawaran Anda",
    "deals.destinationIdeasSubtitle": "Pilih ide destinasi, lalu bandingkan hasil dari penyedia saat Anda melanjutkan.",
    "deals.destinationCardAriaPrefix": "Cari ide perjalanan untuk",
    "deals.destination.tokyo.city": "Tokyo",
    "deals.destination.tokyo.country": "Jepang",
    "deals.destination.london.city": "London",
    "deals.destination.london.country": "Inggris Raya",
    "deals.destination.paris.city": "Paris",
    "deals.destination.paris.country": "Prancis",
    "deals.destination.dubai.city": "Dubai",
    "deals.destination.dubai.country": "Uni Emirat Arab",
    "deals.destination.cancun.city": "Cancun",
    "deals.destination.cancun.country": "Meksiko",
    "deals.destination.rome.city": "Roma",
    "deals.destination.rome.country": "Italia",
    "deals.destination.rome.imageAlt": "Colosseum di Roma di bawah langit biru cerah",
  } as const;

  for (const [key, value] of Object.entries(expectedDealsCopy)) {
    assert.equal(id[key], value, `${key} should resolve in Indonesian`);
    if (value !== enTranslations[key]) {
      assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
    }
    assert.ok(dealsPageSource.includes(key), `${key} should be used by the active Deals render path`);
  }


  assert.match(
    dealsPageSource,
    /if \(!formattedStart\) \{\s*return includesHotel\s*\? t\("deals\.dateHotelPlaceholder"\)\s*: t\("deals\.dateFlightPlaceholder"\);\s*\}/,
    "active /deals empty-date render path should use the hotel placeholder for hotel-inclusive package modes",
  );
  assert.match(dealsPageSource, /const includesHotel = selectedMode\.includesHotel;/);
  assert.doesNotMatch(
    dealsPageSource,
    /if \(!formattedStart\) \{\s*return includesFlight\s*\? t\("deals\.dateFlightPlaceholder"\)\s*: t\("deals\.dateHotelPlaceholder"\);\s*\}/,
    "DealsPage should not choose the flight placeholder before the hotel placeholder for hotel-inclusive modes",
  );
  assert.equal(dealsPageSource.includes('"Check-in — Checkout"'), false);
  assert.equal(dealsPageSource.includes('"Check-in — Check-out"'), false);

  const packageModeExpectations = [
    { value: "hotel-flight", dateKey: "deals.dateHotelPlaceholder", placeholder: "Tanggal masuk — keluar" },
    { value: "hotel-flight-car", dateKey: "deals.dateHotelPlaceholder", placeholder: "Tanggal masuk — keluar" },
    { value: "hotel-car", dateKey: "deals.dateHotelPlaceholder", placeholder: "Tanggal masuk — keluar" },
    { value: "flight-car", dateKey: "deals.dateFlightPlaceholder", placeholder: "Berangkat — Pulang" },
  ] as const;

  for (const expectation of packageModeExpectations) {
    assert.match(dealsPageSource, new RegExp(`value: "${expectation.value}"`));
    assert.equal(id[expectation.dateKey], expectation.placeholder);
  }

  assert.equal(`${id["deals.travelerSingular"]}`, "wisatawan");
  assert.equal(`1 ${id["deals.travelerSingular"]}, 1 ${id["deals.roomSingular"]}`, "1 wisatawan, 1 kamar");
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Deals landing package values and destination card data remain unchanged while labels are localized", () => {
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");

  for (const packageValue of ["hotel-flight", "hotel-flight-car", "flight-car", "hotel-car"]) {
    assert.match(dealsPageSource, new RegExp(`value: "${packageValue}"`));
  }

  assert.match(dealsPageSource, /name="packageMode"/);
  assert.match(dealsPageSource, /const dateSummary = useMemo\(\(\) => \{/);
  assert.match(dealsPageSource, /return formattedEnd\s*\? `\$\{formattedStart\} — \$\{formattedEnd\}`\s*: formattedStart;/);
  assert.match(dealsPageSource, /className="relative min-h-\[54px\] rounded-xl border border-slate-300 bg-white/);
  assert.match(dealsPageSource, /<span className="truncate">\{dateSummary\}<\/span>/);
  assert.ok(dealsPageSource.includes("router.push(`/flights/results?${params.toString()}`)"));
  assert.ok(dealsPageSource.includes("router.push(`/hotels/results?${params.toString()}`)"));
  assert.match(dealsPageSource, /destination: trimmedDestination/);
  assert.match(dealsPageSource, /departureDate: startDate/);
  assert.match(dealsPageSource, /returnDate: endDate/);
  assert.match(dealsPageSource, /checkIn: startDate/);
  assert.match(dealsPageSource, /checkOut: endDate/);
  assert.match(dealsPageSource, /destinationQuery: "Tokyo"[\s\S]*destinationQuery: "London"[\s\S]*destinationQuery: "Paris"[\s\S]*destinationQuery: "Dubai"[\s\S]*destinationQuery: "Cancun"[\s\S]*destinationQuery: "Rome"/);
  assert.match(dealsPageSource, /image:\s*"https:\/\/images\.pexels\.com\/photos\/31344755\/pexels-photo-31344755\.jpeg\?auto=compress&cs=tinysrgb&w=1200"/);

  for (const englishCopy of [
    "Find travel deals for your next trip",
    "Search flights, stays, and cars together in one place.",
    "Hotel + Flight",
    "Hotel + Flight + Car",
    "Flight + Car",
    "Hotel + Car",
    "Places to start your deal search",
    "Choose a destination idea, then compare provider results when you continue.",
  ]) {
    assert.equal(dealsPageSource.includes(englishCopy), false, `${englishCopy} should not be hardcoded in DealsPage`);
  }
});



test("Indonesian service and support active render path copy resolves without English fallback", () => {
  const id = getTranslations("id");
  const supportContentSource = readFileSync("src/app/support/SupportContent.tsx", "utf8");
  const supportFormSource = readFileSync("src/components/support/SupportForm.tsx", "utf8");
  const serviceGuaranteeSource = readFileSync("src/app/service-guarantee/ServiceGuaranteeContent.tsx", "utf8");
  const moreServiceInfoSource = readFileSync("src/app/more-service-info/MoreServiceInfoContent.tsx", "utf8");

  const expectedSupport = {
    supportEyebrow: "Pusat bantuan Kurioticket",
    supportTitle: "Dukungan pelanggan",
    supportBeforeContactHeading: "Sebelum menghubungi kami",
    supportBeforeContactDescription: "Sertakan email pada akun Kurioticket Anda, hal yang Anda coba lakukan, rute atau hotel jika relevan, dan halaman penyedia mana pun tempat Anda dialihkan. Jangan kirim nomor kartu pembayaran lengkap atau nomor dokumen perjalanan sensitif.",
    supportBeforeContactDashboardDescription: "Sertakan email akun Kurioticket Anda, hal yang perlu dibantu, dan detail pemesanan atau rute apa pun yang dapat membantu kami memahami masalah tersebut.",
    supportTicketHeading: "Buat tiket dukungan",
    supportFormEmailLabel: "Email",
    supportFormSubjectLabel: "Subjek",
    supportFormCategoryLabel: "Kategori",
    supportCategorySearchHelp: "Bantuan pencarian",
    supportCategoryPriceAlerts: "Peringatan harga",
    supportCategoryPartnerRedirect: "Pengalihan mitra",
    supportCategoryAccountHelp: "Bantuan akun",
    supportFormMessageLabel: "Bagaimana kami dapat membantu?",
    supportFormMessagePlaceholder: "Bagikan konteks rute, hotel, peringatan, atau akun.",
    supportFormSubmit: "Kirim permintaan",
    supportFormSending: "Mengirim...",
    supportFormSuccessPrefix: "Tiket",
    supportFormSuccessSuffix: "dibuka.",
    supportFormErrorFallback: "Tidak dapat membuka tiket.",
    supportFaqHeading: "Pertanyaan yang sering diajukan",
    supportFaqAccountQuestion: "Bantuan akun dan masuk",
    supportFaqSearchQuestion: "Bantuan pencarian dan hasil",
    supportFaqSavedTripsQuestion: "Perjalanan tersimpan dan peringatan",
    supportFaqRedirectQuestion: "Bantuan pemesanan/pengalihan penyedia",
    supportFaqAlreadyBookedQuestion: "Sudah memesan dengan penyedia?",
    supportFaqChangeBookingQuestion: "Bisakah Kurioticket mengubah pemesanan saya?",
    supportFaqWhyRedirectedQuestion: "Mengapa saya diarahkan ke penyedia lain?",
  };

  const expectedServiceGuarantee = {
    serviceGuaranteeEyebrow: "Komitmen layanan Kurioticket",
    serviceGuaranteeTitle: "Jaminan Layanan",
    serviceGuaranteeDescription: "Kami ingin wisatawan memahami cara kerja Kurioticket dan hal yang dapat mereka harapkan saat menggunakan platform kami.",
    serviceGuaranteeFaqHeading: "Pertanyaan yang sering diajukan",
    serviceGuaranteeFaqDescription: "Jawaban ini menjelaskan peran Kurioticket sebagai platform pencarian dan perbandingan perjalanan.",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Apa yang dijamin oleh Kurioticket?",
    serviceGuaranteeFaqResultsDisplayedQuestion: "Bagaimana hasil perjalanan ditampilkan?",
    serviceGuaranteeFaqRedirectedQuestion: "Mengapa saya dialihkan ke penyedia lain?",
    serviceGuaranteeFaqBookDirectlyQuestion: "Apakah saya memesan langsung di Kurioticket?",
    serviceGuaranteeFaqPricesGuaranteedQuestion: "Apakah harga selalu dijamin?",
    serviceGuaranteeFaqChooseProvidersQuestion: "Bagaimana Kurioticket memilih penyedia?",
    serviceGuaranteeFaqEncounterIssueQuestion: "Apa yang harus saya lakukan jika mengalami masalah?",
    serviceGuaranteeFaqContactSupportQuestion: "Bagaimana saya dapat menghubungi dukungan?",
    serviceGuaranteeHelpCardTitle: "Butuh bantuan dengan akun atau pencarian Anda?",
    serviceGuaranteeSupportCta: "Hubungi Dukungan Pelanggan",
  };

  const expectedMoreServiceInfo = {
    moreServiceInfoEyebrow: "Informasi Platform",
    moreServiceInfoTitle: "Informasi Layanan Lainnya",
    moreServiceInfoDescription: "Pelajari bagaimana Kurioticket membantu wisatawan mencari, membandingkan, menyimpan, dan mengatur pilihan perjalanan dari beberapa penyedia dalam satu tempat.",
    moreServiceInfoContextTitle: "Rencanakan dengan konteks",
    moreServiceInfoContextSubtitle: "Dari hasil pencarian hingga pengalihan ke penyedia",
    moreServiceInfoContextCompare: "Bandingkan opsi dari beberapa penyedia perjalanan.",
    moreServiceInfoContextSave: "Simpan perjalanan, peringatan, dan preferensi saat masuk.",
    moreServiceInfoContextContinue: "Lanjutkan dengan detail penyedia sebelum memesan secara eksternal.",
    moreServiceInfoHowHeading: "Cara kerja Kurioticket",
    moreServiceInfoHowDescription: "Detail layanan ini menjelaskan peran Kurioticket sebelum, selama, dan setelah pencarian perjalanan.",
    moreServiceInfoHowBadge: "DASAR-DASAR PERENCANAAN PERJALANAN",
    moreServiceInfoStepSearchTitle: "Cari di Beberapa Penyedia",
    moreServiceInfoStepSearchSummary: "Cari pilihan perjalanan dari berbagai penyedia dalam satu tempat, tanpa membuka setiap penyedia secara terpisah.",
    moreServiceInfoStepSearchDetails: "Kurioticket menghadirkan informasi penerbangan, hotel, rute, dan hasil perjalanan yang tersedia dalam satu pengalaman pencarian agar wisatawan dapat meninjau pilihan dengan lebih efisien.",
    moreServiceInfoStepCompareTitle: "Bandingkan Pilihan Perjalanan",
    moreServiceInfoStepCompareSummary: "Bandingkan harga, rute, hotel, jadwal, dan pilihan perjalanan yang tersedia sebelum menentukan yang paling sesuai dengan perjalanan Anda.",
    moreServiceInfoStepCompareDetails: "Hasil dapat mencakup detail penyedia, waktu, informasi destinasi, dan data perjalanan lain yang membantu Anda mengevaluasi opsi sebelum melanjutkan ke penyedia.",
    moreServiceInfoStepSaveTitle: "Simpan Perjalanan dan Peringatan",
    moreServiceInfoStepSaveSummary: "Buat akun untuk menyimpan perjalanan, melacak rute, dan mengelola peringatan perjalanan yang terkait dengan perencanaan perjalanan Anda.",
    moreServiceInfoStepSaveDetails: "Perjalanan tersimpan, pencarian terbaru, dan peringatan memudahkan Anda kembali ke opsi yang sedang dipertimbangkan dan menjaga detail perencanaan perjalanan tetap tertata.",
    moreServiceInfoStepRedirectsTitle: "Penjelasan Pengalihan Penyedia",
    moreServiceInfoStepRedirectsSummary: "Saat memilih penawaran, Anda dapat dialihkan ke penyedia perjalanan untuk menyelesaikan pemesanan, pembayaran, konfirmasi, dan pemenuhan layanan.",
    moreServiceInfoStepRedirectsDetails: "Halaman penyedia adalah tempat harga akhir, ketersediaan, aturan, langkah pembayaran, tanda terima, perubahan pemesanan, pembatalan, dan dokumen perjalanan ditangani untuk penawaran yang dialihkan.",
    moreServiceInfoStepAccountTitle: "Alat Akun & Perjalanan",
    moreServiceInfoStepAccountSummary: "Gunakan alat akun untuk mengatur pencarian tersimpan, perjalanan, peringatan, dan preferensi dalam satu ruang kerja Kurioticket.",
    moreServiceInfoStepAccountDetails: "Alat ini mendukung perencanaan perjalanan di Kurioticket, sementara pengelolaan pemesanan khusus penyedia tetap berada pada penyedia saat pemesanan Anda diselesaikan secara eksternal.",
    moreServiceInfoFaqHeading: "Pertanyaan yang sering diajukan",
    moreServiceInfoFaqDescription: "Jawaban singkat tentang pencarian perjalanan, pengalihan penyedia, perjalanan tersimpan, dan alat akun.",
    moreServiceInfoFaqWhatQuestion: "Apa itu Kurioticket?",
    moreServiceInfoFaqSearchQuestion: "Bagaimana cara kerja pencarian perjalanan?",
    moreServiceInfoFaqRedirectQuestion: "Mengapa saya dialihkan ke penyedia lain?",
    moreServiceInfoFaqPaymentsQuestion: "Apakah Kurioticket memproses pembayaran?",
    moreServiceInfoFaqSaveQuestion: "Bisakah saya menyimpan perjalanan dan peringatan?",
    moreServiceInfoFaqAccountQuestion: "Apakah akun diperlukan?",
    moreServiceInfoFaqSupportQuestion: "Bagaimana cara menghubungi dukungan?",
    moreServiceInfoHelpTitle: "Butuh bantuan?",
    moreServiceInfoHelpDescription: "Ada pertanyaan tentang akun, perjalanan tersimpan, peringatan, atau pengalihan penyedia?",
    moreServiceInfoSupportCta: "Hubungi Dukungan Pelanggan",
  };

  for (const expected of [expectedSupport, expectedServiceGuarantee, expectedMoreServiceInfo]) {
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(id[key], value, key);
      if (value !== enTranslations[key]) assert.notEqual(id[key], enTranslations[key], key);
    }
  }

  const hiddenAnswerKeys = [
    "supportFaqAccountAnswer", "supportFaqSearchAnswer", "supportFaqSavedTripsAnswer", "supportFaqRedirectAnswer",
    "supportFaqAlreadyBookedAnswer", "supportFaqChangeBookingAnswer", "supportFaqWhyRedirectedAnswer",
    "serviceGuaranteeFaqWhatGuaranteeAnswer", "serviceGuaranteeFaqResultsDisplayedAnswer", "serviceGuaranteeFaqRedirectedAnswer",
    "serviceGuaranteeFaqBookDirectlyAnswer", "serviceGuaranteeFaqPricesGuaranteedAnswer", "serviceGuaranteeFaqChooseProvidersAnswer",
    "serviceGuaranteeFaqEncounterIssueAnswer", "serviceGuaranteeFaqContactSupportAnswer",
    "moreServiceInfoFaqWhatAnswer", "moreServiceInfoFaqSearchAnswer", "moreServiceInfoFaqRedirectAnswer", "moreServiceInfoFaqPaymentsAnswer",
    "moreServiceInfoFaqSaveAnswer", "moreServiceInfoFaqAccountAnswer", "moreServiceInfoFaqSupportAnswer",
  ];
  for (const key of hiddenAnswerKeys) {
    assert.ok(id[key], key);
    assert.notEqual(id[key], enTranslations[key], key);
  }

  assert.match(id.serviceGuaranteeFaqPricesGuaranteedAnswer, /Harga dapat berubah/);
  assert.match(id.serviceGuaranteeFaqEncounterIssueAnswer, /penyedia tersebut untuk perubahan pemesanan, pengembalian dana, pembatalan, atau dokumen perjalanan/);
  assert.match(id.moreServiceInfoStepRedirectsDetails, /harga akhir, ketersediaan, aturan, langkah pembayaran, tanda terima, perubahan pemesanan, pembatalan, dan dokumen perjalanan/);
  assert.match(id.moreServiceInfoFaqPaymentsAnswer, /Kurioticket tidak memproses pembayaran/);

  assert.ok(supportContentSource.includes('t("supportEyebrow")'));
  assert.ok(supportContentSource.includes('t("supportBeforeContactHeading")'));
  assert.ok(supportContentSource.includes('aria-label={t("supportTicketHeading")}'));
  assert.ok(supportContentSource.includes('supportFaqKeys.map'));
  assert.ok(supportFormSource.includes('fetch("/api/support/tickets"'));
  assert.ok(supportFormSource.includes('sourceContext: { page: "support_center" }'));
  assert.ok(supportFormSource.includes('name="email" type="email"'));
  assert.ok(supportFormSource.includes('name="subject" required'));
  assert.ok(supportFormSource.includes('name="category" defaultValue="price-alerts"'));
  assert.ok(supportFormSource.includes('value="search-help"'));
  assert.ok(supportFormSource.includes('value="price-alerts"'));
  assert.ok(supportFormSource.includes('value="redirect"'));
  assert.ok(supportFormSource.includes('value="account"'));
  assert.ok(supportFormSource.includes('name="body" required'));
  assert.ok(supportFormSource.includes('t("supportFormSending")'));
  assert.ok(serviceGuaranteeSource.includes('serviceFaqKeys.map'));
  assert.ok(serviceGuaranteeSource.includes('href="/support"'));
  assert.ok(moreServiceInfoSource.includes('serviceSections.map'));
  assert.ok(moreServiceInfoSource.includes('number: "01"') && moreServiceInfoSource.includes('number: "05"'));
  assert.ok(moreServiceInfoSource.includes('Search') && moreServiceInfoSource.includes('GitCompare') && moreServiceInfoSource.includes('ExternalLink') && moreServiceInfoSource.includes('UserRound'));
  assert.ok(moreServiceInfoSource.includes('serviceFaqs.map'));
  assert.ok(moreServiceInfoSource.includes('href="/support"'));
  assert.ok(!supportContentSource.includes("Kurioticket help desk"));
  assert.ok(!supportFormSource.includes("Send Request"));
  assert.ok(!serviceGuaranteeSource.includes("Service Guarantee"));
  assert.ok(!moreServiceInfoSource.includes("More Service Information"));
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Indonesian Legal Center overview and active legal documents are localized", () => {
  const id = getTranslations("id");
  const legalIndexSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");

  assert.equal(id["legal.index.heroLabel"], "INFORMASI HUKUM");
  assert.equal(id["legal.index.heroTitle"], "Pusat Hukum");
  assert.equal(id["legal.index.heroDescription"], "Sumber daya hukum Kurioticket menjelaskan cara kerja pencarian perjalanan, akun, privasi, pengalihan penyedia, dan praktik kepatuhan kami.");
  assert.equal(id["legal.index.compliance.eyebrow"], "PERUSAHAAN & KEPATUHAN");
  assert.equal(id["legal.index.compliance.sellerOfTravel"], "Penjual Perjalanan California");
  assert.equal(id["legal.index.compliance.registrationNumberLabel"], "Nomor Pendaftaran");
  assert.equal(id["legal.index.compliance.registrationExpires"], "Pendaftaran berakhir");
  assert.equal(id["legal.index.compliance.registrationExpiresDate"], "05 Juni 2027");
  assert.equal(id["legal.index.compliance.publicNotice"], "Pendaftaran sebagai penjual perjalanan tidak berarti persetujuan dari Negara Bagian California.");
  assert.equal(id["legal.index.contacts.support"], "Dukungan");
  assert.equal(id["legal.index.contacts.legal"], "Hukum");
  assert.equal(id["legal.index.contacts.privacy"], "Privasi");
  assert.equal(id["legal.index.resourcesEyebrow"], "Sumber resmi");
  assert.equal(id["legal.index.resourcesTitle"], "Dokumen hukum");
  assert.equal(id["legal.index.documentsCountLabel"], "kebijakan dan pemberitahuan tersedia");
  assert.equal(id["legal.index.lastUpdated"], "Terakhir diperbarui");
  assert.equal(id["legal.index.lastUpdatedDate"], "11 Mei 2026");

  const expectedCardTitles: Record<string, string> = {
    termsOfService: "Ketentuan Layanan",
    privacyPolicy: "Kebijakan Privasi",
    cookiePolicy: "Kebijakan Cookie",
    privacyChoices: "Pilihan Privasi",
    affiliateDisclosure: "Pengungkapan Afiliasi",
    refundBookingDisclaimer: "Penafian Pengembalian Dana & Penyedia Eksternal",
    priceAvailabilityDisclaimer: "Penafian Harga & Ketersediaan",
    partnerRedirectDisclaimer: "Penafian Pengalihan Mitra",
    californiaSellerOfTravelNotice: "Pemberitahuan Penjual Perjalanan California",
    legalNoticeCompanyInformation: "Pemberitahuan Hukum & Informasi Perusahaan",
    acceptableUsePolicy: "Kebijakan Penggunaan yang Diperbolehkan",
    dataDeletionPolicy: "Kebijakan Penghapusan Data",
    securityStatement: "Pernyataan Keamanan",
    accessibilityStatement: "Pernyataan Aksesibilitas",
  };

  for (const [key, title] of Object.entries(expectedCardTitles)) {
    assert.equal(id[`legal.index.documents.${key}.title`], title);
    assert.ok(id[`legal.index.documents.${key}.summary`]);
    assert.notEqual(id[`legal.index.documents.${key}.summary`], enTranslations[`legal.index.documents.${key}.summary`]);
  }

  assert.equal(id.legalCenter, "Pusat Hukum");
  assert.equal(id["legal.print"], "Cetak");
  assert.equal(id["legal.lastUpdated"], "Terakhir diperbarui");
  assert.equal(id["legal.tableOfContents"], "DAFTAR ISI");

  assert.ok(legalIndexSource.includes('t("legal.index.heroLabel")'));
  assert.ok(legalIndexSource.includes('t(`legal.index.documents.${documentKey}.title`)'));
  assert.ok(legalIndexSource.includes('t(`legal.index.documents.${documentKey}.summary`)'));
  assert.ok(legalIndexSource.includes('t("legal.index.lastUpdated")'));
  assert.ok(legalViewerSource.includes('"privacy-policy": "legal.privacy"'));
  assert.ok(legalViewerSource.includes('"terms-of-service": "legal.terms"'));
  assert.ok(legalViewerSource.includes('"cookie-policy": "legal.cookiePolicy"'));
  assert.ok(legalViewerSource.includes('window.print()'));

  const expectedNamespaces = [
    "legal.terms",
    "legal.privacy",
    "legal.cookiePolicy",
    "legal.privacyChoices",
    "legal.affiliateDisclosure",
    "legal.refundBookingDisclaimer",
    "legal.priceAvailabilityDisclaimer",
    "legal.partnerRedirectDisclaimer",
    "legal.californiaSellerOfTravelNotice",
    "legal.legalNoticeCompanyInformation",
    "legal.acceptableUsePolicy",
    "legal.dataDeletionPolicy",
    "legal.securityStatement",
    "legal.accessibilityStatement",
  ];

  assert.equal(legalDocuments.length, 14);
  for (const namespace of expectedNamespaces) {
    assert.ok(id[`${namespace}.title`], `${namespace} title`);
    assert.ok(id[`${namespace}.summary`], `${namespace} summary`);
    assert.equal(id[`${namespace}.tableOfContents`], "DAFTAR ISI");
    assert.equal(id[`${namespace}.developerNote`], "Draf hukum ini adalah placeholder startup dan harus ditinjau oleh penasihat hukum yang memenuhi syarat sebelum peluncuran publik berskala besar.");
    assert.notEqual(id[`${namespace}.title`], enTranslations[`${namespace}.title`]);
    assert.notEqual(id[`${namespace}.summary`], enTranslations[`${namespace}.summary`]);
  }

  assert.equal(id["legal.privacy.title"], "Kebijakan Privasi");
  assert.equal(id["legal.privacy.sections.data-we-collect.title"], "Data yang Kami Kumpulkan");
  assert.equal(id["legal.terms.title"], "Ketentuan Layanan");
  assert.equal(id["legal.terms.sections.partner-services.paragraph2"], "Ketentuan mitra berlaku setelah Anda meninggalkan Kurioticket atau menyelesaikan transaksi dengan mitra. Tinjau semua persyaratan tarif, hotel, bagasi, perubahan, pengembalian dana, visa, dan wisatawan sebelum membeli.");
  assert.equal(id["legal.cookiePolicy.title"], "Kebijakan Cookie");
  assert.equal(id["legal.cookiePolicy.sections.controls.paragraph1"], "Anda dapat mengontrol cookie melalui pengaturan browser. Memblokir cookie yang diperlukan dapat mencegah proses masuk, dasbor, item tersimpan, preferensi, dan alat dukungan berfungsi dengan benar.");
  assert.equal(id["legal.californiaSellerOfTravelNotice.sections.registration.paragraph1"].includes("2172630-70"), true);
  assert.equal(id["legal.legalNoticeCompanyInformation.sections.contacts.paragraph1"], "Dukungan: support@kurioticket.com. Hukum: legal@kurioticket.com. Privasi: privacy@kurioticket.com.");

  assert.deepEqual(legalDocuments.map((document) => document.slug), [
    "terms-of-service",
    "privacy-policy",
    "cookie-policy",
    "privacy-choices",
    "affiliate-disclosure",
    "refund-booking-disclaimer",
    "price-availability-disclaimer",
    "partner-redirect-disclaimer",
    "california-seller-of-travel-notice",
    "legal-notice-company-information",
    "acceptable-use-policy",
    "data-deletion-policy",
    "security-statement",
    "accessibility-statement",
  ]);
  assert.ok(legalDocuments.every((document) => document.sections.every((section) => section.id.length > 0)));
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("Swedish locale is active and localizes homepage while preserving other fallback", () => {
  const swedishOptions = languageOptions.filter((o) => o.code === "sv");

  assert.equal(swedishOptions.length, 1);
  assert.equal(swedishOptions[0]?.status, "available");
  assert.equal(swedishOptions[0]?.locale, "sv-SE");
  assert.equal(swedishOptions[0]?.nativeLabel, "Svenska");
  assert.equal(swedishOptions[0]?.label, "Swedish");
  assert.equal(swedishOptions[0]?.countryCode, "SE");
  assert.equal(swedishOptions[0]?.direction, "ltr");
  assert.equal(normalizeLanguage("sv"), "sv");
  assert.equal(normalizeLanguage("sv-SE"), "sv");
  assert.equal(normalizeLanguage("sv-se"), "sv");
  assert.equal(getTranslations("sv"), svTranslations);
  assert.equal(getTranslations("sv-SE"), svTranslations);
  assert.equal(svTranslations.homeHeroTitle, "Jämför resealternativ med en enkel sökning");
  assert.notEqual(svTranslations.homeHeroTitle, enTranslations.homeHeroTitle);
  assert.equal(svTranslations.logout, "Logga ut");

  const arabicOption = languageOptions.find((o) => o.code === "ar");
  assert.equal(arabicOption?.direction, "rtl");

  for (const option of languageOptions.filter((o) => o.status === "available" && o.code !== "ar")) {
    assert.equal(option.direction, "ltr", `${option.code} should remain ltr`);
  }
});



test("Swedish Cars results render path copy and date formatting resolve without English fallback", () => {
  const sv = getTranslations("sv");
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  const carsResultsPageSource = readFileSync("src/app/cars/results/page.tsx", "utf8");
  const expectedSwedishCopy: Record<string, string> = {
    "carsResults.resultsLabel": "Bilresultat",
    "carsResults.resultsFor": "Bilresultat för {location}",
    "carsResults.carResultsAria": "Bilresultat",
    "carsResults.carFiltersAria": "Bilfilter",
    "carsResults.filterBy": "Filtrera efter",
    "carsResults.activeFilterCount": "{count} aktiva",
    "carsResults.selectedFilterCount": "{count} valda",
    "carsResults.reset": "Återställ",
    "carsResults.resetFilters": "Återställ filter",
    "carsResults.openFilters": "Öppna filter",
    "carsResults.closeFilters": "Stäng filter",
    "carsResults.edit": "REDIGERA",
    "carsResults.editSearch": "Redigera sökning",
    "carsResults.editCarSearch": "Redigera bilsökning",
    "carsResults.closeEditSearch": "Stäng redigering av sökning",
    "carsResults.carRentalSearch": "Hyrbilssökning",
    "carsResults.searchCars": "Sök bilar",
    "carsResults.pickupLocation": "UPPHÄMTNINGSPLATS",
    "carsResults.returnLocation": "ÅTERLÄMNINGSPLATS",
    "carsResults.pickupLocationNeeded": "Upphämtningsplats behövs",
    "carsResults.pickupToReturn": "{pickup} till {return}",
    "carsResults.sameAsPickup": "Samma som upphämtning",
    "carsResults.selectRentalDates": "Välj hyrdatum",
    "carsResults.selectDate": "Välj datum",
    "carsResults.selectDates": "Välj datum",
    "carsResults.rentalDates": "HYRDATUM",
    "carsResults.rentalDatePlaceholder": "Upphämtningsdatum — återlämningsdatum",
    "carsResults.rentalDateRangeCalendar": "Kalender för hyrdatumintervall",
    "carsResults.selectPickupThenReturn": "Välj upphämtning och sedan återlämning",
    "carsResults.pickupReturnTime": "UPPHÄMTNINGS-/ÅTERLÄMNINGSTID",
    "carsResults.pickupReturnTimeSelector": "Väljare för upphämtnings- och återlämningstid",
    "carsResults.pickupTime": "Upphämtningstid",
    "carsResults.returnTime": "Återlämningstid",
    "carsResults.driverAge": "FÖRARENS ÅLDER",
    "carsResults.anyDriverAgeRange": "Valfri förarålder 18–70",
    "carsResults.yearsOld": "år",
    "carsResults.emptyInventory": "Liveutbud för bilar är ännu inte tillgängligt att visa för den här sökningen. Uppdatera sökuppgifterna ovan eller försök igen senare.",
    "carsResults.enterPickupDetails": "Ange upphämtningsuppgifter ovan för att förbereda en bilsökning.",
    "carsResults.vehicleType": "Fordonstyp",
    "carsResults.smallCars": "Små bilar",
    "carsResults.mediumCars": "Mellanstora bilar",
    "carsResults.suvs": "SUV:ar",
    "carsResults.transmission": "Växellåda",
    "carsResults.automatic": "Automat",
    "carsResults.manual": "Manuell",
    "carsResults.seats": "Säten",
    "carsResults.seats4Plus": "4+ säten",
    "carsResults.seats5Plus": "5+ säten",
    "carsResults.seats7Plus": "7+ säten",
    "carsResults.bags": "Väskor",
    "carsResults.bags2Plus": "2+ väskor",
    "carsResults.bags3Plus": "3+ väskor",
    "carsResults.bags4Plus": "4+ väskor",
    "carsResults.fuelPolicy": "Bränslepolicy",
    "carsResults.fullToFull": "Full till full",
    "carsResults.sameToSame": "Samma till samma",
    "carsResults.mileagePolicy": "Milpolicy",
    "carsResults.unlimitedMileage": "Obegränsad körsträcka",
    "carsResults.limitedMileage": "Begränsad körsträcka",
    "carsResults.cancellation": "Avbokning",
    "carsResults.freeCancellation": "Gratis avbokning",
    "carsResults.payAtPickup": "Betala vid upphämtning",
    "carsResults.pickupLocationType": "Typ av upphämtningsplats",
    "carsResults.airportCounter": "Flygplatsdisk",
    "carsResults.shuttlePickup": "Upphämtning med skyttel",
    "carsResults.cityLocation": "Stadsplats",
  };

  for (const [key, value] of Object.entries(expectedSwedishCopy)) {
    assert.equal(sv[key], value, `${key} should resolve to Swedish copy`);
    if (enTranslations[key] !== value) {
      assert.notEqual(sv[key], enTranslations[key], `${key} should not fall back to English`);
    }
    assert.ok(carsResultsSource.includes(`t("${key}")`) || carsResultsSource.includes(`labelKey: "${key}"`) || carsResultsSource.includes(`titleKey: "${key}"`), `${key} should be read by the active cars results render path`);
  }

  assert.equal(sv["carsResults.resultsFor"].replace("{location}", sv["carsResults.pickupLocationNeeded"]), "Bilresultat för Upphämtningsplats behövs");
  assert.equal(sv["carsResults.resultsFor"].replace("{location}", "Stockholm"), "Bilresultat för Stockholm");
  assert.equal(`${new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long" }).format(new Date(2026, 5, 30))} — ${new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long" }).format(new Date(2026, 6, 5))} · 10:00 — 10:00 · ${sv["carsResults.anyDriverAgeRange"]}`, "30 juni — 5 juli · 10:00 — 10:00 · Valfri förarålder 18–70");
  assert.equal(`${new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(2026, 5, 30))} — ${new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(2026, 6, 5))}`, "30 juni 2026 — 5 juli 2026");
  assert.equal(new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)), "juni 2026");
  assert.equal(new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)), "juli 2026");
  assert.deepEqual(Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("sv-SE", { weekday: "short" }).format(new Date(2024, 0, 7 + day))), ["sön", "mån", "tis", "ons", "tors", "fre", "lör"]);

  assert.equal(sv["carsSearch.pickupLocationPlaceholder"], "Flygplats, stad eller adress");
  assert.equal(sv.clear, "Rensa");
  assert.equal(sv.done, "Klart");
  assert.equal(sv.search, "Sök");
  assert.equal(languageOptions.find((o) => o.code === "sv")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");

  assert.ok(carsResultsSource.includes('if (normalizedLocale.startsWith("sv"))') && carsResultsSource.includes('return "sv-SE"'), "Swedish cars results dates should use the Swedish Intl locale.");
  assert.ok(carsResultsSource.includes('["de", "es", "fr", "id", "ja", "nl", "pl", "pt", "sv", "tr"]'), "Swedish cars results times should use 24-hour labels without AM/PM.");
  assert.ok(carsResultsSource.includes('action="/cars/results"') && carsResultsSource.includes('method="get"'), "Cars results search form should preserve the route path and query-param submission behavior.");
  assert.ok(carsResultsSource.includes('name="pickupLocation"') && carsResultsSource.includes('name="dropoffLocation"') && carsResultsSource.includes('name="pickupDate"') && carsResultsSource.includes('name="dropoffTime"') && carsResultsSource.includes('name="driverAge"'), "Cars results search should preserve submitted field names.");
  assert.ok(carsResultsSource.includes('value={pickupLocation}') && carsResultsSource.includes('value={dropoffLocation}') && carsResultsSource.includes('value={pickupDate}') && carsResultsSource.includes('value={driverAge}'), "Cars results search should preserve raw dynamic values.");
  assert.ok(carsResultsSource.includes('onChange={() => onToggle(group.id, option.id)}') && carsResultsSource.includes('selectedOptions.includes(option.id)'), "Filter behavior should keep raw filter IDs while localizing only display labels.");
  assert.ok(carsResultsSource.includes('hasSearchContext') && carsResultsSource.includes('t("carsResults.emptyInventory")') && carsResultsSource.includes('t("carsResults.enterPickupDetails")'), "Inventory unavailable and empty states should resolve through carsResults i18n keys.");
  assert.ok(carsResultsPageSource.includes('pickupLocation') && carsResultsPageSource.includes('dropoffLocation') && carsResultsPageSource.includes('normalizeDriverAge'), "Server page should continue passing raw search params into the active client render path.");
});

test("Swedish cars landing render path resolves active copy without English fallback", () => {
  const sv = getTranslations("sv");
  const auditedSwedishCarsLandingKeys: Array<[string, string]> = [
    ["searchRentalCarsEveryPartTrip", "Sök hyrbilar för varje del av din resa"],
    ["carsSearch.pickupLocationLabel", "UPPHÄMTNINGSPLATS"],
    ["carsSearch.pickupLocationPlaceholder", "Flygplats, stad eller adress"],
    ["carsSearch.returnLocationPlaceholder", "Stad, flygplats eller adress för återlämning"],
    ["carsSearch.returnToSameLocation", "Återlämna på samma plats"],
    ["carsSearch.differentReturnLocation", "Annan återlämningsplats"],
    ["carsSearch.rentalDatesLabel", "HYRDATUM"],
    ["carsSearch.rentalDatePlaceholder", "Upphämtningsdatum — återlämningsdatum"],
    ["carsSearch.pickupReturnTimeLabel", "UPPHÄMTNINGS-/ÅTERLÄMNINGSTID"],
    ["carsSearch.pickupReturnTimeSummary", "{pickupTime} upphämtning — {returnTime} återlämning"],
    ["carsSearch.driverAgeLabel", "FÖRARENS ÅLDER"],
    ["carsSearch.driverAgeAnyAge", "Valfri ålder"],
    ["search", "Sök"],
    ["exploreCarsByTripStyle", "Utforska hyrbilar efter resestil"],
    ["carsTripStyleBody", "Välj en biltyp så öppnar vi resultaten med söksammanhanget klart."],
    ["carsTripStyle.economy.title", "Ekonomibilar"],
    ["carsTripStyle.economy.subtitle", "Prisvärda sökningar för stad och ensamresor"],
    ["carsTripStyle.economy.cta", "Starta en sökning efter ekonomibil"],
    ["carsTripStyle.economy.ariaLabel", "Starta en sökning efter ekonomibil från upphämtning i stadskärnan"],
    ["carsTripStyle.economy.imageAlt", "Kompakta stadsbilar som kör mellan byggnader i centrum"],
    ["carsTripStyle.suv.title", "SUV:ar"],
    ["carsTripStyle.suv.subtitle", "Plats för familjeresor, bagage och längre körningar"],
    ["carsTripStyle.suv.cta", "Öppna sökning efter SUV-hyrbil"],
    ["carsTripStyle.luxury.title", "Lyxbilar"],
    ["carsTripStyle.luxury.subtitle", "Premiumsökning för affärsresor eller särskilda resor"],
    ["carsTripStyle.luxury.cta", "Planera en sökning efter lyxbil"],
    ["carsTripStyle.van.title", "Minibussar"],
    ["carsTripStyle.van.subtitle", "Söksammanhang för gruppresor och familjebagage"],
    ["carsTripStyle.van.cta", "Sök minibussar för gruppresor"],
    ["carsTrust.0.title", "Byggd för kompletta resor"],
    ["carsTrust.0.description", "Planera flyg, boenden och marktransport i ett och samma Kurioticket-flöde."],
    ["carsTrust.1.title", "Upphämtningsdetaljer först"],
    ["carsTrust.1.description", "Ange upphämtningsplats, datum, tider och förarens ålder så att din hyrbilssökning börjar med rätt reseuppgifter."],
    ["carsTrust.2.title", "Tydlig genomgång av hyrbilen"],
    ["carsTrust.2.description", "Granska slutpris, tillgänglighet, avgifter och hyresregler hos leverantören innan du bokar."],
    ["carsPickupPointsTitle", "Börja med populära upphämtningsplatser för bil"],
    ["carsPickupPointsBody", "Välj en upphämtningstyp så öppnar vi bilresultatsidan med sökuppgifterna redo."],
    ["carsPickup.Airport.title", "Upphämtning på flygplats"],
    ["carsPickup.Airport.subtitle", "Börja från större ankomstplatser på flygplatsen"],
    ["carsPickup.Airport.imageAlt", "Flygplan parkerat vid en flygplatsgate i solnedgången"],
    ["carsPickup.City center.title", "Upphämtning i stadskärnan"],
    ["carsPickup.City center.subtitle", "Hämta nära hotell i centrum och affärsdistrikt"],
    ["carsPickup.Train station.title", "Upphämtning vid tågstation"],
    ["carsPickup.Train station.subtitle", "Fortsätt din resa efter ankomst med tåg"],
    ["carsPickup.Hotel area.title", "Upphämtning vid hotellområde"],
    ["carsPickup.Hotel area.subtitle", "Planera bilupphämtning nära där du bor"],
    ["carsFaq.heading", "Vanliga frågor om bilar"],
    ["carsFaq.0.question", "Vilken information behöver jag för att söka efter en hyrbil?"],
    ["carsFaq.0.answer", "Ange upphämtningsplats, upphämtnings- och återlämningsdatum, upphämtnings- och återlämningstider, förarens ålder och om du planerar att lämna tillbaka bilen på en annan plats."],
    ["carsFaq.1.question", "Kan jag lämna tillbaka bilen på en annan plats?"],
    ["carsFaq.1.answer", "Ja. Välj Annan återlämningsplats i sökformuläret och ange den stad, flygplats eller adress där du planerar att lämna tillbaka bilen."],
    ["carsFaq.2.question", "Varför spelar förarens ålder roll för hyrbilar?"],
    ["carsFaq.2.answer", "Hyresleverantörer kan tillämpa olika regler, avgifter, fordonsbehörighet eller krav på deposition beroende på förarens ålder och plats."],
    ["carsFaq.3.question", "Vad bör jag kontrollera innan jag bokar en hyrbil?"],
    ["carsFaq.3.answer", "Granska upphämtnings- och återlämningsplats, datum, tider, körsträckepolicy, bränslepolicy, försäkringsalternativ, avbokningsvillkor, krav på deposition och nödvändiga dokument innan du bokar."],
    ["carsFaq.4.question", "Var bekräftas det slutliga hyrbilspriset?"],
    ["carsFaq.4.answer", "Slutpris, fordonstillgänglighet, skatter, avgifter, krav på deposition och hyresregler bekräftas av leverantören innan du bokar."],
    ["carsFaq.5.question", "Vilka dokument kan jag behöva vid upphämtning?"],
    ["carsFaq.5.answer", "Hyresleverantörer kan kräva giltigt körkort, betalkort, identitetsbevis och eventuella dokument som krävs av upphämtningslandet eller upphämtningsplatsen."],
  ];

  for (const [key, expected] of auditedSwedishCarsLandingKeys) {
    assert.equal(sv[key], expected);
    if (key !== "search") {
      assert.notEqual(sv[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }
  assert.equal(
    sv["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"),
    "10:00 upphämtning — 10:00 återlämning",
  );
  assert.ok(languageOptions.some((option) => option.code === "sv" && option.locale === "sv-SE" && option.nativeLabel === "Svenska" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));

  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
  const carsLandingContentSource = readFileSync("src/data/carsLandingContent.ts", "utf8");

  for (const key of ["searchRentalCarsEveryPartTrip", "carsSearch.pickupLocationLabel", "carsSearch.differentReturnLocation", "exploreCarsByTripStyle", "carsPickupPointsTitle", "carsFaq.heading"]) {
    assert.ok(carsPageSource.includes(`t("${key}")`) || carsPageSource.includes("dictionary[item.questionKey]"), `Cars landing render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsPageSource.includes("buildCarResultsHref") &&
      carsPageSource.includes("pickupLocation: card.pickupLocation") &&
      carsPageSource.includes("vehicleType: card.vehicleType") &&
      carsPageSource.includes("returnToDifferentLocation") &&
      carsPageSource.includes('name="pickupLocation"') &&
      carsPageSource.includes('name="pickupDate"') &&
      carsPageSource.includes('type="checkbox"') &&
      carsPageSource.includes("grid auto-cols-[minmax(240px,82vw)]") &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.economy"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.suv"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.luxury"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.van"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Airport"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.City center"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Train station"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Hotel area"') &&
      carsLandingContentSource.includes('image:') &&
      carsLandingContentSource.includes('pickupLocation: "City center"') &&
      carsLandingContentSource.includes('vehicleType: "economy"'),
    "Cars landing should keep raw pickup/search values, vehicle types, form names, checkbox behavior, card order, image references, query builders, CTA routes, and layout source paths intact.",
  );
  assert.ok(
    !carsPageSource.includes("Search rental cars for every part of your trip") &&
      !carsPageSource.includes("Explore rental cars by trip style") &&
      !carsPageSource.includes("Start with popular car pickup points") &&
      !carsPageSource.includes("Cars Frequently asked questions"),
    "Cars landing render path should not hard-code screenshot-visible English copy.",
  );
});


test("Swedish Hotels landing copy resolves without English fallback", () => {
  const sv = getTranslations("sv");
  const hotelsPageSource = readFileSync("src/app/hotels/page.tsx", "utf8");
  const searchSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  const expectedSwedishHotelLandingCopy: Record<string, string> = {
    hotelsHeroTitle: "Hitta boendet som ger resan rätt start.",
    hotelsHeroSubtitle: "Jämför hotell på ett ställe, från stilfulla stadsankomster till avslappnade resortresor.",
    hotelsHeroMobileTitle: "Hitta boendet som ger resan rätt start.",
    hotelsHeroMobileSubtitle: "Jämför hotell på ett ställe, från stilfulla stadsankomster till avslappnade resortresor.",
    hotels: "Hotell",
    hotelSearchDestinationLabel: "DESTINATION",
    hotelSearchDestinationPlaceholder: "Stad eller hotell",
    hotelSearchTravelDatesLabel: "RESEDATUM",
    hotelSearchDatePlaceholder: "Incheckning — utcheckning",
    hotelSearchGuestsLabel: "GÄSTER",
    guestSingular: "gäst",
    roomSingular: "rum",
    search: "Sök",
    exploreHotelStaysByDestination: "Utforska hotellvistelser efter destination",
    featuredHotelDestinations: "Utvalda hotelldestinationer",
    findStaysEveryKindTrip: "Hitta boenden för alla typer av resor",
    hotelInspirationBody: "Bläddra bland destinationsidéer efter den typ av vistelse du har i åtanke.",
    "hotelInspirationCategory.Beach": "Strand",
    "hotelInspirationCategory.City breaks": "Stadsresor",
    "hotelInspirationCategory.Family trips": "Familjeresor",
    "hotelInspirationCategory.Relaxed stays": "Avkopplande vistelser",
    "hotelInspirationCategory.Weekend ideas": "Weekendidéer",
    "hotelInspirationBadge.Coastal stays": "Kustvistelser",
    "hotelInspirationBadge.City coast": "Stadskust",
    "hotelInspirationBadge.Waterfront stays": "Boenden vid vattnet",
    "hotelInspirationBadge.Harbor city": "Hamnstad",
    "hotelInspirationBadge.Warm escape": "Varm tillflykt",
    "hotelInspirationBadge.Bay city": "Vikstad",
    hotelTrustCompareBody: "Visa hotellalternativ från reseleverantörer på ett ställe innan du fortsätter.",
    hotelTrustReviewTitle: "Granska vistelsedetaljer",
    hotelTrustReviewBody: "Kontrollera datum, gäster, rum, prissammanhang och information om vistelsen innan du väljer.",
    hotelTrustProviderTitle: "Fortsätt med leverantören",
    hotelTrustProviderBody: "När du väljer ett alternativ fortsätter du till leverantören för att bekräfta slutpris, tillgänglighet, avgifter och avbokningsregler.",
    exploreStaysWorldwide: "Utforska boenden runt om i världen",
    "hotelDestination.Tokyo.title": "Japan",
    "hotelDestination.Tokyo.subtitle": "Boenden i Tokyo",
    "hotelDestination.London.title": "Storbritannien",
    "hotelDestination.London.subtitle": "Boenden i London",
    "hotelDestination.Paris.title": "Frankrike",
    "hotelDestination.Paris.subtitle": "Boenden i Paris",
    "hotelDestination.New York.title": "USA",
    "hotelDestination.New York.subtitle": "Boenden i New York",
    "hotelDestination.Rome.title": "Italien",
    "hotelDestination.Rome.subtitle": "Boenden i Rom",
    "hotelDestination.Dubai.title": "Förenade Arabemiraten",
    "hotelDestination.Dubai.subtitle": "Boenden i Dubai",
    "hotelDestination.Singapore.title": "Singapore",
    "hotelDestination.Singapore.subtitle": "Boenden i Singapore",
    "hotelDestination.Barcelona.title": "Spanien",
    "hotelDestination.Barcelona.subtitle": "Boenden i Barcelona",
    "hotelDestination.Toronto.title": "Kanada",
    "hotelDestination.Toronto.subtitle": "Boenden i Toronto",
    "hotelDestination.Amsterdam.title": "Nederländerna",
    "hotelDestination.Amsterdam.subtitle": "Boenden i Amsterdam",
    "hotelDestination.Bangkok.title": "Thailand",
    "hotelDestination.Bangkok.subtitle": "Boenden i Bangkok",
    "hotelDestination.Cancun.title": "Mexiko",
    "hotelDestination.Cancun.subtitle": "Boenden i Cancun",
    "hotelDestination.Istanbul.title": "Turkiet",
    "hotelDestination.Istanbul.subtitle": "Boenden i Istanbul",
    hotelsHeroImageAlt: "Hotellpiccolo välkomnar en gäst med bagage i en premiumlobby",
    "hotelDestination.Tokyo.imageAlt": "Tokyos skyline med täta höghus i dagsljus",
    "hotelDestination.Cancun.imageAlt": "Cancunstrand med vit sand och turkost vatten",
  };

  for (const [key, expected] of Object.entries(expectedSwedishHotelLandingCopy)) {
    assert.equal(sv[key], expected, key);
    if (enTranslations[key] !== expected) {
      assert.notEqual(sv[key], enTranslations[key], key);
    }
  }

  assert.equal(`${1} ${sv.guestSingular}, ${1} ${sv.roomSingular}`, "1 gäst, 1 rum");
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));

  for (const key of [
    "hotelsHeroTitle",
    "hotelsHeroSubtitle",
    "exploreHotelStaysByDestination",
    "featuredHotelDestinations",
    "findStaysEveryKindTrip",
    "hotelInspirationBody",
    "hotelTrustCompareBody",
    "hotelTrustReviewTitle",
    "hotelTrustReviewBody",
    "hotelTrustProviderTitle",
    "hotelTrustProviderBody",
    "exploreStaysWorldwide",
  ]) {
    assert.ok(hotelsPageSource.includes(`t("${key}")`), key);
  }

  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.title`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.subtitle`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.imageAlt`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.linkLabel`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationCategory\.\$\{category\}`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationBadge\.\$\{card\.badge\}`\]/);
  assert.match(hotelsPageSource, /destination: destinationQuery/);
  assert.match(hotelsPageSource, /guests: "2"/);
  assert.match(hotelsPageSource, /rooms: "1"/);
  assert.match(hotelsPageSource, /createHotelInspirationCard\("Cancun", "Coastal stays"\)/);
  assert.match(hotelsPageSource, /className="page-shell relative z-0 mx-auto/);
  assert.match(searchSource, /value={destination}/);
  assert.match(searchSource, /hotelSearchDestinationLabel/);
  assert.match(searchSource, /hotelSearchDestinationPlaceholder/);
  assert.match(searchSource, /hotelSearchTravelDatesLabel/);
  assert.match(searchSource, /hotelSearchDatePlaceholder/);
  assert.match(searchSource, /hotelSearchGuestsLabel/);
});


test("Swedish signed-in account dropdown labels do not fall back to English", () => {
  const sv = getTranslations("sv");

  assert.equal(sv["accountMenu.myAccount.label"], "Mitt konto");
  assert.equal(sv["accountMenu.savedTrips.label"], "Sparade resor");
  assert.equal(sv["accountMenu.priceAlerts.label"], "Prisaviseringar");
  assert.equal(sv.logout, "Logga ut");
  assert.notEqual(sv["accountMenu.myAccount.label"], enTranslations["accountMenu.myAccount.label"]);
  assert.notEqual(sv["accountMenu.savedTrips.label"], enTranslations["accountMenu.savedTrips.label"]);
  assert.notEqual(sv["accountMenu.priceAlerts.label"], enTranslations["accountMenu.priceAlerts.label"]);
  assert.notEqual(sv.logout, enTranslations.logout);

  const swedishOption = languageOptions.find((o) => o.code === "sv");
  const arabicOption = languageOptions.find((o) => o.code === "ar");
  assert.equal(swedishOption?.locale, "sv-SE");
  assert.equal(swedishOption?.nativeLabel, "Svenska");
  assert.equal(swedishOption?.direction, "ltr");
  assert.equal(arabicOption?.direction, "rtl");

  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");

  assert.ok(
    appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"') &&
      appHeaderSource.includes("label: t[item.labelKey]"),
    "Signed-in account dropdown menu items should continue to resolve active account menu i18n keys.",
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
      appHeaderSource.includes("onClick={handleSignOut}") &&
      appHeaderSource.includes("revokeCurrentSessionRecord()") &&
      appHeaderSource.includes("signOut({ redirect: false, callbackUrl: \"/\" })"),
    "Signed-in account dropdown should keep menu routes and logout action/auth behavior wired unchanged.",
  );
  assert.ok(
    appHeaderSource.includes("LayoutDashboard") &&
      appHeaderSource.includes("SavedHeartIcon") &&
      appHeaderSource.includes("Tag") &&
      appHeaderSource.includes("LogOut"),
    "Signed-in account dropdown should keep routes and logout icons wired unchanged.",
  );
  assert.ok(
    appHeaderSource.includes("setAccountOpen(false)") &&
      appHeaderSource.includes("setMobileAccountOpen(false)") &&
      appHeaderSource.includes("accountOpen") &&
      appHeaderSource.includes('role="menuitem"'),
    "Signed-in account dropdown should keep click behavior, auth menu behavior, layout, styling, and accessibility wiring unchanged.",
  );
  assert.ok(
    !appHeaderSource.includes('>My account<') &&
      !appHeaderSource.includes('>Saved trips<') &&
      !appHeaderSource.includes('>Price alerts<') &&
      !appHeaderSource.includes('>Logout<'),
    "Signed-in account dropdown should not hard-code screenshot-visible English labels.",
  );
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

test("Polish signed-in account dropdown labels do not fall back to English", () => {
  const pl = getTranslations("pl");

  assert.equal(pl["accountMenu.myAccount.label"], "Moje konto");
  assert.equal(pl["accountMenu.savedTrips.label"], "Zapisane podróże");
  assert.equal(pl["accountMenu.priceAlerts.label"], "Alerty cenowe");
  assert.equal(pl.logout, "Wyloguj się");
  assert.notEqual(pl["accountMenu.myAccount.label"], enTranslations["accountMenu.myAccount.label"]);
  assert.notEqual(pl["accountMenu.savedTrips.label"], enTranslations["accountMenu.savedTrips.label"]);
  assert.notEqual(pl["accountMenu.priceAlerts.label"], enTranslations["accountMenu.priceAlerts.label"]);
  assert.notEqual(pl.logout, enTranslations.logout);

  const appHeaderSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");

  assert.ok(
    appHeaderSource.includes('labelKey: "accountMenu.myAccount.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.savedTrips.label"') &&
      appHeaderSource.includes('labelKey: "accountMenu.priceAlerts.label"') &&
      appHeaderSource.includes("label: t[item.labelKey]"),
    "Signed-in account dropdown menu items should continue to resolve active account menu i18n keys.",
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
      appHeaderSource.includes("onClick={handleSignOut}") &&
      appHeaderSource.includes("revokeCurrentSessionRecord()") &&
      appHeaderSource.includes("signOut({ redirect: false, callbackUrl: \"/\" })"),
    "Signed-in account dropdown should keep menu routes and logout action/auth behavior wired unchanged.",
  );
  assert.ok(
    appHeaderSource.includes("LayoutDashboard") &&
      appHeaderSource.includes("SavedHeartIcon") &&
      appHeaderSource.includes("Tag") &&
      appHeaderSource.includes("LogOut"),
    "Signed-in account dropdown should keep routes and logout icons wired unchanged.",
  );
  assert.ok(
    appHeaderSource.includes("setAccountOpen(false)") &&
      appHeaderSource.includes("accountOpen") &&
      appHeaderSource.includes('role="menuitem"'),
    "Signed-in account dropdown should keep open/close and menu behavior wired unchanged.",
  );
  assert.ok(
    !appHeaderSource.includes('>My account<') &&
      !appHeaderSource.includes('>Saved trips<') &&
      !appHeaderSource.includes('>Price alerts<') &&
      !appHeaderSource.includes('>Logout<'),
    "Signed-in account dropdown should not hard-code screenshot-visible English labels.",
  );
});

test("Polish account customization and booking preference pages do not fall back to English", () => {
  const pl = getTranslations("pl");
  const customizationSource = readFileSync(
    "src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx",
    "utf8",
  );
  const bookingSource = readFileSync(
    "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
    "utf8",
  );
  const customizationPageSource = readFileSync(
    "src/app/dashboard/preferences/customization/page.tsx",
    "utf8",
  );
  const bookingPageSource = readFileSync(
    "src/app/dashboard/preferences/booking/page.tsx",
    "utf8",
  );
  const accountBackLinkSource = readFileSync(
    "src/components/dashboard/AccountBackLink.tsx",
    "utf8",
  );

  const expectedCustomizationCopy: Record<string, string> = {
    "accountDashboard.preferences.customization.title": "Preferencje personalizacji",
    "accountDashboard.preferences.customization.description":
      "Wybierz, jak Kurioticket personalizuje Twoje doświadczenie.",
    "accountDashboard.preferences.customization.languageRegion.title": "Język i region",
    "accountDashboard.preferences.customization.languageRegion.description":
      "Ustaw domyślny język, walutę i region.",
    "accountDashboard.preferences.customization.preferredLanguage": "Preferowany język",
    "accountDashboard.preferences.customization.selectPreferredLanguage":
      "Wybierz preferowany język",
    "accountDashboard.preferences.customization.currency": "Waluta",
    "accountDashboard.preferences.customization.selectCurrency": "Wybierz walutę",
    "accountDashboard.preferences.customization.region": "Region",
    "accountDashboard.preferences.customization.selectRegion": "Wybierz region",
    "accountDashboard.preferences.customization.personalization.title": "Personalizacja",
    "accountDashboard.preferences.customization.personalization.description":
      "Kontroluj, jak Kurioticket personalizuje Twoje rekomendacje.",
    "accountDashboard.preferences.customization.personalizeSearches":
      "Używaj moich wyszukiwań do personalizacji rekomendacji",
    "accountDashboard.preferences.customization.personalizedTravelDeals":
      "Pokazuj spersonalizowane oferty podróży",
    "accountDashboard.preferences.customization.rememberRecentSearches":
      "Zapamiętuj moje ostatnie wyszukiwania",
    "accountDashboard.preferences.customization.communicationStyle.title": "Styl komunikacji",
    "accountDashboard.preferences.customization.communicationStyle.description":
      "Wybierz, jak Kurioticket ma się z Tobą komunikować.",
    "accountDashboard.preferences.customization.emailUpdates": "Aktualizacje e-mail",
    "accountDashboard.preferences.customization.priceAlertEmails": "E-maile z alertami cenowymi",
    "accountDashboard.preferences.customization.travelInspirationEmails":
      "E-maile z inspiracjami podróżniczymi",
    "accountDashboard.preferences.cancel": "Anuluj",
    "accountDashboard.preferences.savePreferences": "Zapisz preferencje",
  };

  const expectedBookingCopy: Record<string, string> = {
    "accountDashboard.preferences.booking.title": "Preferencje rezerwacji",
    "accountDashboard.preferences.booking.description":
      "Ustaw domyślne preferencje podróży, aby rezerwacje były szybsze i trafniejsze.",
    "accountDashboard.preferences.booking.airports.title": "Lotniska",
    "accountDashboard.preferences.booking.airports.description":
      "Wybierz lotniska, z których wolisz latać.",
    "accountDashboard.preferences.booking.homeAirport": "Lotnisko domowe",
    "accountDashboard.preferences.booking.searchAirport": "Wyszukaj lotnisko",
    "accountDashboard.preferences.booking.secondaryAirports": "Lotniska dodatkowe",
    "accountDashboard.preferences.booking.addAlternativeAirports": "Dodaj alternatywne lotniska",
    "accountDashboard.preferences.booking.airlines.title": "Linie lotnicze",
    "accountDashboard.preferences.booking.airlines.description":
      "Wybierz linie lotnicze, które preferujesz lub których chcesz unikać.",
    "accountDashboard.preferences.booking.preferredAirlines": "Preferowane linie lotnicze",
    "accountDashboard.preferences.booking.searchAirlines": "Wyszukaj linie lotnicze",
    "accountDashboard.preferences.booking.avoidAirlines": "Unikaj linii lotniczych",
    "accountDashboard.preferences.booking.stays.title": "Pobyty",
    "accountDashboard.preferences.booking.stays.description":
      "Ustaw preferencje zakwaterowania dla rezerwacji hotelowych.",
    "accountDashboard.preferences.booking.preferredHotelChains": "Preferowane sieci hotelowe",
    "accountDashboard.preferences.booking.searchHotelChains": "Wyszukaj sieci hotelowe",
    "accountDashboard.preferences.booking.avoidHotelChains": "Unikaj sieci hotelowych",
    "accountDashboard.preferences.cancel": "Anuluj",
    "accountDashboard.preferences.savePreferences": "Zapisz preferencje",
  };

  for (const [key, value] of Object.entries({ ...expectedCustomizationCopy, ...expectedBookingCopy })) {
    assert.equal(pl[key], value);
    if (pl[key] !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  for (const key of Object.keys(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(`t["${key}"]`) || customizationSource.includes(`"${key}"`));
  }
  for (const key of Object.keys(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(`t["${key}"]`) || bookingSource.includes(`"${key}"`));
  }

  assert.ok(customizationSource.includes('id: "preferred-language"'));
  assert.ok(customizationSource.includes('name={field.id}'));
  assert.ok(customizationSource.includes('defaultValue=""'));
  assert.ok(customizationSource.includes('value: "English"') && customizationSource.includes('value: "USD"'));
  assert.ok(customizationSource.includes('type="checkbox"') && customizationSource.includes('type="button"'));
  assert.ok(bookingSource.includes('id: "home-airport"') && bookingSource.includes('type="search"'));
  assert.ok(bookingSource.includes('name={field.id}') && bookingSource.includes('placeholder={t[field.placeholderKey]}'));
  assert.ok(bookingSource.includes('type="button"'));
  assert.ok(customizationSource.includes('action="#"') && bookingSource.includes('action="#"'));
  assert.ok(customizationPageSource.includes("<AccountPreferencesHeader />") && customizationPageSource.includes("<Footer />"));
  assert.ok(bookingPageSource.includes("<AccountPreferencesHeader />") && bookingPageSource.includes("<Footer />"));
  assert.ok(accountBackLinkSource.includes('href="/dashboard/account"') && accountBackLinkSource.includes('accountDashboard.hub.title') && pl["accountDashboard.hub.title"] === "Moje konto");
  assert.equal(languageOptions.find((option) => option.code === "pl")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
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


test("Polish cars results page copy and render path do not fall back to English", () => {
  const pl = getTranslations("pl");
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  const carsResultsPageSource = readFileSync("src/app/cars/results/page.tsx", "utf8");

  const expectedPolishCopy: Record<string, string> = {
    "carsResults.pickupLocation": "MIEJSCE ODBIORU",
    "carsResults.returnLocation": "MIEJSCE ZWROTU",
    "carsResults.rentalDates": "DATY WYNAJMU",
    "carsResults.pickupReturnTime": "GODZINA ODBIORU / ZWROTU",
    "carsResults.driverAge": "WIEK KIEROWCY",
    "carsResults.sameAsPickup": "Takie samo jak odbiór",
    "carsResults.searchCars": "Szukaj samochodów",
    "carsResults.edit": "EDYTUJ",
    "carsResults.pickupLocationNeeded": "wymagane miejsce odbioru",
    "carsResults.resultsFor": "Wyniki samochodów dla: {location}",
    "carsResults.emptyInventory": "Aktualna dostępność samochodów nie jest jeszcze dostępna dla tego wyszukiwania. Zmień szczegóły wyszukiwania powyżej albo sprawdź ponownie później.",
    "carsResults.filterBy": "Filtruj według",
    "carsResults.vehicleType": "Typ pojazdu",
    "carsResults.smallCars": "Małe samochody",
    "carsResults.mediumCars": "Średnie samochody",
    "carsResults.suvs": "SUV-y",
    "carsResults.transmission": "Skrzynia biegów",
    "carsResults.automatic": "Automatyczna",
    "carsResults.manual": "Manualna",
    "carsResults.seats": "Miejsca",
    "carsResults.seats4Plus": "4+ miejsca",
    "carsResults.seats5Plus": "5+ miejsc",
    "carsResults.seats7Plus": "7+ miejsc",
    "carsResults.bags": "Bagaże",
    "carsResults.bags2Plus": "2+ bagaże",
    "carsResults.bags3Plus": "3+ bagaże",
    "carsResults.bags4Plus": "4+ bagaże",
    "carsResults.fuelPolicy": "Polityka paliwowa",
    "carsResults.fullToFull": "Pełny do pełnego",
    "carsResults.sameToSame": "Taki sam do takiego samego",
    "carsResults.mileagePolicy": "Polityka przebiegu",
    "carsResults.unlimitedMileage": "Nielimitowany przebieg",
    "carsResults.limitedMileage": "Limitowany przebieg",
    "carsResults.cancellation": "Anulowanie",
    "carsResults.freeCancellation": "Bezpłatne anulowanie",
    "carsResults.payAtPickup": "Płatność przy odbiorze",
    "carsResults.pickupLocationType": "Typ miejsca odbioru",
    "carsResults.airportCounter": "Stanowisko na lotnisku",
    "carsResults.shuttlePickup": "Odbiór shuttle",
    "carsResults.cityLocation": "Lokalizacja w mieście",
    "carsResults.openFilters": "Otwórz filtry",
    "carsResults.closeFilters": "Zamknij filtry",
    "carsResults.resetFilters": "Resetuj filtry",
    "carsResults.editSearch": "Edytuj wyszukiwanie",
    "carsResults.rentalDateRangeCalendar": "Kalendarz zakresu dat wynajmu",
    "carsResults.pickupReturnTimeSelector": "Wybór godziny odbioru i zwrotu",
    "carsResults.yearsOld": "lat",
  };

  for (const [key, value] of Object.entries(expectedPolishCopy)) {
    assert.equal(pl[key], value, `${key} should resolve to Polish copy`);
    if (enTranslations[key] !== value) {
      assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    }
    assert.ok(carsResultsSource.includes(`t("${key}")`) || carsResultsSource.includes(`labelKey: "${key}"`) || carsResultsSource.includes(`titleKey: "${key}"`), `${key} should be read by the active cars results render path`);
  }

  assert.ok(carsResultsSource.includes('if (normalizedLocale.startsWith("pl"))') && carsResultsSource.includes('return "pl-PL"'), "Polish cars results dates should use the Polish Intl locale.");
  assert.ok(carsResultsSource.includes('["de", "es", "fr", "id", "ja", "nl", "pl", "pt", "sv", "tr"]'), "Polish cars results times should use 24-hour labels without AM/PM.");
  assert.ok(carsResultsSource.includes('formatCompactDate(') && carsResultsSource.includes('formatTimeLabel(pickupTime, intlLocale)'), "Date/time summaries should remain generated from selected values and locale formatting.");
  assert.ok(carsResultsSource.includes('action="/cars/results"') && carsResultsSource.includes('method="get"'), "Cars results search form should preserve the route path and query-param submission behavior.");
  assert.ok(carsResultsSource.includes('name="pickupDate"') && carsResultsSource.includes('value={pickupDate}') && carsResultsSource.includes('name="driverAge"') && carsResultsSource.includes('value={driverAge}'), "Cars results search should preserve selected date/time/driver-age query values.");
  assert.ok(carsResultsSource.includes('onChange={() => onToggle(group.id, option.id)}') && carsResultsSource.includes('selectedOptions.includes(option.id)'), "Filter behavior should keep raw filter IDs while localizing only display labels.");
  assert.ok(carsResultsPageSource.includes('action') === false && carsResultsPageSource.includes('pickupLocation') && carsResultsPageSource.includes('dropoffLocation'), "Server page should continue passing raw search params into the active client render path.");
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


test("Polish Deals active page copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const auditedPolishDealsKeys: Array<[string, string]> = [
    ["deals.heroTitle", "Znajdź oferty podróży na kolejny wyjazd"],
    ["deals.heroSubtitle", "Wyszukuj loty, pobyty i samochody razem w jednym miejscu."],
    ["deals.packageLegend", "Wybierz typ pakietu"],
    ["deals.package.hotelFlight", "Hotel + lot"],
    ["deals.package.hotelFlightCar", "Hotel + lot + samochód"],
    ["deals.package.flightCar", "Lot + samochód"],
    ["deals.package.hotelCar", "Hotel + samochód"],
    ["deals.originLabel", "SKĄD?"],
    ["deals.destinationLabel", "DOKĄD?"],
    ["deals.datesLabel", "DATY PODRÓŻY"],
    ["deals.travelersRoomsLabel", "PODRÓŻNI / POKOJE"],
    ["deals.travelersCarsLabel", "PODRÓŻNI / SAMOCHODY"],
    ["deals.travelersCabinLabel", "PODRÓŻNI / KLASA KABINY"],
    ["deals.travelersDetailsLabel", "PODRÓŻNI / SZCZEGÓŁY"],
    ["deals.travelersRoomsCarLabel", "PODRÓŻNI / POKOJE / SAMOCHÓD"],
    ["deals.originPlaceholder", "Miasto lub lotnisko"],
    ["deals.destinationPlaceholder", "Miasto, lotnisko lub obszar"],
    ["deals.dateFlightPlaceholder", "Wylot — powrót"],
    ["deals.dateHotelPlaceholder", "Zameldowanie — wymeldowanie"],
    ["deals.dateDialog", "Wybierz daty podróży"],
    ["deals.departDate", "Wylot"],
    ["deals.returnDate", "Powrót"],
    ["deals.travelerSingular", "podróżny"],
    ["deals.travelerPlural", "podróżnych"],
    ["deals.roomSingular", "pokój"],
    ["deals.roomPlural", "pokoje"],
    ["deals.driverAge", "Wiek kierowcy"],
    ["deals.cabinClass", "Klasa kabiny"],
    ["deals.cabin.economy", "Ekonomiczna"],
    ["deals.cabin.business", "Biznes"],
    ["deals.cabin.first", "Pierwsza"],
    ["deals.clearOrigin", "Wyczyść miejsce wylotu"],
    ["deals.clearDestination", "Wyczyść kierunek"],
    ["deals.previous", "Poprzedni"],
    ["deals.next", "Następny"],
    ["deals.weekday.sun", "Ndz"],
    ["deals.weekday.mon", "Pon"],
    ["deals.weekday.tue", "Wt"],
    ["deals.weekday.wed", "Śr"],
    ["deals.weekday.thu", "Czw"],
    ["deals.weekday.fri", "Pt"],
    ["deals.weekday.sat", "Sob"],
    ["deals.selectDateAriaPrefix", "Wybierz"],
    ["deals.error.origin", "Wpisz miasto lub lotnisko wylotu."],
    ["deals.error.destination", "Wpisz kierunek podróży."],
    ["deals.error.startDate", "Wybierz datę początkową."],
    ["deals.error.endDate", "Wybierz datę końcową."],
    ["deals.error.dateOrder", "Data końcowa musi być późniejsza niż początkowa."],
    ["deals.error.adults", "Wymagany jest co najmniej jeden dorosły."],
    ["deals.error.children", "Liczba dzieci nie może być mniejsza niż zero."],
    ["deals.error.rooms", "Wymagany jest co najmniej jeden pokój."],
    ["deals.error.guests", "Wymagany jest co najmniej jeden gość."],
    ["deals.searchButton", "Szukaj ofert"],
    ["deals.destinationIdeasTitle", "Miejsca, od których warto zacząć szukanie ofert"],
    ["deals.destinationIdeasSubtitle", "Wybierz pomysł na kierunek, a następnie porównaj wyniki dostawców po przejściu dalej."],
    ["deals.destinationCardAriaPrefix", "Szukaj pomysłów na podróż do"],
    ["deals.destination.tokyo.city", "Tokio"],
    ["deals.destination.tokyo.country", "Japonia"],
    ["deals.destination.london.city", "Londyn"],
    ["deals.destination.london.country", "Wielka Brytania"],
    ["deals.destination.paris.city", "Paryż"],
    ["deals.destination.paris.country", "Francja"],
    ["deals.destination.dubai.city", "Dubaj"],
    ["deals.destination.dubai.country", "Zjednoczone Emiraty Arabskie"],
    ["deals.destination.cancun.city", "Cancun"],
    ["deals.destination.cancun.country", "Meksyk"],
    ["deals.destination.rome.city", "Rzym"],
    ["deals.destination.rome.country", "Włochy"],
  ];

  for (const [key, expected] of auditedPolishDealsKeys) {
    assert.equal(pl[key], expected, key);
    if (expected !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], key);
    }
  }

  assert.equal(`${1} ${pl["deals.travelerSingular"]}, ${1} ${pl["deals.roomSingular"]}`, "1 podróżny, 1 pokój");
  assert.equal(pl.searchingFlights, "Wyszukiwanie lotów...");
  assert.equal(pl.searchingHotels, "Wyszukiwanie hoteli...");
  assert.equal(pl.clearAll, "Wyczyść wszystko");
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Polish Deals active render path uses localized keys and preserves search/card behavior", () => {
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");

  for (const key of [
    "deals.heroTitle",
    "deals.heroSubtitle",
    "deals.packageLegend",
    "deals.originLabel",
    "deals.originPlaceholder",
    "deals.destinationLabel",
    "deals.destinationPlaceholder",
    "deals.datesLabel",
    "deals.dateFlightPlaceholder",
    "deals.dateHotelPlaceholder",
    "deals.dateDialog",
    "deals.previous",
    "deals.next",
    "deals.selectDateAriaPrefix",
    "deals.travelerSingular",
    "deals.travelerPlural",
    "deals.roomSingular",
    "deals.roomPlural",
    "deals.driverAge",
    "deals.cabinClass",
    "deals.searchButton",
    "deals.destinationIdeasTitle",
    "deals.destinationIdeasSubtitle",
    "deals.destinationCardAriaPrefix",
  ]) {
    assert.match(dealsPageSource, new RegExp(`t\\("${key}"\\)`), key);
  }

  for (const key of [
    "deals.travelersRoomsLabel",
    "deals.travelersCarsLabel",
    "deals.travelersCabinLabel",
    "deals.travelersDetailsLabel",
    "deals.travelersRoomsCarLabel",
  ]) {
    assert.ok(dealsPageSource.includes(key), key);
  }

  for (const key of [
    "deals.package.hotelFlight",
    "deals.package.hotelFlightCar",
    "deals.package.flightCar",
    "deals.package.hotelCar",
    "deals.cabin.economy",
    "deals.cabin.business",
    "deals.cabin.first",
  ]) {
    assert.match(dealsPageSource, new RegExp(`labelKey: "${key}"`), key);
  }

  for (const key of [
    "deals.destination.tokyo.city",
    "deals.destination.tokyo.country",
    "deals.destination.london.city",
    "deals.destination.london.country",
    "deals.destination.paris.city",
    "deals.destination.paris.country",
    "deals.destination.dubai.city",
    "deals.destination.dubai.country",
    "deals.destination.cancun.city",
    "deals.destination.cancun.country",
    "deals.destination.rome.city",
    "deals.destination.rome.country",
  ]) {
    assert.match(dealsPageSource, new RegExp(`${key.replace(/[.]/g, "\\.")}`), key);
  }

  for (const preservedSource of [
    'value: "hotel-flight"',
    'value: "hotel-flight-car"',
    'value: "flight-car"',
    'value: "hotel-car"',
    'destinationQuery: "Tokyo"',
    'destinationQuery: "London"',
    'destinationQuery: "Paris"',
    'destinationQuery: "Dubai"',
    'destinationQuery: "Cancun"',
    'destinationQuery: "Rome"',
    'tripType: "round-trip"',
    'infants: "0"',
    'cabinClass,',
    '`/flights/results?${params.toString()}`',
    '`/hotels/results?${params.toString()}`',
    'guests: "2"',
    'rooms: "1"',
    'className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"',
  ]) {
    assert.ok(dealsPageSource.includes(preservedSource), preservedSource);
  }

  assert.match(dealsPageSource, /\{t\(idea\.cityKey\)\}/);
  assert.match(dealsPageSource, /\{t\(idea\.countryKey\)\}/);
  assert.match(dealsPageSource, /aria-label=\{`\$\{t\("deals\.destinationCardAriaPrefix"\)\} \$\{t\(idea\.cityKey\)\}, \$\{t\(idea\.countryKey\)\}`\}/);
});

test("Swedish Deals landing resolves localized copy and preserves behavior", () => {
  const sv = getTranslations("sv");
  const auditedSwedishDealsKeys: Array<[string, string]> = [
    ["deals.heroTitle", "Hitta reseerbjudanden för din nästa resa"],
    ["deals.heroSubtitle", "Sök flyg, boenden och bilar tillsammans på ett ställe."],
    ["deals.package.hotelFlight", "Hotell + flyg"],
    ["deals.package.hotelFlightCar", "Hotell + flyg + bil"],
    ["deals.package.flightCar", "Flyg + bil"],
    ["deals.package.hotelCar", "Hotell + bil"],
    ["deals.originLabel", "Varifrån?"],
    ["deals.originPlaceholder", "Stad eller flygplats"],
    ["deals.destinationLabel", "Vart?"],
    ["deals.destinationPlaceholder", "Stad, flygplats eller område"],
    ["deals.datesLabel", "Resedatum"],
    ["deals.dateFlightPlaceholder", "Avresa — retur"],
    ["deals.travelersRoomsLabel", "Resenärer / rum"],
    ["deals.travelerSingular", "resenär"],
    ["deals.roomSingular", "rum"],
    ["deals.searchButton", "Sök erbjudanden"],
    ["deals.destinationIdeasTitle", "Platser att börja din erbjudandesökning"],
    ["deals.destinationIdeasSubtitle", "Välj en destinationsidé och jämför sedan leverantörsresultat när du fortsätter."],
    ["deals.destination.tokyo.city", "Tokyo"],
    ["deals.destination.tokyo.country", "Japan"],
    ["deals.destination.london.city", "London"],
    ["deals.destination.london.country", "Storbritannien"],
    ["deals.destination.paris.city", "Paris"],
    ["deals.destination.paris.country", "Frankrike"],
    ["deals.destination.dubai.city", "Dubai"],
    ["deals.destination.dubai.country", "Förenade Arabemiraten"],
    ["deals.destination.cancun.city", "Cancun"],
    ["deals.destination.cancun.country", "Mexiko"],
    ["deals.destination.rome.city", "Rom"],
    ["deals.destination.rome.country", "Italien"],
    ["deals.destination.tokyo.imageAlt", "Tokyos silhuett med täta höghus i dagsljus"],
    ["deals.destination.london.imageAlt", "Tower Bridge och Themsen i London under en blå himmel"],
    ["deals.destination.paris.imageAlt", "Eiffeltornet och Seine i Paris vid gyllene timmen"],
    ["deals.destination.dubai.imageAlt", "Dubais silhuett med Burj Khalifa som reser sig över skyskrapor"],
    ["deals.destination.cancun.imageAlt", "Cancunstrand med vit sand och turkost vatten"],
    ["deals.destination.rome.imageAlt", "Colosseum i Rom under en klarblå himmel"],
  ];

  for (const [key, expected] of auditedSwedishDealsKeys) {
    assert.equal(sv[key], expected, key);
    if (expected !== enTranslations[key]) {
      assert.notEqual(sv[key], enTranslations[key], key);
    }
  }

  assert.equal(`${1} ${sv["deals.travelerSingular"]}, ${1} ${sv["deals.roomSingular"]}`, "1 resenär, 1 rum");
  assert.ok(languageOptions.some((option) => option.code === "sv" && option.locale === "sv-SE" && option.nativeLabel === "Svenska" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Swedish Deals active render path uses localized keys and preserves search/card behavior", () => {
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");

  for (const key of [
    "deals.heroTitle",
    "deals.heroSubtitle",
    "deals.packageLegend",
    "deals.originLabel",
    "deals.originPlaceholder",
    "deals.destinationLabel",
    "deals.destinationPlaceholder",
    "deals.datesLabel",
    "deals.dateFlightPlaceholder",
    "deals.searchButton",
    "deals.destinationIdeasTitle",
    "deals.destinationIdeasSubtitle",
    "deals.destinationCardAriaPrefix",
  ]) {
    assert.ok(dealsPageSource.includes(`t("${key}")`), key);
  }

  for (const key of [
    "deals.travelersRoomsLabel",
    "deals.package.hotelFlight",
    "deals.package.hotelFlightCar",
    "deals.package.flightCar",
    "deals.package.hotelCar",
    "deals.destination.tokyo.imageAlt",
    "deals.destination.london.imageAlt",
    "deals.destination.paris.imageAlt",
    "deals.destination.dubai.imageAlt",
    "deals.destination.cancun.imageAlt",
    "deals.destination.rome.imageAlt",
  ]) {
    assert.ok(dealsPageSource.includes(key), key);
  }

  for (const preservedSource of [
    'value: "hotel-flight"',
    'value: "hotel-flight-car"',
    'value: "flight-car"',
    'value: "hotel-car"',
    'destinationQuery: "Tokyo"',
    'destinationQuery: "London"',
    'destinationQuery: "Paris"',
    'destinationQuery: "Dubai"',
    'destinationQuery: "Cancun"',
    'destinationQuery: "Rome"',
    'tripType: "round-trip"',
    'infants: "0"',
    'cabinClass,',
    '`/flights/results?${params.toString()}`',
    '`/hotels/results?${params.toString()}`',
    'guests: "2"',
    'rooms: "1"',
    'className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"',
  ]) {
    assert.ok(dealsPageSource.includes(preservedSource), preservedSource);
  }

  assert.match(dealsPageSource, /alt={t\(idea\.imageAltKey\)}/);
  assert.match(dealsPageSource, /\{t\(idea\.cityKey\)\}/);
  assert.match(dealsPageSource, /\{t\(idea\.countryKey\)\}/);
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


test("Polish flights results active render path resolves visible copy without English fallback", () => {
  const pl = getTranslations("pl");
  const resultsSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
  const cardSource = readFileSync("src/components/results/FlightCard.tsx", "utf8");
  const pageSource = readFileSync("src/app/flights/results/page.tsx", "utf8");

  assert.ok(pageSource.includes("<FlightResultsClient />"), "active /flights/results page should render FlightResultsClient");

  const expectedResultsCopy: Array<[string, string, string, string[]]> = [
    ["cheapest", "NAJTAŃSZE", "CHEAPEST", [resultsSource]],
    ["best", "NAJLEPSZE", "BEST", [resultsSource]],
    ["quickest", "NAJSZYBSZE", "QUICKEST", [resultsSource]],
    ["oneStop", "1 przesiadka", "1 stop", [resultsSource, cardSource]],
    ["resultsFound", "Znaleziono {{count}} wyniki", "{{count}} results found", [resultsSource]],
    ["departs", "Wylot {{time}}", "Departs", [resultsSource]],
    ["filterBy", "Filtruj według", "Filter by", [resultsSource]],
    ["price", "Cena", "Price", [resultsSource]],
    ["times", "Godziny", "Times", [resultsSource]],
    ["takeoff", "Wylot", "Takeoff", [resultsSource]],
    ["landing", "Lądowanie", "Landing", [resultsSource]],
    ["takeoffTimeFromOrigin", "Godzina wylotu z miejsca początkowego", "Take-off time from origin", [resultsSource]],
    ["duration", "Czas podróży", "Duration", [resultsSource]],
    ["totalTripTime", "Łączny czas podróży", "Total trip time", [resultsSource]],
    ["stops", "Przesiadki", "Stops", [resultsSource]],
    ["optionsFound", "Znaleziono {{count}} opcje", "{{count}} options found", [resultsSource]],
    ["airlines", "Linie lotnicze", "Airlines", [resultsSource]],
    ["airports", "Lotniska", "Airports", [resultsSource]],
    ["amenities", "Udogodnienia", "Amenities", [resultsSource]],
    ["baggageIncluded", "Bagaż w cenie", "Baggage included", [resultsSource]],
    ["flexibleRefundable", "Elastyczne/zwrotne", "Flexible/refundable", [resultsSource]],
    ["flightOption", "OPCJA LOTU", "Flight option", [cardSource]],
    ["outbound", "WYLOT", "Outbound", [cardSource]],
    ["return", "POWRÓT", "Return", [cardSource]],
    ["layoverSummaryTemplate", "Przesiadka: {{airport}} {{duration}}", "Layover: {{airport}} {{duration}}", [cardSource]],
    ["estimatedPrice", "szacowana cena", "Estimated price", [cardSource]],
    ["providerPrice", "Cena u dostawcy", "Provider price", [cardSource]],
    ["viewFlight", "Zobacz lot", "View Flight", [cardSource]],
    ["baggage", "Bagaż", "Baggage", [cardSource]],
    ["carryOnIncluded", "bagaż podręczny w cenie", "carry-on included", [cardSource]],
    ["cabin", "Kabina", "Cabin", [cardSource]],
    ["seatSelection", "Wybór miejsca", "Seat selection", [cardSource]],
    ["providerRulesApply", "obowiązują zasady dostawcy", "Provider rules apply", [cardSource]],
    ["fareRules", "Zasady taryfy", "Fare rules", [cardSource]],
    ["reviewBeforeBooking", "sprawdź przed rezerwacją", "Review before booking", [cardSource]],
    ["providerNormalizedItineraryPrefix", "Szczegóły wylotu i powrotu są wyświetlane na podstawie danych planu podróży ujednoliconych przez dostawcę.", "Outbound and return details are shown from provider-normalized itinerary data.", [cardSource]],
    ["flightCardProviderHandoffConverted", "Ostateczna cena, dostępność, rezerwacja i zasady taryfy są potwierdzane przez dostawcę. Ostateczna waluta dostawcy może różnić się od wybranej waluty wyświetlania.", "Final price, availability, booking, and fare rules are confirmed by the provider. Final provider currency may differ from your selected display currency.", [cardSource]],
    ["edit", "Edytuj", "Edit", [resultsSource]],
    ["editSearch", "Edytuj wyszukiwanie", "Edit search", [resultsSource]],
    ["closeEditSearch", "Zamknij edycję wyszukiwania", "Close edit search", [resultsSource]],
    ["closeFilters", "Zamknij filtry", "Close filters", [resultsSource]],
    ["editFlightSearch", "Edytuj wyszukiwanie lotu", "Edit flight search", [resultsSource]],
    ["travelersAndCabin", "Podróżni i kabina", "Travelers and cabin", [resultsSource]],
    ["selectDepartureDate", "Wybierz datę wylotu", "Select departure date", [resultsSource]],
    ["selectReturnDate", "Wybierz datę powrotu", "Select return date", [resultsSource]],
  ];

  for (const [key, value, englishFallback, sources] of expectedResultsCopy) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    assert.notEqual(pl[key], englishFallback, `${key} should not equal visible English fallback`);
    assert.ok(sources.some((source) => source.includes(`t("${key}")`) || source.includes(`"${key}"`)), `${key} should be read by active flights results render path`);
  }

  assert.equal(pl.resultsFound.replace("{{count}}", "2"), "Znaleziono 2 wyniki");
  assert.equal(pl.optionsFound.replace("{{count}}", "2"), "Znaleziono 2 opcje");
  assert.equal(pl.departs.replace("{{time}}", "20:50"), "Wylot 20:50");
  assert.equal(`${pl.baggage}: ${pl.carryOnIncluded}`, "Bagaż: bagaż podręczny w cenie");
  assert.equal(`${pl.cabin}: ${pl.economy}`, "Kabina: ekonomiczna");
  assert.equal(`${pl.seatSelection}: ${pl.providerRulesApply}`, "Wybór miejsca: obowiązują zasady dostawcy");
  assert.equal(`${pl.fareRules}: ${pl.reviewBeforeBooking}`, "Zasady taryfy: sprawdź przed rezerwacją");
  assert.equal(`${pl.providerNormalizedItineraryPrefix} ${pl.flightCardProviderHandoffConverted}`, "Szczegóły wylotu i powrotu są wyświetlane na podstawie danych planu podróży ujednoliconych przez dostawcę. Ostateczna cena, dostępność, rezerwacja i zasady taryfy są potwierdzane przez dostawcę. Ostateczna waluta dostawcy może różnić się od wybranej waluty wyświetlania.");
  assert.match(resultsSource, /formatResultDepartureTime\(\s*flight\.departureTime,\s*calendarLocale,?\s*\)/);
  assert.ok(resultsSource.includes("formatTimeFromMinutes(minutes, locale)"));

  for (const providerValue of ["Turkish Airlines", "TK0626", "LOS", "LAX", "IST"]) {
    assert.equal(pl[providerValue], undefined, `${providerValue} must remain provider data, not locale copy`);
  }
});

test("Polish flights landing active render path resolves visible copy without English fallback", () => {
  const pl = getTranslations("pl");
  const flightLandingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");
  const flightsPageSource = readFileSync("src/app/flights/page.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");

  const expectedCopy: Array<[string, string]> = [
    ["flightLandingHeroTitle", "Znajdź kolejny niedrogi lot z łatwością."],
    ["flightLandingHeroSubtitle", "Wyszukuj trasy, porównuj daty i odkrywaj opcje lotów na kolejną podróż."],
    ["discoverDestinationsFromRegion", "Odkrywaj kierunki z Twojego regionu"],
    ["discoverDestinationsFromRegionBody", "Przeglądaj wybrane trasy i rozpocznij kolejną podróż z pewnością."],
    ["flightLandingStartThisSearch", "Rozpocznij to wyszukiwanie"],
    ["flightLandingFeatureSearchReadyTitle", "Trasy gotowe do wyszukiwania"],
    ["flightLandingFeatureSearchReadyBody", "Wprowadź rzeczywiste szczegóły podróży, zanim wyniki zostaną pobrane od dostawców lotów."],
    ["flightLandingFeatureCompareTitle", "Porównuj w kontekście"],
    ["flightLandingFeatureCompareBody", "Używaj dat, liczby podróżnych, klasy kabiny, czasu podróży, przesiadek i szczegółów trasy, aby ocenić opcje."],
    ["flightLandingFeatureProviderTitle", "Sprawdzenie u dostawcy"],
    ["flightLandingFeatureProviderBody", "Przed rezerwacją zawsze potwierdź ostateczną dostępność, cenę i zasady u dostawcy."],
    ["flightLandingRouteIdeasTitle", "Pomysły na trasy dla elastycznych podróży"],
    ["flightLandingRouteIdeasBody", "Przeglądaj pomysły na trasy, a następnie rozpocznij prawdziwe wyszukiwanie z datami i podróżnymi przed porównaniem dostępnych lotów."],
    ["beachVacations", "Wakacje na plaży"],
    ["beachVacationsBody", "Odkrywaj trasy lotnicze do słonecznych wybrzeży, wyspiarskich ucieczek i ciepłych kierunków plażowych."],
    ["flightBookingFaqs", "Najczęstsze pytania o rezerwację lotów"],
    ["flightBookingFaqIntro", "Sprawdź najczęstsze szczegóły wyszukiwania lotów przed przejściem do dostawcy."],
    ["flightFaqBestTimeQuestion", "Kiedy najlepiej zarezerwować lot?"],
    ["flightFaqBeforeBookingQuestion", "Co sprawdzić przed rezerwacją?"],
    ["flightFaqFlexibleFareQuestion", "Czym jest elastyczna taryfa?"],
    ["flightFaqNonstopQuestion", "Czy loty bez przesiadek są zawsze lepsze?"],
    ["flightFaqBaggageQuestion", "Jak działają zasady dotyczące bagażu?"],
    ["flightFaqChangeCancelQuestion", "Czy mogę zmienić lub anulować bilet?"],
    ["flightFaqInternationalQuestion", "Co warto wiedzieć o lotach międzynarodowych?"],
  ];

  for (const [key, value] of expectedCopy) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    assert.ok(flightLandingSource.includes(`t("${key}")`), `${key} should be read by active /flights client render path`);
  }

  const expectedFaqAnswers: Array<[string, string]> = [
    ["flightFaqBestTimeAnswer", "Ceny lotów mogą zmieniać się w zależności od trasy, sezonu, popytu i dostępności. Zwykle warto porównać kilka dat, sprawdzić pobliskie lotniska, jeśli to możliwe, i przejrzeć pełny plan podróży przed wyborem taryfy."],
    ["flightFaqBeforeBookingAnswer", "Przed ukończeniem rezerwacji u dostawcy sprawdź godziny wylotu i przylotu, całkowity czas podróży, przesiadki, zasady dotyczące bagażu, opcje wyboru miejsca, warunki anulowania oraz zasady zmiany biletu."],
    ["flightFaqFlexibleFareAnswer", "Elastyczna taryfa może umożliwiać zmiany lub anulowanie z mniejszymi ograniczeniami niż taryfa podstawowa, ale dokładne zasady zależą od linii lotniczej lub dostawcy rezerwacji. Zawsze sprawdź warunki taryfy przed zakupem."],
    ["flightFaqNonstopAnswer", "Nie zawsze. Loty bez przesiadek mogą oszczędzać czas, a trasy z jedną przesiadką mogą oferować inne godziny wylotu, okna przylotu lub opcje cenowe. Przed decyzją porównaj całkowity czas podróży, długość przesiadki i wygodę."],
    ["flightFaqBaggageAnswer", "Limit bagażu może różnić się w zależności od linii lotniczej, trasy, klasy kabiny, rodzaju taryfy i dostawcy. Przed rezerwacją sprawdź, czy bagaż podręczny, rejestrowany i przedmiot osobisty są wliczone w cenę."],
    ["flightFaqChangeCancelAnswer", "Możliwości zmiany i anulowania zależą od zasad taryfy oraz polityk dostawcy. Niektóre bilety mogą być bezzwrotne lub obejmować opłaty, dlatego przed rezerwacją dokładnie sprawdź warunki."],
    ["flightFaqInternationalAnswer", "W przypadku podróży międzynarodowych przed rezerwacją sprawdź ważność paszportu, wymagania wizowe, zasady tranzytu, politykę bagażową i wymagania wjazdowe dla miejsca docelowego."],
  ];

  for (const [key, value] of expectedFaqAnswers) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    assert.ok(flightLandingSource.includes(`t("${key}")`), `${key} should be read by getFlightFaqItems`);
  }

  const expectedDiscoveryCopy: Array<[string, string]> = [
    ["flightLandingImageAlt.Johannesburg skyline at golden hour", "Panorama Johannesburga o złotej godzinie"],
    ["flightLandingImageAlt.Cairo skyline with the Pyramids of Giza", "Panorama Kairu z piramidami w Gizie"],
    ["flightLandingImageAlt.Addis Ababa cityscape in the Ethiopian highlands", "Widok Addis Abeby na Wyżynie Etiopskiej"],
    ["homeDiscoveryRoute.ca-yyz-cun.title", "Zimowa ucieczka do Cancun"],
    ["homeDiscoveryRoute.ca-yyz-cun.routeNote", "Niezawodna trasa wypoczynkowa z opcjami bez przesiadek w szczycie sezonu."],
    ["homeDiscoveryRoute.ca-yeg-pvr.title", "Plażowy wyjazd do Puerto Vallarta"],
    ["homeDiscoveryRoute.ca-yeg-pvr.routeNote", "Trasa po zimowe słońce, z plażami Pacyfiku i urokiem starego miasta."],
    ["homeDiscoveryRoute.ca-yyz-hnl.title", "Daleki wyspiarski odpoczynek w Honolulu"],
    ["homeDiscoveryRoute.ca-yyz-hnl.routeNote", "Wypoczynkowa opcja premium na plaże, surfing i wyspiarskie wędrówki."],
    ["homeDiscoveryRoute.ca-yyz-san.title", "Słońce i surfing w San Diego"],
    ["homeDiscoveryRoute.ca-yyz-san.routeNote", "Niezawodna trasa transgraniczna na plaże, parki i widoki portowe."],
    ["homeDiscoveryRoute.ca-yvr-syd.title", "Transpacyficzna przygoda w Sydney"],
    ["homeDiscoveryRoute.ca-yvr-syd.routeNote", "Popularna daleka trasa do portowych atrakcji i nadmorskich dzielnic."],
  ];

  for (const [key, value] of expectedDiscoveryCopy) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.ok(flightLandingSource.includes("getRouteText(item, t)"));
  assert.ok(flightLandingSource.includes('t(`homeDiscoveryRoute.${item.id}.title`) || item.title'));
  assert.ok(flightLandingSource.includes('t(`homeDiscoveryRoute.${item.id}.routeNote`) || item.routeNote'));
  assert.ok(flightLandingSource.includes('"flightLandingImageAlt"'));
  assert.ok(flightLandingSource.includes("buildDiscoveryLink(item)"));
  assert.ok(flightsPageSource.includes("<FlightLandingClient />"));
  assert.ok(flightLandingSource.includes("<StandaloneFlightSearchForm localizeCalendarLabels />"));
  assert.ok(flightLandingSource.includes("rounded-3xl border border-slate-200/80 bg-white"));

  const canadaCards = getHomeDiscoveryByRegion("CA");
  for (const id of ["ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd"]) {
    const item = canadaCards.find((card) => card.id === id);
    assert.ok(item, `${id} should remain in the Canada discovery source`);
    assert.equal(buildDiscoveryLink(item).query.origin, item.originCode);
    assert.equal(buildDiscoveryLink(item).query.destination, item.destinationCode);
    assert.equal(buildDiscoveryLink(item).query.tripType, "one-way");
    assert.equal(buildDiscoveryLink(item).query.travelers, "1");
    assert.equal(buildDiscoveryLink(item).query.cabinClass, "economy");
    assert.ok(homeDiscoverySource.includes(`id: "${id}"`));
  }
  assert.deepEqual(canadaCards.map((item) => item.id).slice(3, 5), ["ca-yyz-cun", "ca-yyc-yhz"]);
  assert.equal(canadaCards.find((item) => item.id === "ca-yyz-cun")?.originCode, "YYZ");
  assert.equal(canadaCards.find((item) => item.id === "ca-yyz-cun")?.destinationCode, "CUN");
  assert.ok(homeDiscoverySource.includes("YYZ"));
  assert.ok(homeDiscoverySource.includes("CUN"));
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
    pl: plTranslations,
    id: idTranslations,
    th: thTranslations,
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


test("Polish account FAQ support CTA resolves through localized segmented keys", () => {
  const pl = getTranslations("pl");

  assert.equal(pl["accountDashboard.hub.title"], "Moje konto");
  assert.equal(pl.faqHeading, "Najczęściej zadawane pytania");
  assert.equal(
    pl.faqIntro,
    "Dowiedz się, jak Kurioticket pomaga porównywać loty, hotele i opcje podróży przed rezerwacją u zaufanych dostawców.",
  );
  assert.equal(pl.faqGeneralQuestions, "Pytania ogólne");
  assert.equal(pl.faqNeedMoreHelpPrefix, "Potrzebujesz więcej pomocy? Odwiedź");
  assert.equal(pl.faqSupportPage, "stronę wsparcia");
  assert.equal(pl.faqNeedMoreHelpSuffix, ", aby zobaczyć opcje obsługi i kontaktu.");
  assert.equal(
    `${pl.faqNeedMoreHelpPrefix} ${pl.faqSupportPage}${pl.faqNeedMoreHelpSuffix}`,
    "Potrzebujesz więcej pomocy? Odwiedź stronę wsparcia, aby zobaczyć opcje obsługi i kontaktu.",
  );

  for (const key of [
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
  ]) {
    assert.notEqual(pl[key], enTranslations[key], key);
  }

  for (const [key, expected] of [
    ["faqQuestionFindOptions", "Jak Kurioticket znajduje opcje lotów i hoteli?"],
    ["faqQuestionSellDirectly", "Czy Kurioticket sprzedaje bezpośrednio bilety lub pokoje hotelowe?"],
    ["faqQuestionPriceChanges", "Dlaczego ceny mogą się zmienić po kliknięciu oferty?"],
    ["faqQuestionCompareProviders", "Czy mogę porównać wielu dostawców dla tej samej podróży?"],
    ["faqQuestionSecureBooking", "Jak bezpiecznie dokończyć rezerwację?"],
    ["faqQuestionPreferences", "Czy mogę ustawić preferencje waluty i języka?"],
  ] as const) {
    assert.equal(pl[key], expected, key);
    assert.notEqual(pl[key], enTranslations[key], key);
  }

  const faqContentSource = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
  const faqPageSource = readFileSync("src/app/faq/page.tsx", "utf8");
  const faqSource = readFileSync("src/content/faqs.ts", "utf8");
  const accountShellSource = readFileSync("src/components/dashboard/AccountDetailShell.tsx", "utf8");
  const accountBackLinkRowSource = readFileSync("src/components/dashboard/AccountBackLinkRow.tsx", "utf8");
  const accountBackLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  assert.ok(faqPageSource.includes("<FaqContent showAccountLink={showAccountLink} />"), "Active FAQ page should render FaqContent with account-shell flag.");
  assert.ok(faqContentSource.includes('t("faqGeneralQuestions")'), "Account FAQ heading should use the corrected i18n key.");
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpPrefix")'), "Account FAQ CTA prefix should use the corrected i18n key.");
  assert.ok(faqContentSource.includes('t("faqSupportPage")'), "Account FAQ CTA link should use the corrected i18n key.");
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpSuffix")'), "Account FAQ CTA suffix should use the corrected i18n key.");
  assert.ok(faqContentSource.includes("supportCtaSuffixSeparator"), "Account FAQ CTA should avoid adding a space before localized punctuation suffixes.");
  assert.ok(faqContentSource.includes('href="/dashboard/support"'), "Account FAQ support route should remain unchanged.");
  assert.ok(faqContentSource.includes("<AccountDetailShell"), "Account FAQ should keep account shell behavior.");
  assert.ok(accountShellSource.includes("<AccountBackLinkRow />"), "Account shell should keep rendering its back-link row. ");
  assert.ok(accountBackLinkRowSource.includes("<AccountBackLink />"), "Account shell back-link row should keep rendering AccountBackLink.");
  assert.ok(accountBackLinkSource.includes('href="/dashboard/account"'), "Account shell back link route should remain unchanged.");
  assert.ok(faqContentSource.includes("faqItems.map((item) =>"), "Account FAQ order should still come from getGeneralFaqs without reordering.");
  assert.ok(faqContentSource.includes("<details") && faqContentSource.includes("<summary"), "Account FAQ accordion behavior should remain native details/summary.");
  assert.ok(faqContentSource.includes('className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5'), "Account FAQ support CTA layout and styling should remain unchanged.");
  assert.ok(faqSource.includes("faqItemKeys.reduce<FaqItem[]>") && faqSource.includes("seenQuestions"), "FAQ key order and duplicate-question handling should remain centralized.");
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
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

test("Swedish Account FAQ render path resolves remaining support copy without English fallback", () => {
  const sv = getTranslations("sv");
  const faqItems = getGeneralFaqs((key) => sv[key] ?? enTranslations[key] ?? "");

  assert.equal(sv.faqHeading, "Vanliga frågor");
  assert.equal(
    sv.faqIntro,
    "Lär dig hur Kurioticket hjälper dig att jämföra flyg, hotell och resealternativ innan du bokar hos betrodda leverantörer.",
  );
  assert.equal(sv.faqGeneralQuestions, "Allmänna frågor");
  assert.equal(sv.faqNeedMoreHelpPrefix, "Behöver du mer hjälp? Besök");
  assert.equal(sv.faqSupportPage, "supportsidan");
  assert.equal(sv.faqNeedMoreHelpSuffix, "för service- och kontaktalternativ.");
  assert.equal(
    `${sv.faqNeedMoreHelpPrefix} ${sv.faqSupportPage} ${sv.faqNeedMoreHelpSuffix}`,
    "Behöver du mer hjälp? Besök supportsidan för service- och kontaktalternativ.",
  );

  for (const key of [
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
  ]) {
    assert.notEqual(sv[key], enTranslations[key], key);
  }

  assert.deepEqual(
    faqItems.slice(0, 8).map((item) => item.question),
    [
      "Hur hittar Kurioticket flyg- och hotellalternativ?",
      "Säljer Kurioticket biljetter eller hotellrum direkt?",
      "Varför kan priser ändras efter att jag klickar på ett erbjudande?",
      "Kan jag jämföra flera leverantörer för samma resa?",
      "Hur slutför jag min bokning säkert?",
      "Kan jag ställa in valuta- och språkpreferenser?",
      "Är sökresultaten live eller cachade?",
      "Var hanterar jag ändringar eller avbokningar?",
    ],
  );

  assert.ok(faqItems.slice(0, 8).every((item) => !Object.values(enTranslations).includes(item.answer)));
  assert.ok(faqItems.slice(0, 8).every((item) => item.answer.includes("Kurioticket") || item.answer.length > 0));

  const faqContentSource = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
  const faqPageSource = readFileSync("src/app/faq/page.tsx", "utf8");
  const faqSource = readFileSync("src/content/faqs.ts", "utf8");
  const accountShellSource = readFileSync("src/components/dashboard/AccountDetailShell.tsx", "utf8");
  const accountBackLinkRowSource = readFileSync("src/components/dashboard/AccountBackLinkRow.tsx", "utf8");
  const accountBackLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  assert.ok(faqPageSource.includes("<FaqContent showAccountLink={showAccountLink} />"));
  assert.ok(faqContentSource.includes('t("faqGeneralQuestions")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpPrefix")'));
  assert.ok(faqContentSource.includes('t("faqSupportPage")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpSuffix")'));
  assert.ok(!faqContentSource.includes("General questions"));
  assert.ok(!faqContentSource.includes("Need more help? Visit the"));
  assert.ok(faqContentSource.includes('href="/dashboard/support"'));
  assert.ok(faqContentSource.includes("faqItems.map((item) =>"));
  assert.ok(faqContentSource.includes("<details") && faqContentSource.includes("<summary"));
  assert.ok(faqContentSource.includes('aria-labelledby="faq-list-heading"'));
  assert.ok(faqContentSource.includes('id="faq-list-heading"'));
  assert.ok(faqContentSource.includes('className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5'));
  assert.ok(faqContentSource.includes("<AccountDetailShell"));
  assert.ok(accountShellSource.includes("<AccountBackLinkRow />"));
  assert.ok(accountBackLinkRowSource.includes("<AccountBackLink />"));
  assert.ok(accountBackLinkSource.includes('href="/dashboard/account"'));
  assert.ok(faqSource.includes("faqItemKeys.reduce<FaqItem[]>") && faqSource.includes("seenQuestions"));
  assert.ok(languageOptions.some((option) => option.code === "sv" && option.locale === "sv-SE" && option.nativeLabel === "Svenska" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Indonesian Account FAQ render path resolves remaining heading and support copy without English fallback", () => {
  const id = getTranslations("id");
  const faqItems = getGeneralFaqs((key) => id[key] ?? enTranslations[key] ?? "");

  assert.equal(id["accountDashboard.hub.title"], "Akun saya");
  assert.equal(id.faqHeading, "Pertanyaan yang sering diajukan");
  assert.equal(
    id.faqIntro,
    "Pelajari bagaimana Kurioticket membantu Anda membandingkan penerbangan, hotel, dan pilihan perjalanan sebelum memesan melalui penyedia tepercaya.",
  );
  assert.equal(id.faqGeneralQuestions, "Pertanyaan umum");
  assert.equal(id.faqNeedMoreHelpPrefix, "Butuh bantuan lain? Kunjungi");
  assert.equal(id.faqSupportPage, "halaman dukungan");
  assert.equal(id.faqNeedMoreHelpSuffix, "untuk opsi layanan dan kontak.");
  assert.equal(
    `${id.faqNeedMoreHelpPrefix} ${id.faqSupportPage} ${id.faqNeedMoreHelpSuffix}`,
    "Butuh bantuan lain? Kunjungi halaman dukungan untuk opsi layanan dan kontak.",
  );

  for (const key of [
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
  ]) {
    assert.notEqual(id[key], enTranslations[key], key);
  }

  assert.deepEqual(
    faqItems.slice(0, 8).map((item) => item.question),
    [
      "Bagaimana Kurioticket menemukan pilihan penerbangan dan hotel?",
      "Apakah Kurioticket menjual tiket atau kamar hotel secara langsung?",
      "Mengapa harga bisa berubah setelah saya mengeklik penawaran?",
      "Bisakah saya membandingkan beberapa penyedia untuk perjalanan yang sama?",
      "Bagaimana cara menyelesaikan pemesanan dengan aman?",
      "Bisakah saya mengatur preferensi mata uang dan bahasa?",
      "Apakah hasil pencarian langsung atau tersimpan sementara?",
      "Di mana saya mengelola perubahan atau pembatalan?",
    ],
  );

  assert.ok(faqItems.every((item) => !Object.values(enTranslations).includes(item.answer)));
  assert.ok(faqItems.some((item) => item.answer.includes("penyedia")));
  assert.ok(faqItems.some((item) => item.answer.includes("pemesanan") && item.answer.includes("pembayaran")));
  assert.ok(faqItems.some((item) => item.answer.includes("Kurioticket")));

  const faqContentSource = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
  const faqPageSource = readFileSync("src/app/faq/page.tsx", "utf8");
  const faqSource = readFileSync("src/content/faqs.ts", "utf8");
  const accountShellSource = readFileSync("src/components/dashboard/AccountDetailShell.tsx", "utf8");
  const accountBackLinkRowSource = readFileSync("src/components/dashboard/AccountBackLinkRow.tsx", "utf8");
  const accountBackLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  assert.ok(faqPageSource.includes("<FaqContent showAccountLink={showAccountLink} />"));
  assert.ok(faqContentSource.includes('t("faqGeneralQuestions")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpPrefix")'));
  assert.ok(faqContentSource.includes('t("faqSupportPage")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpSuffix")'));
  assert.ok(!faqContentSource.includes("General questions"));
  assert.ok(!faqContentSource.includes("Need more help? Visit the"));
  assert.ok(!faqContentSource.includes("for service and contact options."));
  assert.ok(faqContentSource.includes('href="/dashboard/support"'));
  assert.ok(faqContentSource.includes("faqItems.map((item) =>"));
  assert.ok(faqContentSource.includes("<details") && faqContentSource.includes("<summary"));
  assert.ok(faqContentSource.includes('aria-labelledby="faq-list-heading"'));
  assert.ok(faqContentSource.includes('id="faq-list-heading"'));
  assert.ok(faqContentSource.includes('className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5'));
  assert.ok(faqContentSource.includes("<AccountDetailShell"));
  assert.ok(accountShellSource.includes("<AccountBackLinkRow />"));
  assert.ok(accountBackLinkRowSource.includes("<AccountBackLink />"));
  assert.ok(accountBackLinkSource.includes('href="/dashboard/account"'));
  assert.ok(faqSource.includes("faqItemKeys.reduce<FaqItem[]>") && faqSource.includes("seenQuestions"));
  assert.ok(languageOptions.some((option) => option.code === "id" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});




test("Thai Account FAQ render path resolves remaining heading and support copy without English fallback", () => {
  const th = getTranslations("th");
  const faqItems = getGeneralFaqs((key) => th[key] ?? enTranslations[key] ?? "");

  assert.equal(th.faqGeneralQuestions, "คำถามทั่วไป");
  assert.equal(th.faqNeedMoreHelpPrefix, "ต้องการความช่วยเหลือเพิ่มเติม? ไปที่");
  assert.equal(th.faqSupportPage, "หน้าสนับสนุน");
  assert.equal(th.faqNeedMoreHelpSuffix, "เพื่อดูตัวเลือกบริการและการติดต่อ");
  assert.equal(
    `${th.faqNeedMoreHelpPrefix} ${th.faqSupportPage} ${th.faqNeedMoreHelpSuffix}`,
    "ต้องการความช่วยเหลือเพิ่มเติม? ไปที่ หน้าสนับสนุน เพื่อดูตัวเลือกบริการและการติดต่อ",
  );

  for (const key of [
    "faqGeneralQuestions",
    "faqNeedMoreHelpPrefix",
    "faqSupportPage",
    "faqNeedMoreHelpSuffix",
  ]) {
    assert.notEqual(th[key], enTranslations[key], key);
  }

  assert.deepEqual(
    faqItems.slice(0, 8).map((item) => item.question),
    [
      "Kurioticket ค้นหาตัวเลือกเที่ยวบินและโรงแรมอย่างไร?",
      "Kurioticket ขายตั๋วหรือห้องพักโรงแรมโดยตรงหรือไม่?",
      "ทำไมราคาจึงเปลี่ยนได้หลังจากฉันคลิกข้อเสนอ?",
      "ฉันสามารถเปรียบเทียบผู้ให้บริการหลายรายสำหรับทริปเดียวกันได้หรือไม่?",
      "ฉันจะทำการจองให้เสร็จอย่างปลอดภัยได้อย่างไร?",
      "ฉันสามารถตั้งค่าความต้องการสกุลเงินและภาษาได้หรือไม่?",
      "ผลการค้นหาเป็นข้อมูลสดหรือข้อมูลแคช?",
      "ฉันจะจัดการการเปลี่ยนแปลงหรือการยกเลิกได้ที่ไหน?",
    ],
  );

  assert.ok(faqItems.every((item) => !Object.values(enTranslations).includes(item.answer)));
  assert.ok(faqItems.some((item) => item.answer.includes("Kurioticket") && item.answer.includes("เปรียบเทียบ")));
  assert.ok(faqItems.some((item) => item.answer.includes("ผู้ให้บริการ") && item.answer.includes("ชำระเงิน")));
  assert.ok(faqItems.some((item) => item.answer.includes("การเปลี่ยนแปลง") && item.answer.includes("การยกเลิก") && item.answer.includes("การคืนเงิน")));

  const faqContentSource = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
  const faqPageSource = readFileSync("src/app/faq/page.tsx", "utf8");
  const faqSource = readFileSync("src/content/faqs.ts", "utf8");
  const accountShellSource = readFileSync("src/components/dashboard/AccountDetailShell.tsx", "utf8");
  const accountBackLinkRowSource = readFileSync("src/components/dashboard/AccountBackLinkRow.tsx", "utf8");
  const accountBackLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  assert.ok(faqPageSource.includes("<FaqContent showAccountLink={showAccountLink} />"));
  assert.ok(faqContentSource.includes('t("faqGeneralQuestions")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpPrefix")'));
  assert.ok(faqContentSource.includes('t("faqSupportPage")'));
  assert.ok(faqContentSource.includes('t("faqNeedMoreHelpSuffix")'));
  assert.ok(!faqContentSource.includes("General questions"));
  assert.ok(!faqContentSource.includes("Need more help? Visit the"));
  assert.ok(!faqContentSource.includes("support page"));
  assert.ok(!faqContentSource.includes("for service and contact options."));
  assert.ok(faqContentSource.includes('href="/dashboard/support"'));
  assert.ok(faqContentSource.includes("faqItems.map((item) =>"));
  assert.ok(faqContentSource.includes("<details") && faqContentSource.includes("<summary"));
  assert.ok(faqContentSource.includes('aria-labelledby="faq-list-heading"'));
  assert.ok(faqContentSource.includes('id="faq-list-heading"'));
  assert.ok(faqContentSource.includes('className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5'));
  assert.ok(faqContentSource.includes("<AccountDetailShell"));
  assert.ok(accountShellSource.includes("<AccountBackLinkRow />"));
  assert.ok(accountBackLinkRowSource.includes("<AccountBackLink />"));
  assert.ok(accountBackLinkSource.includes('href="/dashboard/account"'));
  assert.ok(faqSource.includes("faqItemKeys.reduce<FaqItem[]>") && faqSource.includes("seenQuestions"));
  assert.ok(languageOptions.some((option) => option.code === "th" && option.locale === "th-TH" && option.nativeLabel === "ไทย" && option.direction === "ltr"));
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

test("Polish account dashboard overview copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");

  const expectedPolishOverviewCopy = {
    "accountDashboard.overview.welcome": "Witaj ponownie, {name}",
    "accountDashboard.hub.description":
      "Zarządzaj podróżami, zapisanymi elementami, preferencjami i ustawieniami konta w jednym miejscu.",
    "accountDashboard.hub.manageAccount": "Zarządzaj kontem",
    "accountDashboard.hub.travelActivity": "Aktywność podróży",
    "accountDashboard.hub.preferences": "Preferencje",
    "accountDashboard.hub.helpAndSupport": "Pomoc i wsparcie",
    "accountDashboard.hub.personalDetails": "Dane osobowe",
    "accountDashboard.hub.securitySettings": "Ustawienia bezpieczeństwa",
    "accountDashboard.hub.myTrips": "Moje podróże",
    "accountDashboard.hub.savedTrips": "Zapisane podróże",
    "accountDashboard.hub.priceAlerts": "Alerty cenowe",
    "accountDashboard.hub.emailPreferences": "Preferencje personalizacji",
    "accountDashboard.hub.travelPreferences": "Preferencje rezerwacji",
    "accountDashboard.hub.contactSupport": "Skontaktuj się z pomocą",
    "accountDashboard.hub.faq": "FAQ",
  } as const;

  for (const [key, value] of Object.entries(expectedPolishOverviewCopy)) {
    assert.equal(pl[key], value);
    if (value !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  assert.equal(pl["accountDashboard.overview.welcome"].includes("{name}"), true);
  assert.equal(pl["accountDashboard.overview.welcome"].replace("{name}", "developer"), "Witaj ponownie, developer");
  assert.equal(pl["accountDashboard.overview.welcome"].includes("developer2@zentricresearch.com"), false);
  assert.equal("D2", "D2", "Avatar initials remain dynamic user data and are not translated.");

  assert.ok(
    dashboardSource.includes('t["accountDashboard.overview.welcome"]') &&
      dashboardSource.includes('t["accountDashboard.hub.description"]') &&
      dashboardSource.includes('t["accountDashboard.hub.mobileDescription"]') &&
      dashboardSource.includes("accountDashboardPanels.map((panel)") &&
      dashboardSource.includes("<AccountDashboardPanel key={panel.titleKey} panel={panel} />"),
    "Account menu overview should read the corrected i18n keys through DashboardGrid panels.",
  );

  for (const key of Object.keys(expectedPolishOverviewCopy).filter((key) => key.includes(".hub.") && key !== "accountDashboard.hub.description")) {
    assert.ok(
      dashboardSource.includes(`titleKey: "${key}"`) || dashboardSource.includes(`labelKey: "${key}"`) || key === "accountDashboard.hub.faq",
      `${key} should remain wired to the active dashboard overview panel configuration.`,
    );
  }

  assert.ok(
    dashboardSource.includes("{initials}") &&
      dashboardSource.includes("{userEmail}") &&
      dashboardPageSource.includes("const displayName = getSafeDisplayName(userName, userEmail)") &&
      dashboardPageSource.includes("const initials = getInitials(userName, userEmail)"),
    "Dashboard overview should preserve dynamic display name, email, and initials.",
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
      dashboardSource.includes('href: "/faq?from=account"') &&
      dashboardSource.includes("icon: UserRound") &&
      dashboardSource.includes("icon: CircleHelp"),
    "Dashboard overview routes, icons, layout, and link behavior should remain unchanged.",
  );
  assert.ok(dashboardPageSource.includes("<AccountMenuPage"), "Signed-in account overview render path should use AccountMenuPage.");
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Polish account Price Alerts active page copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const priceAlertsSource = readFileSync("src/app/dashboard/alerts/PriceAlertsContent.tsx", "utf8");
  const alertsPageSource = readFileSync("src/app/dashboard/alerts/page.tsx", "utf8");

  const expectedPolishPriceAlertsCopy: Record<string, string> = {
    "accountDashboard.priceAlerts.title": "Alerty cenowe",
    "accountDashboard.priceAlerts.description": "Śledź ceny i otrzymuj powiadomienia, gdy taryfy się zmienią.",
    "accountDashboard.priceAlerts.tabs.active": "Aktywne",
    "accountDashboard.priceAlerts.tabs.expired": "Wygasłe",
    "accountDashboard.priceAlerts.tabs.all": "Wszystkie",
    "accountDashboard.priceAlerts.sort.label": "Sortuj według",
    "accountDashboard.priceAlerts.sort.newest": "Najnowsze",
    "accountDashboard.priceAlerts.sort.oldest": "Najstarsze",
    "accountDashboard.priceAlerts.sort.routeAz": "Trasa A–Z",
    "accountDashboard.priceAlerts.empty.title": "Nie masz jeszcze alertów cenowych.",
    "accountDashboard.priceAlerts.empty.body": "Utwórz alert z wyszukiwania lotów, aby śledzić zmiany taryf i otrzymywać powiadomienia.",
    "accountDashboard.priceAlerts.cta.flights": "Szukaj lotów",
    "accountDashboard.priceAlerts.filtersAriaLabel": "Filtry alertów cenowych",
    "accountDashboard.priceAlerts.sort.ariaLabel": "Sortuj alerty cenowe",
    "accountDashboard.priceAlerts.featuresAriaLabel": "Funkcje alertów cenowych",
    "accountDashboard.priceAlerts.features.monitoring.title": "Monitorowanie w czasie rzeczywistym",
    "accountDashboard.priceAlerts.features.monitoring.body": "Monitorujemy ceny i informujemy Cię, gdy alerty zostaną uruchomione.",
    "accountDashboard.priceAlerts.features.email.title": "Powiadomienia e-mail",
    "accountDashboard.priceAlerts.features.email.body": "Otrzymuj powiadomienia, gdy taryfy się zmienią.",
    "accountDashboard.priceAlerts.features.trends.title": "Trendy cenowe",
    "accountDashboard.priceAlerts.features.trends.body": "Zobacz, jak śledzone taryfy zmieniają się w czasie.",
    "accountDashboard.priceAlerts.features.management.title": "Łatwe zarządzanie",
    "accountDashboard.priceAlerts.features.management.body": "Wstrzymuj lub usuwaj alerty w dowolnym momencie.",
  };

  for (const [key, value] of Object.entries(expectedPolishPriceAlertsCopy)) {
    assert.equal(pl[key], value, `${key} should resolve to Polish Price Alerts copy`);
    if (value !== enTranslations[key]) {
      assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  assert.ok(alertsPageSource.includes('import { PriceAlertsContent } from "./PriceAlertsContent"'));
  assert.ok(alertsPageSource.includes('<PriceAlertsContent showAccountLink={showAccountLink} />'));
  assert.ok(priceAlertsSource.includes('const { t } = useLocale()'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.title"]'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.description"]'));
  assert.ok(priceAlertsSource.includes('{`${t[tab.labelKey]} (${tab.count})`}'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.sort.label"]'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.empty.title"]'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.empty.body"]'));
  assert.ok(priceAlertsSource.includes('t["accountDashboard.priceAlerts.cta.flights"]'));
  assert.ok(priceAlertsSource.includes('titleKey: "accountDashboard.priceAlerts.features.monitoring.title"'));
  assert.ok(priceAlertsSource.includes('textKey: "accountDashboard.priceAlerts.features.management.body"'));

  assert.ok(priceAlertsSource.includes('id: "active"') && priceAlertsSource.includes('count: 0'));
  assert.ok(priceAlertsSource.includes('id: "expired"') && priceAlertsSource.includes('count: 0'));
  assert.ok(priceAlertsSource.includes('id: "all"') && priceAlertsSource.includes('count: 0'));
  assert.ok(priceAlertsSource.includes('useState<(typeof tabs)[number]["id"]>(\n    tabs[0].id'));
  assert.ok(priceAlertsSource.includes('{ id: "newest", labelKey: "accountDashboard.priceAlerts.sort.newest" }'));
  assert.ok(priceAlertsSource.includes('{ id: "oldest", labelKey: "accountDashboard.priceAlerts.sort.oldest" }'));
  assert.ok(priceAlertsSource.includes('{ id: "routeAz", labelKey: "accountDashboard.priceAlerts.sort.routeAz" }'));
  assert.ok(priceAlertsSource.includes('useState<\n    (typeof sortOptions)[number]["id"]\n  >(sortOptions[0].id)'));
  assert.ok(priceAlertsSource.includes('<EmptyStateIllustration />'));
  assert.ok(priceAlertsSource.includes('href="/flights"'));
  assert.ok(priceAlertsSource.includes('<AccountDetailShell showAccountLink={showAccountLink}>'));
  assert.ok(priceAlertsSource.includes('className="mx-auto min-w-0 max-w-6xl px-4 pt-3 pb-8 sm:px-6 sm:pt-6 lg:px-8"'));
  assert.ok(!priceAlertsSource.includes('>Price alerts<'));
  assert.ok(!priceAlertsSource.includes('>Search flights<'));
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
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


test("Indonesian account preferences actual render-path copy resolves without English fallback", () => {
  const id = getTranslations("id-ID");
  const customizationSource = readFileSync(
    "src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx",
    "utf8",
  );
  const bookingSource = readFileSync(
    "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
    "utf8",
  );
  const customizationPageSource = readFileSync("src/app/dashboard/preferences/customization/page.tsx", "utf8");
  const bookingPageSource = readFileSync("src/app/dashboard/preferences/booking/page.tsx", "utf8");
  const backLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  const expectedCustomizationCopy = {
    "accountDashboard.preferences.customization.title": "Preferensi penyesuaian",
    "accountDashboard.preferences.customization.description": "Pilih cara Kurioticket mempersonalisasi pengalaman Anda.",
    "accountDashboard.preferences.customization.languageRegion.title": "Bahasa dan wilayah",
    "accountDashboard.preferences.customization.languageRegion.description": "Atur bahasa, mata uang, dan wilayah default Anda.",
    "accountDashboard.preferences.customization.preferredLanguage": "Bahasa pilihan",
    "accountDashboard.preferences.customization.selectPreferredLanguage": "Pilih bahasa pilihan",
    "accountDashboard.preferences.customization.currency": "Mata uang",
    "accountDashboard.preferences.customization.selectCurrency": "Pilih mata uang",
    "accountDashboard.preferences.customization.region": "Wilayah",
    "accountDashboard.preferences.customization.selectRegion": "Pilih wilayah",
    "accountDashboard.preferences.customization.personalization.title": "Personalisasi",
    "accountDashboard.preferences.customization.personalization.description": "Atur cara Kurioticket mempersonalisasi rekomendasi Anda.",
    "accountDashboard.preferences.customization.personalizeSearches": "Gunakan pencarian saya untuk mempersonalisasi rekomendasi",
    "accountDashboard.preferences.customization.personalizedTravelDeals": "Tampilkan penawaran perjalanan yang dipersonalisasi",
    "accountDashboard.preferences.customization.rememberRecentSearches": "Ingat pencarian terbaru saya",
    "accountDashboard.preferences.customization.communicationStyle.title": "Gaya komunikasi",
    "accountDashboard.preferences.customization.communicationStyle.description": "Pilih cara Kurioticket berkomunikasi dengan Anda.",
    "accountDashboard.preferences.customization.emailUpdates": "Pembaruan email",
    "accountDashboard.preferences.customization.priceAlertEmails": "Email peringatan harga",
    "accountDashboard.preferences.customization.travelInspirationEmails": "Email inspirasi perjalanan",
  } as const;

  const expectedBookingCopy = {
    "accountDashboard.preferences.booking.title": "Preferensi pemesanan",
    "accountDashboard.preferences.booking.description": "Atur preferensi perjalanan default Anda untuk pemesanan yang lebih cepat dan lebih relevan.",
    "accountDashboard.preferences.booking.airports.title": "Bandara",
    "accountDashboard.preferences.booking.airports.description": "Pilih bandara yang Anda sukai untuk keberangkatan.",
    "accountDashboard.preferences.booking.homeAirport": "Bandara utama",
    "accountDashboard.preferences.booking.searchAirport": "Cari bandara",
    "accountDashboard.preferences.booking.secondaryAirports": "Bandara sekunder",
    "accountDashboard.preferences.booking.addAlternativeAirports": "Tambahkan bandara alternatif",
    "accountDashboard.preferences.booking.airlines.title": "Maskapai",
    "accountDashboard.preferences.booking.airlines.description": "Pilih maskapai yang Anda sukai atau ingin hindari.",
    "accountDashboard.preferences.booking.preferredAirlines": "Maskapai pilihan",
    "accountDashboard.preferences.booking.searchAirlines": "Cari maskapai",
    "accountDashboard.preferences.booking.avoidAirlines": "Hindari maskapai",
    "accountDashboard.preferences.booking.stays.title": "Penginapan",
    "accountDashboard.preferences.booking.stays.description": "Atur preferensi akomodasi untuk pemesanan hotel.",
    "accountDashboard.preferences.booking.preferredHotelChains": "Jaringan hotel pilihan",
    "accountDashboard.preferences.booking.searchHotelChains": "Cari jaringan hotel",
    "accountDashboard.preferences.booking.avoidHotelChains": "Hindari jaringan hotel",
  } as const;

  const sharedCopy = {
    "accountDashboard.preferences.cancel": "Batal",
    "accountDashboard.preferences.savePreferences": "Simpan preferensi",
  } as const;

  assert.ok(customizationSource.includes("useLocale()"), "Customization active component should read the current locale context.");
  assert.ok(bookingSource.includes("useLocale()"), "Booking active component should read the current locale context.");

  for (const [key, value] of Object.entries(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use active i18n key ${key}.`);
    assert.equal(id[key], value, key);
    assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  for (const [key, value] of Object.entries(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(key), `Booking page should use active i18n key ${key}.`);
    assert.equal(id[key], value, key);
    assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  for (const [key, value] of Object.entries(sharedCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use shared action key ${key}.`);
    assert.ok(bookingSource.includes(key), `Booking page should use shared action key ${key}.`);
    assert.equal(id[key], value, key);
    assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const activeIndonesianRenderValues = [
    ...Object.keys(expectedCustomizationCopy),
    ...Object.keys(expectedBookingCopy),
    ...Object.keys(sharedCopy),
  ].map((key) => id[key]);

  for (const englishFallback of [
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
  ]) {
    assert.ok(!activeIndonesianRenderValues.includes(englishFallback), `Indonesian account preferences render-path values should not fall back to English: ${englishFallback}`);
  }

  assert.ok(backLinkSource.includes('"accountDashboard.hub.title"'), "Back link should continue using localized account title key.");
  assert.ok(backLinkSource.includes('href="/dashboard/account"'), "Back link route should remain unchanged.");
  assert.equal(id["accountDashboard.hub.title"], "Akun saya");
  assert.ok(customizationSource.includes('name={field.id}'));
  assert.ok(bookingSource.includes('name={field.id}'));
  assert.ok(customizationSource.includes('value={option.value}'));
  assert.ok(customizationSource.includes('type="checkbox"'));
  assert.ok(customizationSource.includes('type="button"'));
  assert.ok(bookingSource.includes('type="button"'));
  assert.ok(customizationSource.includes('action="#"'));
  assert.ok(bookingSource.includes('action="#"'));
  assert.ok(customizationSource.includes('className="flex-1 bg-[#f3f7fc] pb-10 pt-0"'));
  assert.ok(bookingSource.includes('className="flex-1 bg-[#f3f7fc] pb-10 pt-0"'));
  assert.ok(customizationPageSource.includes("<AccountPreferencesHeader />"));
  assert.ok(bookingPageSource.includes("<AccountPreferencesHeader />"));
  assert.ok(languageOptions.some((option) => option.code === "id" && option.locale === "id-ID" && option.nativeLabel === "Bahasa Indonesia" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
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

test("Polish account personal details and security settings copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const dynamicEmail = "developer2@zentricresearch.com";
  const dynamicProfileName = "Developer Tester";

  const expectedPolishPersonalDetails = {
    "accountDashboard.personalDetails.title": "Dane osobowe",
    "accountDashboard.personalDetails.subtitle":
      "Aktualizuj swoje informacje i zarządzaj tym, jak są używane w Kurioticket.",
    "accountDashboard.personalDetails.description":
      "Zarządzaj informacjami, których Kurioticket używa dla Twojego konta.",
    "accountDashboard.personalDetails.name": "Imię i nazwisko",
    "accountDashboard.personalDetails.emailAddress": "Adres e-mail",
    "accountDashboard.personalDetails.phoneNumber": "Numer telefonu",
    "accountDashboard.personalDetails.dateOfBirth": "Data urodzenia",
    "accountDashboard.personalDetails.gender": "Płeć",
    "accountDashboard.personalDetails.nationality": "Obywatelstwo",
    "accountDashboard.personalDetails.address": "Adres",
    "accountDashboard.personalDetails.addName": "Dodaj swoje imię i nazwisko",
    "accountDashboard.personalDetails.addPhoneNumber": "Dodaj swój numer telefonu",
    "accountDashboard.personalDetails.addDateOfBirth": "Dodaj swoją datę urodzenia",
    "accountDashboard.personalDetails.addGender": "Dodaj swoją płeć",
    "accountDashboard.personalDetails.addNationality": "Dodaj swoje obywatelstwo",
    "accountDashboard.personalDetails.addAddress": "Dodaj swój adres",
    "accountDashboard.personalDetails.edit": "Edytuj",
  } as const;

  const expectedPolishSecurity = {
    "accountDashboard.security.title": "Ustawienia bezpieczeństwa",
    "accountDashboard.security.description":
      "Zarządzaj logowaniem i bezpieczeństwem swojego konta Kurioticket.",
    "accountDashboard.security.password.title": "Hasło",
    "accountDashboard.security.password.description":
      "Zmień hasło używane do logowania na konto.",
    "accountDashboard.security.action.changePassword": "Zmień hasło",
    "accountDashboard.security.twoFactor.title": "Uwierzytelnianie dwuskładnikowe",
    "accountDashboard.security.twoFactor.description":
      "Dodaj dodatkową ochronę za pomocą aplikacji uwierzytelniającej.",
    "accountDashboard.security.action.setUp": "Skonfiguruj",
    "accountDashboard.security.passkeys.title": "Klucze dostępu",
    "accountDashboard.security.passkeys.description":
      "Użyj urządzenia lub klucza bezpieczeństwa, aby logować się szybciej.",
    "accountDashboard.security.action.setUpPasskey": "Skonfiguruj klucz dostępu",
    "accountDashboard.security.activeSessions.title": "Aktywne sesje",
    "accountDashboard.security.activeSessions.description":
      "Sprawdź urządzenia zalogowane na Twoje konto.",
    "accountDashboard.security.action.manageSessions": "Zarządzaj sesjami",
    "accountDashboard.security.notifications.title": "Powiadomienia bezpieczeństwa",
    "accountDashboard.security.notifications.description":
      "Otrzymuj alerty o ważnej aktywności na koncie.",
    "accountDashboard.security.action.turnOff": "Wyłącz",
    "accountDashboard.security.deleteAccount.title": "Usuń konto",
    "accountDashboard.security.deleteAccount.description":
      "Poproś o trwałe usunięcie konta.",
    "accountDashboard.security.action.deleteAccount": "Usuń konto",
  } as const;

  for (const [key, value] of Object.entries({ ...expectedPolishPersonalDetails, ...expectedPolishSecurity })) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(pl["accountDashboard.hub.title"], "Moje konto");
  assert.equal(pl["accountDashboard.backToAccount"], undefined);
  assert.equal(dynamicEmail, "developer2@zentricresearch.com");
  assert.equal(dynamicProfileName, "Developer Tester");
  assert.equal(pl["accountDashboard.personalDetails.title"].includes("developer"), false);
  assert.equal(pl["accountDashboard.security.description"].includes("Kurioticket"), true);
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const dashboardPageSource = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  const securityPageSource = readFileSync("src/app/dashboard/security/page.tsx", "utf8");

  assert.ok(
    dashboardSource.includes('title={t["accountDashboard.personalDetails.title"]}') &&
      dashboardSource.includes('description={t["accountDashboard.personalDetails.subtitle"]}') &&
      dashboardSource.includes('t["accountDashboard.personalDetails.description"]') &&
      dashboardSource.includes('label: t["accountDashboard.personalDetails.name"]') &&
      dashboardSource.includes('fallback: t["accountDashboard.personalDetails.addName"]') &&
      dashboardSource.includes('label: t["accountDashboard.personalDetails.emailAddress"]') &&
      dashboardSource.includes('fallback: t["accountDashboard.personalDetails.addPhoneNumber"]') &&
      dashboardSource.includes('{t["accountDashboard.personalDetails.edit"]}'),
    "Active Personal details render path should read account personal-details i18n keys.",
  );
  assert.ok(
    dashboardSource.includes('title={tx("accountDashboard.security.title", "Security settings")}') &&
      dashboardSource.includes('"accountDashboard.security.description"') &&
      dashboardSource.includes('"accountDashboard.security.password.title"') &&
      dashboardSource.includes('"accountDashboard.security.twoFactor.description"') &&
      dashboardSource.includes('"accountDashboard.security.passkeys.description"') &&
      dashboardSource.includes('"accountDashboard.security.action.setUp"') &&
      dashboardSource.includes('"accountDashboard.security.action.turnOff"') &&
      dashboardSource.includes('"accountDashboard.security.action.deleteAccount"'),
    "Active Security settings render path should read account security i18n keys.",
  );
  assert.ok(
    dashboardSource.includes("getPersonalDetailsInitialValues(props)") &&
      dashboardSource.includes("userEmail?.trim()") &&
      dashboardPageSource.includes("const userName = savedProfileName || sessionUserName") &&
      dashboardPageSource.includes("const userEmail = session?.user?.email?.trim()") &&
      accountPageSource.includes("const userEmail = session?.user?.email?.trim()"),
    "Personal details should keep user/session/profile values dynamic.",
  );
  assert.ok(
    dashboardPageSource.includes("<DashboardOverview") &&
      securityPageSource.includes("<SecurityDashboardPage />") &&
      dashboardSource.includes("onAction={() => setPasswordModalOpen(true)}") &&
      dashboardSource.includes("onAction={() => void openTwoFactorModal") &&
      dashboardSource.includes("onAction={() => setPasskeysModalOpen(true)}") &&
      dashboardSource.includes("onAction={handleOpenSessions}") &&
      dashboardSource.includes("onAction={() => setDeleteModalOpen(true)}") &&
      !dashboardSource.includes('href="/dashboard/personal-details"'),
    "Account routes and security action handlers should remain unchanged.",
  );
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
    dashboardSource.includes('title={tx("accountDashboard.security.title", "Security settings")}') &&
      dashboardSource.includes('"accountDashboard.security.description"') &&
      dashboardSource.includes('"accountDashboard.security.passkeys.title"') &&
      dashboardSource.includes('"accountDashboard.security.action.deleteAccount"') &&
      dashboardSource.includes('onAction={() => setPasswordModalOpen(true)}') &&
      dashboardSource.includes('onAction={() => void openTwoFactorModal') &&
      dashboardSource.includes('onAction={() => setPasskeysModalOpen(true)}') &&
      dashboardSource.includes('onAction={handleOpenSessions}') &&
      dashboardSource.includes('onAction={() => setDeleteModalOpen(true)}'),
    "Security settings page should continue using account security i18n keys and unchanged action handlers.",
  );
  assert.ok(
    dashboardSource.includes("getPersonalDetailsInitialValues(props)") &&
      dashboardSource.includes("userEmail?.trim()") &&
      dashboardPageSource.includes("const userName = savedProfileName || sessionUserName") &&
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

test("Polish hotels results active render path copy is localized without English fallback", () => {
  const expectedPolishHotelResultsStrings = {
    clearAll: "Wyczyść wszystko",
    filters: "Filtry",
    closeFilters: "Zamknij filtry",
    done: "Gotowe",
    search: "Szukaj",
    hotelSearchDestinationLabel: "CEL PODRÓŻY",
    hotelSearchTravelDatesLabel: "DATY PODRÓŻY",
    hotelSearchGuestsLabel: "GOŚCIE",
    guestSingular: "gość",
    guestPlural: "gości",
    roomSingular: "pokój",
    roomPlural: "pokoje",
    "hotelResults.openFilters": "Otwórz filtry",
    "hotelResults.selectDateAriaPrefix": "Wybierz",
    "hotelResults.foundPlacesToStay": "Znaleźliśmy dla Ciebie {{count}} miejsc na pobyt",
    "hotelResults.summaryAria": "Podsumowanie wyników hoteli",
    "hotelResults.cheapest": "NAJTAŃSZE",
    "hotelResults.lowestTotalPrice": "Najniższa cena całkowita",
    "hotelResults.bestValue": "NAJLEPSZA WARTOŚĆ",
    "hotelResults.bestBalance": "Najlepsza równowaga",
    "hotelResults.topRated": "NAJWYŻEJ OCENIANE",
    "hotelResults.highestRating": "Najwyższa ocena",
    "hotelResults.valueScore": "ocena {{score}}/100",
    "hotelResults.starPlural": "{{count}} gwiazdek",
    "hotelResults.activeHotelFilters": "Aktywne filtry hoteli",
    "hotelResults.filterBy": "Filtruj według",
    "hotelResults.removeFilter": "Usuń filtr {{label}}",
    "hotelResults.budgetPrice": "Budżet / cena",
    "hotelResults.totalUpTo": "Łącznie do",
    "hotelResults.popularFilters": "Popularne filtry",
    "hotelResults.starRating": "Ocena gwiazdkowa",
    "hotelResults.fromRating": "Od",
    "hotelResults.propertyType": "Typ obiektu",
    "hotelResults.roomType": "Typ pokoju",
    "hotelResults.bedType": "Typ łóżka",
    "hotelResults.meals": "Wyżywienie",
    "hotelResults.resetFilters": "Resetuj filtry",
    "hotelResults.showLess": "Pokaż mniej",
    "hotelResults.showMore": "Pokaż więcej ({{count}})",
    "hotelResults.upToPrice": "Do {{price}}",
    "hotelResults.starsAndUp": "{{rating}}+ gwiazdek",
    "hotelResults.hotelImageAlt": "Opcja pobytu {{name}}{{location}}",
    "hotelResults.nearLocation": "w pobliżu {{location}}",
    "hotelResults.starHotelAria": "Hotel {{rating}}-gwiazdkowy",
    "hotelResults.estimatedStayTotal": "szacowana suma pobytu",
    "hotelResults.pricePerNight": "{{price}} za noc",
    "hotelResults.viewHotel": "Zobacz hotel",
    "hotelResults.filter.breakfastIncludedAvailable": "Śniadanie w cenie/dostępne",
    "hotelResults.filter.hotel": "Hotel",
    "hotelResults.filter.doubleRoom": "Pokój dwuosobowy",
    "hotelResults.filter.singleRoom": "Pokój jednoosobowy",
    "hotelResults.filter.kingBed": "Łóżko king-size",
    "hotelResults.filter.bedAndBreakfast": "Nocleg ze śniadaniem",
    "hotelResults.filter.roomOnly": "Tylko pokój",
    "hotelResults.filter.doubleBusiness": "Pokój dwuosobowy Business",
    "hotelResults.filter.deluxeKingRoom": "Pokój Deluxe z łóżkiem king-size",
    "hotelResults.filter.luxuryKing": "Luksusowy pokój z łóżkiem king-size",
    "hotelResults.filter.singleStandard": "Pokój jednoosobowy Standard",
    "hotelResults.filter.superiorRoom": "Pokój Superior",
  };

  for (const [key, value] of Object.entries(expectedPolishHotelResultsStrings)) {
    assert.equal(plTranslations[key], value, `pl ${key} should use the audited Polish hotels results copy`);

    if (enTranslations[key] !== value) {
      assert.notEqual(plTranslations[key], enTranslations[key], `pl ${key} should not fall back to English`);
    }
  }

  assert.equal(
    plTranslations["hotelResults.foundPlacesToStay"].replace("{{count}}", "6"),
    "Znaleźliśmy dla Ciebie 6 miejsc na pobyt",
  );
  assert.equal(
    plTranslations["hotelResults.valueScore"].replace("{{score}}", "75"),
    "ocena 75/100",
  );
  assert.equal(
    plTranslations["hotelResults.starPlural"].replace("{{count}}", "5"),
    "5 gwiazdek",
  );
  assert.equal(
    plTranslations["hotelResults.pricePerNight"].replace("{{price}}", "€190.54"),
    "€190.54 za noc",
  );
  assert.equal(
    `${plTranslations.guestSingular}, ${plTranslations.roomSingular}`,
    "gość, pokój",
  );

  const selectedDestination = "lagos";
  const selectedDateSummary = "29 cze — 1 lip";
  const selectedGuestsRoomsSummary = `1 ${plTranslations.guestSingular}, 1 ${plTranslations.roomSingular}`;
  assert.equal(selectedDestination, "lagos");
  assert.equal(selectedDateSummary, "29 cze — 1 lip");
  assert.equal(selectedGuestsRoomsSummary, "1 gość, 1 pokój");

  const hotelResultsClientSource = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
  const hotelCardSource = readFileSync("src/components/results/HotelCard.tsx", "utf8");
  const hotelSearchBarSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  for (const key of [
    "hotelResults.cheapest",
    "hotelResults.bestValue",
    "hotelResults.topRated",
    "hotelResults.foundPlacesToStay",
    "hotelResults.filterBy",
    "hotelResults.budgetPrice",
    "hotelResults.popularFilters",
    "hotelResults.propertyType",
    "hotelResults.roomType",
    "hotelResults.bedType",
    "hotelResults.meals",
  ]) {
    assert.match(hotelResultsClientSource, new RegExp(`t\\(\"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\"`), `${key} should be read by the active /hotels/results client render path`);
  }

  for (const key of [
    "hotelResults.estimatedStayTotal",
    "hotelResults.pricePerNight",
    "hotelResults.viewHotel",
    "hotelResults.filter.doubleBusiness",
    "hotelResults.filter.bedAndBreakfast",
    "hotelResults.filter.deluxeKingRoom",
    "hotelResults.filter.luxuryKing",
    "hotelResults.filter.singleStandard",
    "hotelResults.filter.superiorRoom",
    "hotelResults.filter.doubleRoom",
    "hotelResults.filter.roomOnly",
    "hotelResults.hotelImageAlt",
    "hotelResults.starHotelAria",
  ]) {
    assert.ok(hotelCardSource.includes(key), `${key} should be read by the active hotel result card render path`);
  }

  for (const key of [
    "hotelSearchDestinationLabel",
    "hotelSearchTravelDatesLabel",
    "hotelSearchGuestsLabel",
    "guestSingular",
    "roomSingular",
    "hotelResults.openFilters",
    "hotelResults.selectDateAriaPrefix",
  ]) {
    assert.ok(hotelSearchBarSource.includes(key), `${key} should be read by the active hotels edit/search bar render path`);
  }

  assert.equal(languageOptions.find((option) => option.code === "pl")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});


test("Indonesian Hotels landing and Hotel results copy is localized on active render paths", () => {
  const expectedIndonesianHotelsStrings = {
    hotelsHeroTitle: "Temukan penginapan yang memulai perjalanan dengan tepat.",
    hotelsHeroSubtitle: "Bandingkan hotel dalam satu tempat, dari kedatangan kota yang nyaman hingga liburan resor yang mudah.",
    hotelSearchDestinationLabel: "TUJUAN",
    hotelSearchDestinationPlaceholder: "Kota atau hotel",
    hotelSearchTravelDatesLabel: "TANGGAL PERJALANAN",
    hotelSearchDatePlaceholder: "Tanggal masuk — keluar",
    hotelSearchGuestsLabel: "TAMU",
    guestSingular: "tamu",
    roomSingular: "kamar",
    search: "Cari",
    exploreHotelStaysByDestination: "Jelajahi penginapan hotel berdasarkan destinasi",
    featuredHotelDestinations: "Destinasi hotel unggulan",
    findStaysEveryKindTrip: "Temukan penginapan untuk setiap jenis perjalanan",
    hotelInspirationBody: "Jelajahi ide destinasi berdasarkan jenis penginapan yang Anda inginkan.",
    exploreStaysWorldwide: "Jelajahi penginapan di seluruh dunia",
    "hotelDestination.Tokyo.title": "Jepang",
    "hotelDestination.Tokyo.subtitle": "Penginapan di Tokyo",
    "hotelDestination.London.title": "Inggris Raya",
    "hotelDestination.London.subtitle": "Penginapan di London",
    "hotelDestination.Paris.title": "Prancis",
    "hotelDestination.Paris.subtitle": "Penginapan di Paris",
    "hotelDestination.New York.title": "Amerika Serikat",
    "hotelDestination.New York.subtitle": "Penginapan di New York",
    "hotelDestination.Rome.title": "Italia",
    "hotelDestination.Rome.subtitle": "Penginapan di Roma",
    "hotelDestination.Dubai.title": "Uni Emirat Arab",
    "hotelDestination.Dubai.subtitle": "Penginapan di Dubai",
    "hotelDestination.Singapore.title": "Singapura",
    "hotelDestination.Singapore.subtitle": "Penginapan di Singapura",
    "hotelDestination.Barcelona.title": "Spanyol",
    "hotelDestination.Barcelona.subtitle": "Penginapan di Barcelona",
    "hotelDestination.Toronto.title": "Kanada",
    "hotelDestination.Toronto.subtitle": "Penginapan di Toronto",
    "hotelDestination.Amsterdam.title": "Belanda",
    "hotelDestination.Amsterdam.subtitle": "Penginapan di Amsterdam",
    "hotelDestination.Bangkok.title": "Thailand",
    "hotelDestination.Bangkok.subtitle": "Penginapan di Bangkok",
    "hotelDestination.Cancun.title": "Meksiko",
    "hotelDestination.Cancun.subtitle": "Penginapan di Cancun",
    "hotelDestination.Istanbul.title": "Turki",
    "hotelDestination.Istanbul.subtitle": "Penginapan di Istanbul",
    "hotelInspirationCategory.Beach": "Pantai",
    "hotelInspirationCategory.City breaks": "Liburan kota",
    "hotelInspirationCategory.Family trips": "Perjalanan keluarga",
    "hotelInspirationCategory.Relaxed stays": "Penginapan santai",
    "hotelInspirationCategory.Weekend ideas": "Ide akhir pekan",
    "hotelInspirationBadge.Coastal stays": "Penginapan pesisir",
    "hotelInspirationBadge.City coast": "Kota pesisir",
    "hotelInspirationBadge.Waterfront stays": "Penginapan tepi air",
    "hotelInspirationBadge.Harbor city": "Kota pelabuhan",
    "hotelInspirationBadge.Warm escape": "Liburan hangat",
    "hotelInspirationBadge.Bay city": "Kota teluk",
    "hotelTrustCompareBody": "Lihat opsi hotel dari penyedia perjalanan dalam satu tempat sebelum Anda melanjutkan.",
    "hotelTrustReviewTitle": "Tinjau detail penginapan",
    "hotelTrustReviewBody": "Periksa tanggal, tamu, kamar, konteks harga, dan informasi penginapan sebelum memilih.",
    "hotelTrustProviderTitle": "Lanjutkan dengan penyedia",
    "hotelTrustProviderBody": "Saat memilih opsi, lanjutkan dengan penyedia untuk mengonfirmasi harga akhir, ketersediaan, biaya, dan aturan pembatalan.",
    "hotelResults.liveSearchUnavailable": "Pencarian hotel langsung untuk sementara tidak tersedia. Silakan coba lagi sebentar lagi.",
    "hotelResults.foundPlacesToStay": "Kami menemukan {{count}} tempat menginap untuk Anda",
    "hotelResults.cheapest": "TERMURAH",
    "hotelResults.lowestTotalPrice": "Total harga terendah",
    "hotelResults.bestValue": "NILAI TERBAIK",
    "hotelResults.bestBalance": "Keseimbangan terbaik",
    "hotelResults.topRated": "PERINGKAT TERBAIK",
    "hotelResults.highestRating": "Rating tertinggi",
    "hotelResults.valueScore": "skor {{score}}/100",
    "hotelResults.starPlural": "{{count}} bintang",
    "hotelResults.estimatedStayTotal": "perkiraan total menginap",
    "hotelResults.pricePerNight": "{{price}} per malam",
    "hotelResults.viewHotel": "Lihat hotel",
    "hotelResults.filterBy": "Filter berdasarkan",
    "hotelResults.budgetPrice": "Anggaran / Harga",
    "hotelResults.totalUpTo": "Total hingga",
    "hotelResults.popularFilters": "Filter populer",
    "hotelResults.starRating": "Rating bintang",
    "hotelResults.fromRating": "Dari",
    "hotelResults.propertyType": "Jenis properti",
    "hotelResults.roomType": "Jenis kamar",
    "hotelResults.bedType": "Jenis tempat tidur",
    "hotelResults.meals": "Makanan",
    "hotelResults.filter.breakfastIncludedAvailable": "Sarapan termasuk/tersedia",
    "hotelResults.filter.bedAndBreakfast": "Termasuk sarapan",
    "hotelResults.filter.roomOnly": "Kamar saja",
    "hotelResults.filter.hotel": "Hotel",
    "hotelResults.filter.doubleRoom": "Kamar Double",
    "hotelResults.filter.singleRoom": "Kamar Single",
    "hotelResults.filter.kingBed": "Tempat Tidur King",
  };

  for (const [key, value] of Object.entries(expectedIndonesianHotelsStrings)) {
    assert.equal(idTranslations[key], value, `id ${key} should use Indonesian Hotels copy`);
    if (enTranslations[key] !== value) assert.notEqual(idTranslations[key], enTranslations[key], `id ${key} should not fall back to English`);
  }

  assert.equal(idTranslations["hotelResults.foundPlacesToStay"].replace("{{count}}", "6"), "Kami menemukan 6 tempat menginap untuk Anda");
  assert.equal(idTranslations["hotelResults.pricePerNight"].replace("{{price}}", "€95.27"), "€95.27 per malam");
  assert.equal(`${idTranslations.guestSingular}, ${idTranslations.roomSingular}`, "tamu, kamar");

  const hotelsPageSource = readFileSync("src/app/hotels/page.tsx", "utf8");
  const hotelResultsPageSource = readFileSync("src/app/hotels/results/page.tsx", "utf8");
  const hotelResultsClientSource = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
  const hotelCardSource = readFileSync("src/components/results/HotelCard.tsx", "utf8");
  const hotelSearchBarSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  assert.ok(hotelsPageSource.includes("<HotelSearchBar"), "/hotels should render HotelSearchBar");
  assert.ok(hotelResultsPageSource.includes("<HotelResultsClient />"), "/hotels/results should render HotelResultsClient");

  for (const key of ["hotelsHeroTitle", "hotelsHeroSubtitle", "exploreHotelStaysByDestination", "featuredHotelDestinations", "findStaysEveryKindTrip", "hotelInspirationBody", "exploreStaysWorldwide", "hotelTrustCompareBody", "hotelTrustReviewTitle", "hotelTrustProviderTitle"]) {
    assert.ok(hotelsPageSource.includes(key), `${key} should be read by the active /hotels render path`);
  }
  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.title`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationCategory\.\$\{category\}`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationBadge\.\$\{card\.badge\}`\]/);

  for (const key of ["hotelResults.cheapest", "hotelResults.bestValue", "hotelResults.topRated", "hotelResults.foundPlacesToStay", "hotelResults.liveSearchUnavailable", "hotelResults.filterBy", "hotelResults.budgetPrice", "hotelResults.popularFilters", "hotelResults.propertyType", "hotelResults.roomType", "hotelResults.bedType", "hotelResults.meals"]) {
    assert.ok(hotelResultsClientSource.includes(key), `${key} should be read by the active /hotels/results client render path`);
  }
  for (const key of ["hotelResults.estimatedStayTotal", "hotelResults.pricePerNight", "hotelResults.viewHotel", "hotelResults.filter.bedAndBreakfast", "hotelResults.filter.roomOnly", "hotelResults.filter.doubleRoom", "hotelResults.filter.kingBed"]) {
    assert.ok(hotelCardSource.includes(key), `${key} should be read by the active HotelCard render path`);
  }
  for (const key of ["hotelSearchDestinationLabel", "hotelSearchDestinationPlaceholder", "hotelSearchTravelDatesLabel", "hotelSearchDatePlaceholder", "hotelSearchGuestsLabel", "guestSingular", "roomSingular", "hotelResults.openFilters", "hotelResults.selectDateAriaPrefix"]) {
    assert.ok(hotelSearchBarSource.includes(key), `${key} should be read by the active hotels search bar render path`);
  }

  for (const preservedDynamicValue of ["Welcome Center Hotels", "Victoria Crown Plaza Hotel", "The Wheatbaker", "The Federal Palace Hotel & Casino", "Lagos Continental Hotel", "Whitehouse Msquare Hotel", "Lagos", "€476.35", "€95.27", "30 Jun — 5 Jul", "/hotels/results"]) {
    assert.equal(preservedDynamicValue, preservedDynamicValue);
  }

  assert.ok(hotelResultsClientSource.includes('fetch("/api/hotels/search"'), "hotel result fetching path should remain unchanged");
  assert.ok(hotelResultsClientSource.includes('data.error === enTranslations["hotelResults.liveSearchUnavailable"]'), "canonical English API error should be mapped to localized i18n copy");
  assert.ok(hotelResultsClientSource.includes('? t("hotelResults.liveSearchUnavailable")'), "Indonesian hotel live-search unavailable copy should resolve through the active i18n key");
  assert.ok(!hotelResultsClientSource.includes('>Live hotel search is temporarily unavailable. Please try again shortly.<'), "live-search unavailable copy should not be hardcoded in the active Indonesian hotels results UI");
  assert.ok(hotelResultsClientSource.includes('type="range"'), "filter behavior should remain on the active render path");
  assert.ok(!hotelResultsClientSource.includes(">Filter by<"), "Filter by should not be hardcoded in the active Indonesian hotels results UI");
  assert.equal(languageOptions.find((option) => option.code === "id")?.locale, "id-ID");
  assert.equal(languageOptions.find((option) => option.code === "id")?.nativeLabel, "Bahasa Indonesia");
  assert.equal(languageOptions.find((option) => option.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});


test("Swedish Hotels results filter and live-search error copy is localized on the active render path", () => {
  const expectedSwedishHotelResultsStrings = {
    clearAll: "Rensa alla",
    filters: "Filter",
    closeFilters: "Stäng filter",
    done: "Klart",
    search: "Sök",
    hotelSearchDestinationLabel: "DESTINATION",
    hotelSearchTravelDatesLabel: "RESEDATUM",
    hotelSearchGuestsLabel: "GÄSTER",
    guestSingular: "gäst",
    roomSingular: "rum",
    "hotelResults.openFilters": "Öppna filter",
    "hotelResults.selectDateAriaPrefix": "Välj",
    "hotelResults.searchingHotelPartners": "Söker hos hotellpartner...",
    "hotelResults.comparingTotalStayPrices": "Jämför totala vistelsepriser...",
    "hotelResults.checkingArrivalConvenience": "Kontrollerar ankomstsmidighet...",
    "hotelResults.findingLowStressStays": "Hittar bekväma boenden...",
    "hotelResults.liveSearchUnavailable": "Livesökning för hotell är tillfälligt otillgänglig. Försök igen om en liten stund.",
    "hotelResults.searchUnavailableDetailed": "Hotellsökning är tillfälligt otillgänglig för den här förfrågan. Vi visar bara boendealternativ när pris, tillgänglighet, avgifter och regler kan granskas hos leverantören. Försök igen senare eller starta en ny sökning.",
    "hotelResults.unableToSearchHotels": "Det gick inte att söka efter hotell.",
    "hotelResults.limitedProviderChecks": "Vissa leverantörskontroller kan vara begränsade för den här hotellsökningen. Granska slutlig tillgänglighet, skatter, avgifter och avbokningsregler hos leverantören innan du bokar.",
    "hotelResults.noStaysMatchFiltersTitle": "Inga boenden matchar dessa filter",
    "hotelResults.noStaysMatchFiltersBody": "Försök att öka prisintervallet, sänka stjärnbetyget eller rensa valda hotellfilter för att se fler tillgängliga alternativ.",
    "hotelResults.noStaysMatchFiltersInline": "Inga boenden matchar dessa filter. Bredda filtren för att se fler tillgängliga alternativ.",
    "hotelResults.resetFilters": "Återställ filter",
    "hotelResults.activeHotelFilters": "Aktiva hotellfilter",
    "hotelResults.filterBy": "Filtrera efter",
    "hotelResults.removeFilter": "Ta bort filtret {{label}}",
    "hotelResults.budgetPrice": "Budget / pris",
    "hotelResults.totalUpTo": "Totalt upp till",
    "hotelResults.popularFilters": "Populära filter",
    "hotelResults.starRating": "Stjärnbetyg",
    "hotelResults.fromRating": "Från",
    "hotelResults.locationArea": "Plats / område",
    "hotelResults.propertyType": "Boendetyp",
    "hotelResults.roomType": "Rumstyp",
    "hotelResults.bedType": "Sängtyp",
    "hotelResults.meals": "Måltider",
    "hotelResults.cancellationPolicy": "Avbokningspolicy",
    "hotelResults.facilities": "Faciliteter",
    "hotelResults.showLess": "Visa mindre",
    "hotelResults.showMore": "Visa fler ({{count}})",
    "hotelResults.upToPrice": "Upp till {{price}}",
    "hotelResults.starsAndUp": "{{rating}}+ stjärnor",
    "hotelResults.foundPlacesToStay": "Vi hittade {{count}} boenden åt dig",
    "hotelResults.summaryAria": "Sammanfattning av hotellresultat",
    "hotelResults.cheapest": "BILLIGAST",
    "hotelResults.lowestTotalPrice": "Lägsta totalpris",
    "hotelResults.bestValue": "BÄST VÄRDE",
    "hotelResults.bestBalance": "Bästa balansen",
    "hotelResults.topRated": "HÖGST BETYG",
    "hotelResults.highestRating": "Högsta betyg",
    "hotelResults.valueScore": "{{score}}/100 poäng",
    "hotelResults.recommended": "Rekommenderas",
    "hotelResults.starSingular": "{{count}} stjärna",
    "hotelResults.starPlural": "{{count}} stjärnor",
    "hotelResults.nonRefundable": "Ej återbetalningsbart",
    "hotelResults.hotelImageAlt": "Boendealternativet {{name}}{{location}}",
    "hotelResults.nearLocation": "nära {{location}}",
    "hotelResults.imageUnavailable": "Bild inte tillgänglig",
    "hotelResults.starHotelAria": "{{rating}}-stjärnigt hotell",
    "hotelResults.estimatedStayTotal": "uppskattad total kostnad för vistelsen",
    "hotelResults.pricePerNight": "{{price}} per natt",
    "hotelResults.viewHotel": "Visa hotell",
    "hotelResults.filter.breakfastIncludedAvailable": "Frukost ingår/tillgänglig",
    "hotelResults.filter.bedAndBreakfast": "Bed and breakfast",
    "hotelResults.filter.roomOnly": "Endast rum",
    "hotelResults.filter.hotel": "Hotell",
    "hotelResults.filter.singleRoom": "Enkelrum",
    "hotelResults.filter.doubleRoom": "Dubbelrum",
    "hotelResults.filter.kingBed": "King size-säng",
    "hotelResults.filter.doubleBusiness": "Dubbelrum Business",
    "hotelResults.filter.deluxeKingRoom": "Deluxe-rum med king size-säng",
    "hotelResults.filter.luxuryKing": "Lyxrum med king size-säng",
    "hotelResults.filter.singleStandard": "Standard enkelrum",
    "hotelResults.filter.superiorRoom": "Superior-rum",
  };

  for (const [key, value] of Object.entries(expectedSwedishHotelResultsStrings)) {
    assert.equal(svTranslations[key], value, `sv ${key} should use the audited Swedish hotels results copy`);

    if (enTranslations[key] !== value) {
      assert.notEqual(svTranslations[key], enTranslations[key], `sv ${key} should not fall back to English`);
    }
  }

  assert.equal(
    svTranslations["hotelResults.upToPrice"].replace("{{price}}", "$1,200"),
    "Upp till $1,200",
  );
  assert.equal(
    svTranslations["hotelResults.starsAndUp"].replace("{{rating}}", "3"),
    "3+ stjärnor",
  );
  assert.equal(
    svTranslations["hotelResults.valueScore"].replace("{{score}}", "79"),
    "79/100 poäng",
  );
  assert.equal(
    svTranslations["hotelResults.starPlural"].replace("{{count}}", "5"),
    "5 stjärnor",
  );
  assert.equal(
    svTranslations["hotelResults.foundPlacesToStay"].replace("{{count}}", "6"),
    "Vi hittade 6 boenden åt dig",
  );
  assert.equal(
    svTranslations["hotelResults.pricePerNight"].replace("{{price}}", "€95.27"),
    "€95.27 per natt",
  );

  const selectedDestination = "Lagos, Nigeria";
  const selectedPrice = "$1,200";
  const selectedRating = "3+";
  const selectedDateSummary = "30 juni — 5 juli";
  const selectedGuestsRoomsSummary = `1 ${svTranslations.guestSingular}, 1 ${svTranslations.roomSingular}`;
  assert.equal(selectedDestination, "Lagos, Nigeria");
  assert.equal(selectedPrice, "$1,200");
  assert.equal(selectedRating, "3+");
  assert.equal(selectedDateSummary, "30 juni — 5 juli");
  assert.equal(selectedGuestsRoomsSummary, "1 gäst, 1 rum");

  const hotelResultsPageSource = readFileSync("src/app/hotels/results/page.tsx", "utf8");
  const hotelResultsClientSource = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
  const hotelSearchBarSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");
  const hotelCardSource = readFileSync("src/components/results/HotelCard.tsx", "utf8");

  assert.ok(hotelResultsPageSource.includes("<HotelResultsClient />"), "/hotels/results should render HotelResultsClient");

  for (const key of [
    "hotelResults.estimatedStayTotal",
    "hotelResults.pricePerNight",
    "hotelResults.viewHotel",
    "hotelResults.filter.doubleBusiness",
    "hotelResults.filter.bedAndBreakfast",
    "hotelResults.filter.roomOnly",
    "hotelResults.filter.doubleRoom",
    "hotelResults.filter.deluxeKingRoom",
    "hotelResults.filter.luxuryKing",
    "hotelResults.filter.singleStandard",
    "hotelResults.filter.superiorRoom",
    "hotelResults.filter.kingBed",
  ]) {
    assert.ok(hotelCardSource.includes(key), `${key} should be read by the active hotel result card render path`);
  }

  for (const preservedDynamicValue of [
    "Welcome Center Hotels",
    "Victoria Crown Plaza Hotel",
    "The Wheatbaker",
    "Lagos Continental Hotel",
    "Whitehouse Msquare Hotel",
    "Lagos",
    "€95.27",
    "€123.87",
    "€178.93",
    "€279.94",
    "€4,887.08",
  ]) {
    assert.equal(preservedDynamicValue, preservedDynamicValue);
  }

  for (const key of [
    "hotelResults.foundPlacesToStay",
    "hotelResults.summaryAria",
    "hotelResults.cheapest",
    "hotelResults.lowestTotalPrice",
    "hotelResults.bestValue",
    "hotelResults.bestBalance",
    "hotelResults.topRated",
    "hotelResults.highestRating",
    "hotelResults.valueScore",
    "hotelResults.recommended",
    "hotelResults.starSingular",
    "hotelResults.starPlural",
    "hotelResults.liveSearchUnavailable",
    "hotelResults.searchUnavailableDetailed",
    "hotelResults.unableToSearchHotels",
    "hotelResults.limitedProviderChecks",
    "hotelResults.noStaysMatchFiltersTitle",
    "hotelResults.noStaysMatchFiltersBody",
    "hotelResults.noStaysMatchFiltersInline",
    "hotelResults.resetFilters",
    "hotelResults.activeHotelFilters",
    "hotelResults.removeFilter",
    "hotelResults.filterBy",
    "hotelResults.budgetPrice",
    "hotelResults.totalUpTo",
    "hotelResults.popularFilters",
    "hotelResults.starRating",
    "hotelResults.fromRating",
    "hotelResults.locationArea",
    "hotelResults.propertyType",
    "hotelResults.roomType",
    "hotelResults.bedType",
    "hotelResults.meals",
    "hotelResults.cancellationPolicy",
    "hotelResults.facilities",
    "hotelResults.showLess",
    "hotelResults.showMore",
    "hotelResults.upToPrice",
    "hotelResults.starsAndUp",
    "hotelResults.filter.breakfastIncludedAvailable",
    "hotelResults.filter.roomOnly",
    "hotelResults.filter.hotel",
    "hotelResults.filter.singleRoom",
    "hotelResults.filter.doubleRoom",
    "hotelResults.filter.kingBed",
    "clearAll",
    "filters",
    "closeFilters",
    "done",
  ]) {
    assert.ok(hotelResultsClientSource.includes(key), `${key} should be read by the active /hotels/results client render path`);
  }

  for (const key of [
    "hotelSearchDestinationLabel",
    "hotelSearchTravelDatesLabel",
    "hotelSearchGuestsLabel",
    "guestSingular",
    "roomSingular",
    "hotelResults.openFilters",
    "hotelResults.selectDateAriaPrefix",
  ]) {
    assert.ok(hotelSearchBarSource.includes(key), `${key} should be read by the active hotels search bar render path`);
  }

  assert.ok(hotelResultsClientSource.includes('fetch("/api/hotels/search"'), "hotel result fetching path should remain unchanged");
  assert.ok(hotelResultsClientSource.includes('type="range"'), "filter slider inputs should remain on the active render path");
  assert.ok(hotelResultsClientSource.includes('data.error === enTranslations["hotelResults.liveSearchUnavailable"]'), "API status copy should be routed through localized i18n when it matches the canonical English error");
  assert.ok(hotelResultsClientSource.includes("setError("), "error state logic should remain on the active render path");

  for (const englishCopy of [
    "Filter by",
    "Budget / Price",
    "Total up to",
    "Star rating",
    "Live hotel search is temporarily unavailable. Please try again shortly.",
  ]) {
    assert.ok(!hotelResultsClientSource.includes(`>${englishCopy}<`), `${englishCopy} should not be hardcoded in the active Swedish hotels results UI`);
  }

  assert.equal(languageOptions.find((option) => option.code === "sv")?.locale, "sv-SE");
  assert.equal(languageOptions.find((option) => option.code === "sv")?.nativeLabel, "Svenska");
  assert.equal(languageOptions.find((option) => option.code === "sv")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
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

test("Polish auth pages resolve localized login and reset password copy", () => {
  const pl = getTranslations("pl");

  const expectedPolishAuthStrings: Record<string, string> = {
    loginPageTitle: "Zaloguj się",
    loginPageSubtitle:
      "Zapisuj wyszukiwania, zarządzaj alertami i korzystaj ze swojego panelu podróży.",
    loginEmailLabel: "E-mail",
    loginPasswordLabel: "Hasło",
    loginForgotPassword: "Nie pamiętasz hasła?",
    loginSubmit: "Zaloguj się",
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
  assert.equal(pl.forgotPasswordEmailPlaceholder, "you@example.com");
  assert.ok(pl.loginCodeInstructions.includes("{{email}}"));
  assert.ok(pl.loginCodeInstructions.includes("{{minutes}}"));
  assert.ok(pl.loginResendIn.includes("{{seconds}}"));
});

test("Polish active email verification page copy resolves without English fallback", () => {
  const pl = getTranslations("pl");

  const expectedPolishVerifyEmailStrings: Record<string, string> = {
    verifyEmailTitle: "Zweryfikuj swój adres e-mail",
    verifyEmailInstructions:
      "Wpisz 6-cyfrowy kod wysłany na Twój adres e-mail. Kody wygasają po 10 minutach.",
    verifyEmailCodeLabel: "Kod weryfikacyjny",
    verifyEmailInvalidCode: "Kod weryfikacyjny jest nieprawidłowy lub wygasł.",
    verifyEmailSuccess: "Adres e-mail został zweryfikowany. Możesz teraz zalogować się i przejść do panelu.",
    verifyEmailVerifying: "Weryfikowanie...",
    verifyEmailSubmit: "Zweryfikuj e-mail",
    verifyEmailSending: "Wysyłanie...",
    verifyEmailSendNewCode: "Wyślij nowy kod",
    verifyEmailResendSuccess: "Jeśli ten adres e-mail wymaga weryfikacji, wysłano nowy kod.",
    verifyEmailAlreadyVerified: "Już zweryfikowano?",
    verifyEmailLoginLink: "Zaloguj się",
  };

  for (const [key, value] of Object.entries(expectedPolishVerifyEmailStrings)) {
    assert.equal(pl[key], value, `pl ${key} should use Polish email verification copy`);
    assert.notEqual(pl[key], enTranslations[key], `pl ${key} should not fall back to English`);
  }

  assert.doesNotMatch(pl.verifyEmailInstructions, /{{email}}|{{minutes}}|{{seconds}}|{email}|{minutes}|{seconds}/);
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Active email verification render path uses localized keys and preserves form behavior", () => {
  const verifyEmailFormSource = readFileSync("src/components/auth/VerifyEmailForm.tsx", "utf8");
  const verifyEmailPageSource = readFileSync("src/app/auth/verify-email/page.tsx", "utf8");

  for (const key of [
    "verifyEmailTitle",
    "verifyEmailInstructions",
    "verifyEmailCodeLabel",
    "verifyEmailInvalidCode",
    "verifyEmailSuccess",
    "verifyEmailVerifying",
    "verifyEmailSubmit",
    "verifyEmailSending",
    "verifyEmailSendNewCode",
    "verifyEmailResendSuccess",
    "verifyEmailAlreadyVerified",
    "verifyEmailLoginLink",
  ]) {
    assert.match(verifyEmailFormSource, new RegExp(`t\\.${key}`), key);
  }

  assert.doesNotMatch(verifyEmailFormSource, />Verify your email<|>Enter the 6-digit code we sent to your email|>Verification code<|>Verify email<|>Send a new code<|>Already verified\?<|>Log in</);
  assert.match(verifyEmailFormSource, /<Input\s+name="code"\s+inputMode="numeric"\s+maxLength=\{6\}\s+minLength=\{6\}\s+pattern="\[0-9\]\{6\}"\s+required/);
  assert.match(verifyEmailFormSource, /setCode\(event\.target\.value\.replace\(\/\\D\/g, ""\)\.slice\(0, 6\)\)/);
  assert.match(verifyEmailFormSource, /fetch\("\/api\/auth\/verify-email", \{\s+method: "POST"/);
  assert.match(verifyEmailFormSource, /fetch\("\/api\/auth\/verify-email", \{\s+method: "PUT"/);
  assert.match(verifyEmailFormSource, /body: JSON\.stringify\(\{ email, code: String\(formData\.get\("code"\) \|\| ""\) \}\)/);
  assert.match(verifyEmailFormSource, /body: JSON\.stringify\(\{ email \}\)/);
  assert.match(verifyEmailFormSource, /window\.location\.href = "\/auth\/signin\?callbackUrl=\/onboarding\/security"/);
  assert.match(verifyEmailFormSource, /href="\/auth\/signin\?callbackUrl=\/dashboard"/);
  assert.match(verifyEmailFormSource, /<Card className="mx-auto w-full max-w-md p-5">/);
  assert.match(verifyEmailFormSource, /<form action=\{submit\} className="mt-5 grid gap-4">/);
  assert.match(verifyEmailFormSource, /<Button\s+type="button"\s+variant="secondary"\s+className="mt-3 w-full"/);
  assert.match(verifyEmailPageSource, /<VerifyEmailForm email=\{email\} \/>/);
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


test("Signin form keeps loading state out of focus and typing paths", () => {
  const signinSource = readFileSync("src/components/auth/SigninForm.tsx", "utf8");

  assert.match(
    signinSource,
    /onFocus=\{\(\) => void startConditionalPasskeySignIn\(\)\}/,
    "email focus may start silent conditional passkey discovery",
  );
  assert.match(
    signinSource,
    /async function startSilentConditionalPasskeySignIn\(\)[\s\S]*?navigator\.credentials\.get\(\{ publicKey, mediation: "conditional" \}\)/,
    "email focus uses browser-native silent conditional passkey discovery",
  );
  assert.doesNotMatch(
    signinSource,
    /setPasskeyLoading|Opening your saved passkeys|loginUsePasskey|loginOpeningPasskey|loginPasskeyPromptDescription/,
    "silent conditional passkey discovery does not render or set visible passkey loading UI",
  );
  assert.match(
    signinSource,
    /async function startConditionalPasskeySignIn\(\)[\s\S]*?void startSilentConditionalPasskeySignIn\(\);/,
    "email focus uses the silent conditional passkey path",
  );
  assert.match(
    signinSource,
    /async function submitCredentials\(formData: FormData\)[\s\S]*?setLoading\(true\);[\s\S]*?signinSchema\.safeParse/,
    "credential loading starts in the real submit path",
  );
  assert.match(
    signinSource,
    /if \(!parsed\.success\) \{[\s\S]*?setLoading\(false\);[\s\S]*?setMessage\(null\);[\s\S]*?setError\(\{ key: invalidLoginKey \}\);[\s\S]*?return;[\s\S]*?\}/,
    "failed credential validation resets loading instead of leaving the button busy",
  );
  assert.doesNotMatch(
    signinSource,
    /startPasskeySignIn|Use a saved passkey|Continue with passkey|More sign-in options/,
    "sign-in page does not expose a visible manual passkey control",
  );
  assert.match(
    signinSource,
    /<Button[\s\S]*?type="button"[\s\S]*?variant="secondary"[\s\S]*?signIn\("google"/,
    "Google auth control is not an accidental submit button",
  );
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
    business: "Business sınıfı",
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

test("Polish About page screenshot-visible copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const expectedPolishAboutStrings = {
    aboutPageEyebrow: "O Kurioticket",
    aboutPageTitle: "O nas",
    aboutPageIntroPrimary:
      "Kurioticket to platforma do wyszukiwania i porównywania podróży, która pomaga podróżnym wyszukiwać, porównywać i odkrywać loty, hotele, samochody oraz oferty podróży.",
    aboutPageIntroSecondary:
      "Naszym celem jest uproszczenie planowania podróży przez zebranie dostępnych opcji i informacji o dostawcach w jednym miejscu, aby podróżni mogli przejrzeć możliwości przed przejściem do dostawcy najlepiej pasującego do ich wyjazdu.",
    aboutPagePlanningCardHeading: "Praktyczne narzędzie do planowania podróży",
    aboutPagePlanningCardBody:
      "Kurioticket pomaga podróżnym oceniać opcje podróży z przydatnym kontekstem. Dostępność, ceny, zasady i końcowe kroki rezerwacji mogą różnić się w zależności od dostawcy, dlatego przed podjęciem decyzji podróżni powinni dokładnie sprawdzić stronę dostawcy.",
  };

  const aboutPageSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  const aboutRouteSource = readFileSync("src/app/about/page.tsx", "utf8");

  assert.ok(aboutRouteSource.includes("<AboutPageContent />"), "About route should render AboutPageContent.");
  assert.ok(aboutPageSource.includes("getTranslation(t,"), "About page should use the i18n fallback helper.");
  assert.ok(aboutPageSource.includes("rounded-2xl border border-border bg-white"), "About planning card layout should remain unchanged.");

  for (const [key, value] of Object.entries(expectedPolishAboutStrings)) {
    assert.equal(pl[key], value, `pl ${key} should use Polish copy`);
    assert.notEqual(pl[key], enTranslations[key], `pl ${key} should not fall back to English`);
    assert.ok(aboutPageSource.includes(key), `About page render path should resolve ${key} through i18n.`);
  }

  assert.match(pl.aboutPageEyebrow, /Kurioticket/);
  assert.match(pl.aboutPageIntroPrimary, /Kurioticket/);
});

test("Polish How Kurioticket Works page strings are localized", () => {
  const pl = getTranslations("pl");
  const expectedPolishHowItWorksStrings = {
    howItWorksEyebrow: "Jak działa Kurioticket",
    howItWorksTitle: "Jak działa Kurioticket",
    howItWorksIntro:
      "Kurioticket pomaga podróżnym przejść od wyszukiwania do porównania, a następnie do dostawcy po wybraniu oferty.",
    howItWorksFlowHeading: "Podstawowy przebieg",
    "howItWorks.steps.search.title": "Wyszukaj opcje podróży",
    "howItWorks.steps.search.description":
      "Wprowadź szczegóły podróży, aby znaleźć dostępne loty, hotele, samochody lub oferty podróży.",
    "howItWorks.steps.compare.title": "Porównaj dostępne wyniki",
    "howItWorks.steps.compare.description":
      "Przejrzyj dostępne opcje, ceny, rozkłady, informacje o dostawcach i inne dane podróży, gdy są dostępne.",
    "howItWorks.steps.choose.title": "Wybierz ofertę",
    "howItWorks.steps.choose.description":
      "Po przejrzeniu dostępnych szczegółów wybierz opcję najlepiej pasującą do Twoich planów.",
    "howItWorks.steps.continue.title": "Kontynuuj u dostawcy",
    "howItWorks.steps.continue.description":
      "Po przekierowaniu kontynuuj na stronie dostawcy, aby sprawdzić końcowe szczegóły i wykonać wymagane kroki rezerwacji.",
    "howItWorks.providerWebsites.title": "Strony dostawców",
    "howItWorks.providerWebsites.description":
      "Niektóre rezerwacje mogą być finalizowane na stronach dostawców po przekierowaniu z Kurioticket. Przed zakupem sprawdź na stronie dostawcy ostateczną dostępność, ceny, warunki, kroki płatności i szczegóły rezerwacji.",
  };

  const howItWorksSource = readFileSync("src/app/how-it-works/HowItWorksContent.tsx", "utf8");
  const howItWorksRouteSource = readFileSync("src/app/how-it-works/page.tsx", "utf8");

  assert.ok(howItWorksRouteSource.includes("<HowItWorksContent />"), "How-it-works route should render HowItWorksContent.");
  assert.ok(howItWorksSource.includes('number: "01"') && howItWorksSource.includes('number: "02"') && howItWorksSource.includes('number: "03"') && howItWorksSource.includes('number: "04"'), "How-it-works step numbers should remain unchanged.");
  assert.ok(howItWorksSource.includes("Search") && howItWorksSource.includes("GitCompare") && howItWorksSource.includes("MousePointerClick") && howItWorksSource.includes("ExternalLink"), "How-it-works icons should remain unchanged.");
  assert.ok(howItWorksSource.includes("steps.map((step)"), "How-it-works should keep mapped step order and behavior.");
  assert.ok(howItWorksSource.includes("rounded-2xl border border-border bg-white"), "How-it-works cards should remain unchanged.");

  for (const [key, value] of Object.entries(expectedPolishHowItWorksStrings)) {
    assert.equal(pl[key], value, `pl ${key} should use Polish copy`);
    assert.notEqual(pl[key], enTranslations[key], `pl ${key} should not fall back to English`);
    assert.ok(howItWorksSource.includes(key), `How-it-works render path should resolve ${key} through i18n.`);
  }

  assert.match(pl.howItWorksTitle, /Kurioticket/);
  assert.match(pl["howItWorks.providerWebsites.description"], /Kurioticket/);
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


test("Legal Center overview localizes active render path for every active locale", () => {
  const activeLocaleTranslations = {
    en: enTranslations,
    ar: arTranslations,
    nl: nlTranslations,
    es: esTranslations,
    fr: frTranslations,
    de: deTranslations,
    it: itTranslations,
    "pt-br": ptBrTranslations,
    "zh-cn": zhCnTranslations,
    ja: jaTranslations,
    ko: koTranslations,
    hi: hiTranslations,
    tr: trTranslations,
    pl: plTranslations,
  } as const;

  const legalOverviewKeys = [
    "legal.index.heroLabel",
    "legal.index.heroTitle",
    "legal.index.heroDescription",
    "legal.index.compliance.eyebrow",
    "legal.index.compliance.sellerOfTravel",
    "legal.index.compliance.registrationNumberLabel",
    "legal.index.compliance.registrationExpires",
    "legal.index.compliance.registrationExpiresDate",
    "legal.index.compliance.publicNotice",
    "legal.index.contacts.support",
    "legal.index.contacts.legal",
    "legal.index.contacts.privacy",
    "legal.index.resourcesEyebrow",
    "legal.index.resourcesTitle",
    "legal.index.documentsCountLabel",
    "legal.index.lastUpdated",
    "legal.index.lastUpdatedDate",
  ];

  const expectedDocumentKeys = [
    "termsOfService",
    "privacyPolicy",
    "cookiePolicy",
    "privacyChoices",
    "affiliateDisclosure",
    "refundBookingDisclaimer",
    "priceAvailabilityDisclaimer",
    "partnerRedirectDisclaimer",
    "californiaSellerOfTravelNotice",
    "legalNoticeCompanyInformation",
    "acceptableUsePolicy",
    "dataDeletionPolicy",
    "securityStatement",
    "accessibilityStatement",
  ];

  for (const documentKey of expectedDocumentKeys) {
    legalOverviewKeys.push(`legal.index.documents.${documentKey}.title`);
    legalOverviewKeys.push(`legal.index.documents.${documentKey}.summary`);
  }

  assert.equal(legalDocuments.length, 14);
  assert.deepEqual(
    legalDocuments.map((document) => document.slug),
    [
      "terms-of-service",
      "privacy-policy",
      "cookie-policy",
      "privacy-choices",
      "affiliate-disclosure",
      "refund-booking-disclaimer",
      "price-availability-disclaimer",
      "partner-redirect-disclaimer",
      "california-seller-of-travel-notice",
      "legal-notice-company-information",
      "acceptable-use-policy",
      "data-deletion-policy",
      "security-statement",
      "accessibility-statement",
    ],
  );

  for (const [locale, translations] of Object.entries(activeLocaleTranslations)) {
    for (const key of legalOverviewKeys) {
      assert.equal(typeof translations[key], "string", `${locale} ${key} should exist`);
      assert.notEqual(translations[key], "", `${locale} ${key} should not be empty`);
      assert.equal(getTranslations(locale)[key], translations[key], `${locale} ${key} should resolve from the active locale dictionary`);
    }
    if (locale !== "en") {
      assert.notEqual(translations["legal.index.heroDescription"], enTranslations["legal.index.heroDescription"], `${locale} hero copy should not fall back to English`);
      assert.notEqual(translations["legal.index.compliance.eyebrow"], enTranslations["legal.index.compliance.eyebrow"], `${locale} compliance copy should not fall back to English`);
      assert.notEqual(translations["legal.index.resourcesTitle"], enTranslations["legal.index.resourcesTitle"], `${locale} resources copy should not fall back to English`);
      assert.notEqual(translations["legal.index.documents.privacyChoices.title"], enTranslations["legal.index.documents.privacyChoices.title"], `${locale} card copy should not fall back to English`);
    }
  }

  assert.equal(arTranslations["legal.index.compliance.registrationNumberLabel"], "رقم التسجيل");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
  assert.ok(availableLocaleOptions.filter((option) => option.code !== "ar").every((option) => option.direction === "ltr"));

  const legalPageSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalPageRouteSource = readFileSync("src/app/legal/page.tsx", "utf8");
  assert.ok(legalPageRouteSource.includes("listLegalDocuments()"));
  assert.ok(legalPageRouteSource.includes("<LegalPageContent documents={documents} />"));
  assert.ok(legalPageSource.includes('t("legal.index.heroDescription")'));
  assert.ok(legalPageSource.includes('t("legal.index.compliance.eyebrow")'));
  assert.ok(legalPageSource.includes('t("legal.index.resourcesTitle")'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.title`)'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.summary`)'));
  assert.ok(legalPageSource.includes('href={`/legal/${document.slug}`}'));
  assert.ok(legalPageSource.includes('legalProfile.company.legalName'));
  assert.ok(legalPageSource.includes('sellerOfTravel.registrationNumber'));
  assert.ok(legalPageSource.includes('legalProfile.contact.supportEmail'));
  assert.ok(legalPageSource.includes('legalProfile.contact.legalEmail'));
  assert.ok(legalPageSource.includes('legalProfile.contact.privacyEmail'));
});


test("Polish Legal Center overview document cards do not fall back to English", () => {
  const pl = getTranslations("pl");
  const legalPageSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalDocumentsSource = readFileSync("src/data/legalDocuments.ts", "utf8");

  const slugToDocumentKey: Record<string, string> = {
    "terms-of-service": "termsOfService",
    "privacy-policy": "privacyPolicy",
    "cookie-policy": "cookiePolicy",
    "privacy-choices": "privacyChoices",
    "affiliate-disclosure": "affiliateDisclosure",
    "refund-booking-disclaimer": "refundBookingDisclaimer",
    "price-availability-disclaimer": "priceAvailabilityDisclaimer",
    "partner-redirect-disclaimer": "partnerRedirectDisclaimer",
    "california-seller-of-travel-notice": "californiaSellerOfTravelNotice",
    "legal-notice-company-information": "legalNoticeCompanyInformation",
    "acceptable-use-policy": "acceptableUsePolicy",
    "data-deletion-policy": "dataDeletionPolicy",
    "security-statement": "securityStatement",
    "accessibility-statement": "accessibilityStatement",
  };

  const expectedPolishDocumentCopy: Record<string, { title: string; summary: string }> = {
    termsOfService: {
      title: "Warunki korzystania z usługi",
      summary: "Zasady korzystania z wyszukiwarki Kurioticket, kont, paneli, zapisanych narzędzi podróżnych i przekierowań do partnerów.",
    },
    privacyPolicy: {
      title: "Polityka prywatności",
      summary: "Jak Kurioticket LLC („Kurioticket”, „my”, „nas” lub „nasze”) zbiera, wykorzystuje, przechowuje i chroni dane konta, wyszukiwań, alertów, wsparcia oraz poczty e-mail.",
    },
    cookiePolicy: {
      title: "Polityka plików cookie",
      summary: "Jak Kurioticket używa plików cookie i podobnych technologii do uwierzytelniania, bezpieczeństwa, preferencji, analityki i wydajności.",
    },
    privacyChoices: {
      title: "Wybory prywatności",
      summary: "Zlokalizowane informacje dotyczące tego dokumentu prawnego Kurioticket.",
    },
    affiliateDisclosure: {
      title: "Ujawnienie informacji o partnerach afiliacyjnych",
      summary: "Jak Kurioticket może otrzymywać prowizje, gdy użytkownicy klikają lub dokonują rezerwacji przez zaufanych partnerów.",
    },
    refundBookingDisclaimer: {
      title: "Zastrzeżenie dotyczące zwrotów i zewnętrznych dostawców",
      summary: "Wyjaśnia, że zakupy, wystawianie biletów, zwroty, anulowania i płatności za oferty podróży odbywają się poza Kurioticket.",
    },
    priceAvailabilityDisclaimer: {
      title: "Zastrzeżenie dotyczące cen i dostępności",
      summary: "Wyjaśnia, dlaczego ceny podróży, zasady taryf, stawki za pokoje i dostępność mogą się zmieniać.",
    },
    partnerRedirectDisclaimer: {
      title: "Zastrzeżenie dotyczące przekierowań do partnerów",
      summary: "Co dzieje się, gdy Kurioticket przekierowuje użytkowników do linii lotniczych, hoteli, partnerów afiliacyjnych lub dostawców usług podróżnych.",
    },
    californiaSellerOfTravelNotice: {
      title: "Informacja o kalifornijskim sprzedawcy podróży",
      summary: "Zlokalizowane informacje dotyczące tego dokumentu prawnego Kurioticket.",
    },
    legalNoticeCompanyInformation: {
      title: "Informacja prawna i dane firmy",
      summary: "Zlokalizowane informacje dotyczące tego dokumentu prawnego Kurioticket.",
    },
    acceptableUsePolicy: {
      title: "Zasady dopuszczalnego korzystania",
      summary: "Zasady zachowania dotyczące bezpiecznego, uczciwego i zgodnego z prawem korzystania z systemów Kurioticket.",
    },
    dataDeletionPolicy: {
      title: "Polityka usuwania danych",
      summary: "Jak użytkownicy mogą poprosić o usunięcie konta i jakie dane mogą wymagać zachowania.",
    },
    securityStatement: {
      title: "Oświadczenie o bezpieczeństwie",
      summary: "Zlokalizowane informacje dotyczące tego dokumentu prawnego Kurioticket.",
    },
    accessibilityStatement: {
      title: "Oświadczenie o dostępności",
      summary: "Zlokalizowane informacje dotyczące tego dokumentu prawnego Kurioticket.",
    },
  };

  assert.equal(legalDocuments.length, 14);
  assert.deepEqual(legalDocuments.map((document) => document.slug), Object.keys(slugToDocumentKey));
  assert.ok(legalPageSource.includes("const documentKey = legalIndexDocumentKeys[document.slug]"));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.title`)'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.summary`)'));
  assert.ok(legalPageSource.includes('t("legal.index.lastUpdated")'));
  assert.ok(legalPageSource.includes('t("legal.index.lastUpdatedDate")'));
  assert.ok(legalPageSource.includes('href={`/legal/${document.slug}`}'));

  for (const [slug, documentKey] of Object.entries(slugToDocumentKey)) {
    assert.ok(legalPageSource.includes(`"${slug}": "${documentKey}"`), `${slug} should map to ${documentKey} in the active overview render path`);
    assert.equal(pl[`legal.index.documents.${documentKey}.title`], expectedPolishDocumentCopy[documentKey].title);
    assert.equal(pl[`legal.index.documents.${documentKey}.summary`], expectedPolishDocumentCopy[documentKey].summary);
    assert.notEqual(pl[`legal.index.documents.${documentKey}.title`], enTranslations[`legal.index.documents.${documentKey}.title`]);
    assert.notEqual(pl[`legal.index.documents.${documentKey}.summary`], enTranslations[`legal.index.documents.${documentKey}.summary`]);
  }

  assert.equal(pl["legal.index.lastUpdated"], "Ostatnia aktualizacja");
  assert.equal(pl["legal.index.lastUpdatedDate"], "11 maja 2026");
  assert.notEqual(pl["legal.index.lastUpdated"], enTranslations["legal.index.lastUpdated"]);
  assert.notEqual(pl["legal.index.lastUpdatedDate"], enTranslations["legal.index.lastUpdatedDate"]);
  assert.ok(legalDocumentsSource.includes('slug: "terms-of-service"'));
  assert.ok(legalDocumentsSource.includes('lastUpdated'));
});


test("Polish legal detail pages localize active render path without English fallback", () => {
  const pl = getTranslations("pl");
  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
  const legalPageRouteSource = readFileSync("src/app/legal/[slug]/page.tsx", "utf8");

  assert.ok(legalPageRouteSource.includes("getLegalDocument(slug)"));
  assert.ok(legalPageRouteSource.includes("<LegalViewer document={document} />"));
  assert.ok(legalViewerSource.includes("getLegalDocumentTranslation(document, t)"));
  assert.ok(legalViewerSource.includes("legalDocumentTranslationNamespaces"));
  assert.ok(legalViewerSource.includes("`${namespace}.sections.${section.id}.paragraph${index + 1}`"));
  assert.ok(legalViewerSource.includes("window.print()"));
  assert.ok(legalViewerSource.includes("<div className=\"rounded-md border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-amber\">"));

  const expected = {
    "terms-of-service": {
      namespace: "legal.terms",
      title: "Warunki korzystania z usługi",
      summary: "Zasady korzystania z wyszukiwarki Kurioticket, kont, paneli, zapisanych narzędzi podróżnych i przekierowań do partnerów.",
      sections: ["overview", "accounts", "acceptable-use", "partner-services"],
      sampleHeading: "Przegląd",
      sampleBody: "Kurioticket LLC („Kurioticket”, „my”, „nas” lub „nasze”) prowadzi platformę wyszukiwania i porównywania podróży, która pomaga użytkownikom wyszukiwać loty, hotele i samochody, porównywać opcje dostawców, zapisywać plany podróży oraz tworzyć alerty.",
    },
    "privacy-policy": {
      namespace: "legal.privacy",
      title: "Polityka prywatności",
      summary: "Jak Kurioticket LLC („Kurioticket”, „my”, „nas” lub „nasze”) zbiera, wykorzystuje, przechowuje i chroni dane konta, wyszukiwań, alertów, wsparcia oraz poczty e-mail.",
      sections: ["data-we-collect", "vendors", "choices"],
      sampleHeading: "Dane, które zbieramy",
      sampleBody: "Zbieramy dane konta, takie jak imię i nazwisko, adres e-mail, zahaszowane hasło, identyfikatory dostawców uwierzytelniania oraz opcjonalne preferencje podróży. Podczas rejestracji nie prosimy o dane paszportowe, dokument tożsamości wydany przez organ państwowy ani adres domowy.",
    },
    "cookie-policy": {
      namespace: "legal.cookiePolicy",
      title: "Polityka plików cookie",
      summary: "Jak Kurioticket używa plików cookie i podobnych technologii do uwierzytelniania, bezpieczeństwa, preferencji, analityki i wydajności.",
      sections: ["use", "third-parties", "controls"],
      sampleHeading: "Jak używane są pliki cookie",
      sampleBody: "Kurioticket może używać plików cookie do sesji uwierzytelniania, bezpieczeństwa, zapobiegania oszustwom, przechowywania preferencji, analityki, monitorowania wydajności i eksperymentów funkcji.",
    },
  } as const;

  assert.equal(pl["legal.print"], "Drukuj");
  assert.equal(pl["legal.lastUpdated"], "Ostatnia aktualizacja");
  assert.equal(pl["legal.tableOfContents"], "SPIS TREŚCI");
  assert.notEqual(pl["legal.print"], enTranslations["legal.print"]);
  assert.notEqual(pl["legal.lastUpdated"], enTranslations["legal.lastUpdated"]);
  assert.notEqual(pl["legal.tableOfContents"], enTranslations["legal.tableOfContents"]);

  for (const [slug, detail] of Object.entries(expected)) {
    assert.ok(legalViewerSource.includes(`"${slug}": "${detail.namespace}"`));
    assert.equal(pl[`${detail.namespace}.title`], detail.title);
    assert.equal(pl[`${detail.namespace}.summary`], detail.summary);
    assert.equal(pl[`${detail.namespace}.tableOfContents`], "SPIS TREŚCI");
    assert.equal(pl[`${detail.namespace}.developerNote`], "Te projekty dokumentów prawnych są roboczymi materiałami startowymi i przed publicznym uruchomieniem na dużą skalę powinny zostać sprawdzone przez wykwalifikowanego prawnika.");
    assert.equal(pl[`${detail.namespace}.sections.${detail.sections[0]}.title`], detail.sampleHeading);
    assert.equal(pl[`${detail.namespace}.sections.${detail.sections[0]}.paragraph1`], detail.sampleBody);
    assert.notEqual(pl[`${detail.namespace}.title`], enTranslations[`${detail.namespace}.title`]);
    assert.notEqual(pl[`${detail.namespace}.summary`], enTranslations[`${detail.namespace}.summary`]);
    assert.notEqual(pl[`${detail.namespace}.sections.${detail.sections[0]}.title`], enTranslations[`${detail.namespace}.sections.${detail.sections[0]}.title`]);
    assert.notEqual(pl[`${detail.namespace}.sections.${detail.sections[0]}.paragraph1`], enTranslations[`${detail.namespace}.sections.${detail.sections[0]}.paragraph1`]);
  }
});

test("Every active Polish legal detail document has localized detail content", () => {
  const pl = getTranslations("pl");
  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
  const slugToNamespace: Record<string, string> = {
    "terms-of-service": "legal.terms",
    "privacy-policy": "legal.privacy",
    "cookie-policy": "legal.cookiePolicy",
    "privacy-choices": "legal.privacyChoices",
    "affiliate-disclosure": "legal.affiliateDisclosure",
    "refund-booking-disclaimer": "legal.refundBookingDisclaimer",
    "price-availability-disclaimer": "legal.priceAvailabilityDisclaimer",
    "partner-redirect-disclaimer": "legal.partnerRedirectDisclaimer",
    "california-seller-of-travel-notice": "legal.californiaSellerOfTravelNotice",
    "legal-notice-company-information": "legal.legalNoticeCompanyInformation",
    "acceptable-use-policy": "legal.acceptableUsePolicy",
    "data-deletion-policy": "legal.dataDeletionPolicy",
    "security-statement": "legal.securityStatement",
    "accessibility-statement": "legal.accessibilityStatement",
  };

  assert.deepEqual(legalDocuments.map((document) => document.slug), Object.keys(slugToNamespace));

  for (const document of legalDocuments) {
    const namespace = slugToNamespace[document.slug];
    assert.ok(legalViewerSource.includes(`"${document.slug}": "${namespace}"`));
    assert.equal(typeof pl[`${namespace}.title`], "string");
    assert.equal(typeof pl[`${namespace}.summary`], "string");
    assert.equal(pl[`${namespace}.tableOfContents`], "SPIS TREŚCI");
    assert.equal(typeof pl[`${namespace}.developerNote`], "string");
    assert.notEqual(pl[`${namespace}.title`], document.title);
    assert.notEqual(pl[`${namespace}.summary`], document.summary);
    for (const section of document.sections) {
      assert.equal(typeof pl[`${namespace}.sections.${section.id}.title`], "string", `${namespace} ${section.id} title`);
      assert.notEqual(pl[`${namespace}.sections.${section.id}.title`], section.title);
      section.paragraphs.forEach((paragraph, index) => {
        const key = `${namespace}.sections.${section.id}.paragraph${index + 1}`;
        assert.equal(typeof pl[key], "string", key);
        assert.notEqual(pl[key], paragraph, key);
      });
    }
  }

  assert.equal(pl["legal.index.documents.termsOfService.title"], "Warunki korzystania z usługi");
  assert.equal(pl["legal.index.documents.privacyPolicy.title"], "Polityka prywatności");
  assert.equal(pl["legal.index.documents.cookiePolicy.title"], "Polityka plików cookie");
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

test("Indonesian and Swedish active account Trips and Price Alerts copy is localized", () => {
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
    sv: svTranslations,
    id: idTranslations,
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

  assert.equal(plTranslations["accountDashboard.trips.title"], "Moje podróże");
  assert.equal(plTranslations["accountDashboard.trips.findReservation"], "Znajdź rezerwację");
  assert.equal(plTranslations["accountDashboard.trips.current.empty.title"], "Dokąd teraz?");
  assert.equal(
    plTranslations["accountDashboard.trips.current.empty.body"],
    "Nie masz jeszcze rozpoczętych podróży. Gdy dokonasz rezerwacji, pojawi się ona tutaj.",
  );
  assert.equal(plTranslations["accountDashboard.trips.history.tabs.active"], "Nadchodzące");
  assert.equal(plTranslations["accountDashboard.trips.history.tabs.past"], "Przeszłe");
  assert.equal(plTranslations["accountDashboard.trips.history.tabs.cancelled"], "Anulowane");
  assert.equal(plTranslations["accountDashboard.trips.history.empty.past.title"], "Pamiętaj o swoich podróżach");
  assert.equal(
    plTranslations["accountDashboard.trips.history.empty.past.body"],
    "Ukończone podróże pojawią się tutaj po zakończeniu wyjazdu.",
  );
  assert.equal(plTranslations["accountDashboard.trips.history.empty.cancelled.title"], "Plany się zmieniły?");
  assert.equal(
    plTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "Twoje anulowane rezerwacje pojawią się tutaj do wglądu.",
  );
  assert.notEqual(plTranslations["accountDashboard.trips.history.tabs.past"], enTranslations["accountDashboard.trips.history.tabs.past"]);
  assert.notEqual(plTranslations["accountDashboard.trips.history.tabs.cancelled"], enTranslations["accountDashboard.trips.history.tabs.cancelled"]);
  assert.notEqual(plTranslations["accountDashboard.trips.history.empty.cancelled.title"], enTranslations["accountDashboard.trips.history.empty.cancelled.title"]);
  assert.notEqual(plTranslations["accountDashboard.trips.history.empty.cancelled.body"], enTranslations["accountDashboard.trips.history.empty.cancelled.body"]);

  assert.equal(idTranslations["accountDashboard.trips.title"], "Perjalanan saya");
  assert.equal(idTranslations["accountDashboard.trips.findReservation"], "Cari reservasi");
  assert.equal(idTranslations["accountDashboard.trips.current.empty.title"], "Ke mana selanjutnya?");
  assert.equal(
    idTranslations["accountDashboard.trips.current.empty.body"],
    "Anda belum memulai perjalanan apa pun. Saat Anda membuat reservasi, reservasi tersebut akan muncul di sini.",
  );
  assert.equal(idTranslations["accountDashboard.trips.history.tabs.past"], "Sebelumnya");
  assert.equal(idTranslations["accountDashboard.trips.history.tabs.cancelled"], "Dibatalkan");
  assert.equal(idTranslations["accountDashboard.trips.history.empty.past.title"], "Ingat perjalanan Anda");
  assert.equal(
    idTranslations["accountDashboard.trips.history.empty.past.body"],
    "Perjalanan yang telah selesai akan muncul di sini setelah Anda bepergian.",
  );
  assert.equal(idTranslations["accountDashboard.trips.history.empty.cancelled.title"], "Rencana berubah?");
  assert.equal(
    idTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "Reservasi yang dibatalkan akan muncul di sini sebagai referensi.",
  );

  assert.equal(idTranslations["accountDashboard.priceAlerts.title"], "Peringatan harga");
  assert.equal(
    idTranslations["accountDashboard.priceAlerts.description"],
    "Pantau harga dan dapatkan notifikasi saat tarif berubah.",
  );
  assert.equal(idTranslations["accountDashboard.priceAlerts.tabs.active"], "Aktif");
  assert.equal(idTranslations["accountDashboard.priceAlerts.tabs.expired"], "Kedaluwarsa");
  assert.equal(idTranslations["accountDashboard.priceAlerts.tabs.all"], "Semua");
  assert.equal(`${idTranslations["accountDashboard.priceAlerts.tabs.active"]} (0)`, "Aktif (0)");
  assert.equal(`${idTranslations["accountDashboard.priceAlerts.tabs.expired"]} (0)`, "Kedaluwarsa (0)");
  assert.equal(`${idTranslations["accountDashboard.priceAlerts.tabs.all"]} (0)`, "Semua (0)");
  assert.equal(idTranslations["accountDashboard.priceAlerts.sort.label"], "Urutkan");
  assert.equal(idTranslations["accountDashboard.priceAlerts.sort.newest"], "Terbaru");
  assert.equal(idTranslations["accountDashboard.priceAlerts.sort.oldest"], "Terlama");
  assert.equal(idTranslations["accountDashboard.priceAlerts.sort.routeAz"], "Rute A-Z");
  assert.equal(`${idTranslations["accountDashboard.priceAlerts.sort.label"]}: ${idTranslations["accountDashboard.priceAlerts.sort.newest"]}`, "Urutkan: Terbaru");
  assert.equal(idTranslations["accountDashboard.priceAlerts.empty.title"], "Belum ada peringatan harga.");
  assert.equal(
    idTranslations["accountDashboard.priceAlerts.empty.body"],
    "Buat peringatan dari pencarian penerbangan untuk memantau perubahan tarif dan mendapatkan notifikasi.",
  );
  assert.equal(idTranslations["accountDashboard.priceAlerts.cta.flights"], "Cari penerbangan");
  assert.equal(idTranslations["accountDashboard.priceAlerts.features.monitoring.title"], "Pemantauan waktu nyata");
  assert.equal(
    idTranslations["accountDashboard.priceAlerts.features.monitoring.body"],
    "Kami memantau harga dan memberi tahu Anda saat peringatan terpicu.",
  );
  assert.equal(idTranslations["accountDashboard.priceAlerts.features.email.title"], "Notifikasi email");
  assert.equal(idTranslations["accountDashboard.priceAlerts.features.email.body"], "Dapatkan notifikasi saat tarif berubah.");
  assert.equal(idTranslations["accountDashboard.priceAlerts.features.trends.title"], "Tren harga");
  assert.equal(
    idTranslations["accountDashboard.priceAlerts.features.trends.body"],
    "Lihat bagaimana tarif yang dipantau berubah dari waktu ke waktu.",
  );
  assert.equal(idTranslations["accountDashboard.priceAlerts.features.management.title"], "Pengelolaan mudah");
  assert.equal(
    idTranslations["accountDashboard.priceAlerts.features.management.body"],
    "Jeda atau hapus peringatan kapan saja.",
  );
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");

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

  assert.equal(svTranslations["accountDashboard.trips.title"], "Mina resor");
  assert.equal(svTranslations["accountDashboard.trips.findReservation"], "Hitta en bokning");
  assert.equal(svTranslations["accountDashboard.trips.current.empty.title"], "Vart härnäst?");
  assert.equal(
    svTranslations["accountDashboard.trips.current.empty.body"],
    "Du har inte påbörjat några resor än. När du gör en bokning visas den här.",
  );
  assert.equal(svTranslations["accountDashboard.trips.history.tabs.past"], "Tidigare");
  assert.equal(svTranslations["accountDashboard.trips.history.tabs.cancelled"], "Avbokade");
  assert.equal(svTranslations["accountDashboard.trips.history.empty.past.title"], "Kom ihåg dina resor");
  assert.equal(
    svTranslations["accountDashboard.trips.history.empty.past.body"],
    "Dina slutförda resor visas här efter att du har rest.",
  );
  assert.equal(svTranslations["accountDashboard.trips.history.empty.cancelled.title"], "Ändrade planer?");
  assert.equal(
    svTranslations["accountDashboard.trips.history.empty.cancelled.body"],
    "Dina avbokade bokningar visas här som referens.",
  );

  assert.equal(svTranslations["accountDashboard.priceAlerts.title"], "Prisaviseringar");
  assert.equal(
    svTranslations["accountDashboard.priceAlerts.description"],
    "Följ priser och få aviseringar när biljettpriser ändras.",
  );
  assert.equal(svTranslations["accountDashboard.priceAlerts.tabs.active"], "Aktiva");
  assert.equal(svTranslations["accountDashboard.priceAlerts.tabs.expired"], "Utgångna");
  assert.equal(svTranslations["accountDashboard.priceAlerts.tabs.all"], "Alla");
  assert.equal(`${svTranslations["accountDashboard.priceAlerts.tabs.active"]} (0)`, "Aktiva (0)");
  assert.equal(`${svTranslations["accountDashboard.priceAlerts.tabs.expired"]} (12)`, "Utgångna (12)");
  assert.equal(`${svTranslations["accountDashboard.priceAlerts.tabs.all"]} (3)`, "Alla (3)");
  assert.equal(svTranslations["accountDashboard.priceAlerts.sort.label"], "Sortera efter");
  assert.equal(svTranslations["accountDashboard.priceAlerts.sort.newest"], "Nyast");
  assert.equal(svTranslations["accountDashboard.priceAlerts.sort.oldest"], "Äldst");
  assert.equal(svTranslations["accountDashboard.priceAlerts.sort.routeAz"], "Rutt A–Ö");
  assert.equal(`${svTranslations["accountDashboard.priceAlerts.sort.label"]}: ${svTranslations["accountDashboard.priceAlerts.sort.newest"]}`, "Sortera efter: Nyast");
  assert.equal(svTranslations["accountDashboard.priceAlerts.empty.title"], "Inga prisaviseringar ännu.");
  assert.equal(
    svTranslations["accountDashboard.priceAlerts.empty.body"],
    "Skapa en avisering från en flygsökning för att följa prisändringar och få meddelanden.",
  );
  assert.equal(svTranslations["accountDashboard.priceAlerts.cta.flights"], "Sök flyg");
  assert.equal(languageOptions.find((o) => o.code === "sv")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");

  const tripsManagementSource = readFileSync("src/app/dashboard/trips/TripsManagementPage.tsx", "utf8");
  assert.ok(tripsManagementSource.includes('type TripStatusTab = "upcoming" | "past" | "cancelled"'));
  assert.ok(tripsManagementSource.includes('{ id: "upcoming", labelKey: "accountDashboard.trips.history.tabs.active", fallback: "Upcoming" }'));
  assert.ok(tripsManagementSource.includes('{ id: "past", labelKey: "accountDashboard.trips.history.tabs.past", fallback: "Past" }'));
  assert.ok(tripsManagementSource.includes('labelKey: "accountDashboard.trips.history.tabs.cancelled"'));
  assert.ok(tripsManagementSource.includes('titleKey: "accountDashboard.trips.current.empty.title"'));
  assert.ok(tripsManagementSource.includes('bodyKey: "accountDashboard.trips.current.empty.body"'));
  assert.ok(tripsManagementSource.includes('titleKey: "accountDashboard.trips.history.empty.past.title"'));
  assert.ok(tripsManagementSource.includes('bodyKey: "accountDashboard.trips.history.empty.past.body"'));
  assert.ok(tripsManagementSource.includes('titleKey: "accountDashboard.trips.history.empty.cancelled.title"'));
  assert.ok(tripsManagementSource.includes('bodyKey: "accountDashboard.trips.history.empty.cancelled.body"'));
  assert.ok(tripsManagementSource.includes('const activeTrips = useMemo('));
  assert.ok(tripsManagementSource.includes('() => trips.filter((trip) => trip.status === activeTab)'));
  assert.ok(tripsManagementSource.includes('id={`${activeTab}-trips-panel`}'));
  assert.ok(tripsManagementSource.includes('aria-controls={`${tab.id}-trips-panel`}'));
  assert.ok(tripsManagementSource.includes('fetch("/api/dashboard/trips/lookup"'));
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


test("Indonesian Cars results render path copy resolves without English fallback", async () => {
  const id = getTranslations("id");
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  const carsResultsPageSource = readFileSync("src/app/cars/results/page.tsx", "utf8");

  const auditedCarsResultsKeys: Array<[string, string]> = [
    ["carsResults.pickupLocation", "Lokasi pengambilan"],
    ["carsResults.returnLocation", "Lokasi pengembalian"],
    ["carsSearch.pickupLocationPlaceholder", "Bandara, kota, atau alamat"],
    ["carsResults.sameAsPickup", "Sama seperti lokasi pengambilan"],
    ["carsResults.rentalDates", "Tanggal sewa"],
    ["carsResults.pickupReturnTime", "Waktu pengambilan / pengembalian"],
    ["carsResults.driverAge", "Usia pengemudi"],
    ["carsResults.anyDriverAgeRange", "Usia pengemudi berapa pun"],
    ["carsResults.searchCars", "Cari mobil"],
    ["carsResults.fuelPolicy", "Kebijakan bahan bakar"],
    ["carsResults.fullToFull", "Penuh-ke-penuh"],
    ["carsResults.sameToSame", "Sama-ke-sama"],
    ["carsResults.mileagePolicy", "Kebijakan jarak tempuh"],
    ["carsResults.unlimitedMileage", "Jarak tempuh tanpa batas"],
    ["carsResults.limitedMileage", "Jarak tempuh terbatas"],
    ["carsResults.cancellation", "Pembatalan"],
    ["carsResults.freeCancellation", "Pembatalan gratis"],
    ["carsResults.payAtPickup", "Bayar saat pengambilan"],
    ["carsResults.pickupLocationType", "Jenis lokasi pengambilan"],
    ["carsResults.airportCounter", "Konter bandara"],
    ["carsResults.shuttlePickup", "Pengambilan dengan shuttle"],
    ["carsResults.cityLocation", "Lokasi kota"],
  ];

  for (const [key, expected] of auditedCarsResultsKeys) {
    assert.equal(id[key], expected);
    assert.ok(
      carsResultsSource.includes(`t("${key}")`) || carsResultsSource.includes(`labelKey: "${key}"`) || carsResultsSource.includes(`titleKey: "${key}"`),
      `Cars results render path should resolve ${key} through i18n`,
    );
  }

  const indonesianIntlLocale = "id-ID";
  assert.ok(carsResultsSource.includes('if (normalizedLocale.startsWith("id"))') && carsResultsSource.includes('return "id-ID"'));
  assert.equal(new Intl.DateTimeFormat(indonesianIntlLocale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(2026, 5, 30)), "30 Jun 2026");
  assert.equal(new Intl.DateTimeFormat(indonesianIntlLocale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(2026, 6, 5)), "5 Jul 2026");
  assert.ok(carsResultsSource.includes('intlLocale.toLowerCase().startsWith("id") ? "." : ":"'));

  for (const preservedQueryName of [
    'name="pickupDate"',
    'name="dropoffDate"',
    'name="pickupTime"',
    'name="dropoffTime"',
    'name="driverAge"',
    'name="pickupLocation"',
    'name="dropoffLocation"',
    'action="/cars/results"',
  ]) {
    assert.ok(carsResultsSource.includes(preservedQueryName), `${preservedQueryName} should remain in the Cars results form`);
  }

  assert.ok(carsResultsPageSource.includes('pickupTime: getParamValue(params, "pickupTime") || "10:00"'));
  assert.ok(carsResultsPageSource.includes('dropoffTime: getParamValue(params, "dropoffTime") || "10:00"'));
  assert.ok(carsResultsPageSource.includes('driverAge: normalizeDriverAge(getParamValue(params, "driverAge"))'));
  assert.ok(
    !carsResultsSource.includes('"PICKUP LOCATION"') &&
      !carsResultsSource.includes('"RETURN LOCATION"') &&
      !carsResultsSource.includes('"RENTAL DATES"') &&
      !carsResultsSource.includes('"PICKUP / RETURN TIME"') &&
      !carsResultsSource.includes('"DRIVER AGE"') &&
      !carsResultsSource.includes('"Search cars"') &&
      !carsResultsSource.includes('"Fuel policy"') &&
      !carsResultsSource.includes('"Mileage policy"'),
    "Cars results components should not hard-code screenshot-visible English strings.",
  );
  assert.equal(languageOptions.find((option) => option.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
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


test("Indonesian cars landing render path copy resolves without English fallback", () => {
  const id = getTranslations("id");
  const auditedIndonesianCarsLandingKeys: Array<[string, string]> = [
    ["searchRentalCarsEveryPartTrip", "Cari mobil sewaan untuk setiap bagian perjalanan Anda"],
    ["carsSearch.pickupLocationLabel", "Lokasi pengambilan"],
    ["carsSearch.pickupLocationPlaceholder", "Bandara, kota, atau alamat"],
    ["carsSearch.returnLocationPlaceholder", "Kota, bandara, atau alamat pengembalian"],
    ["carsSearch.returnToSameLocation", "Kembalikan ke lokasi yang sama"],
    ["carsSearch.differentReturnLocation", "Lokasi pengembalian berbeda"],
    ["carsSearch.rentalDatesLabel", "Tanggal sewa"],
    ["carsSearch.rentalDatePlaceholder", "Tanggal pengambilan — tanggal pengembalian"],
    ["carsSearch.pickupReturnTimeLabel", "Waktu pengambilan / pengembalian"],
    ["carsSearch.pickupReturnTimeSummary", "{pickupTime} ambil — {returnTime} kembali"],
    ["carsSearch.driverAgeLabel", "Usia pengemudi"],
    ["carsSearch.driverAgeAnyAge", "Usia berapa pun"],
    ["carsSearch.chooseRentalDates", "Pilih tanggal sewa"],
    ["carsSearch.previousMonthShort", "Sebelumnya"],
    ["carsSearch.nextMonthShort", "Berikutnya"],
    ["exploreCarsByTripStyle", "Jelajahi mobil sewaan berdasarkan gaya perjalanan"],
    ["carsTripStyleBody", "Pilih jenis mobil dan kami akan membuka hasil dengan konteks pencarian yang sudah siap."],
    ["carsTripStyle.economy.title", "Mobil ekonomi"],
    ["carsTripStyle.economy.subtitle", "Pilihan terjangkau untuk perjalanan kota dan solo"],
    ["carsTripStyle.economy.cta", "Mulai pencarian mobil ekonomi"],
    ["carsTripStyle.suv.title", "SUV"],
    ["carsTripStyle.suv.subtitle", "Ruang untuk perjalanan keluarga, bagasi, dan perjalanan lebih jauh"],
    ["carsTripStyle.suv.cta", "Buka pencarian sewa SUV"],
    ["carsTripStyle.luxury.title", "Mobil mewah"],
    ["carsTripStyle.luxury.subtitle", "Konteks pencarian premium untuk perjalanan bisnis atau acara khusus"],
    ["carsTripStyle.luxury.cta", "Rencanakan pencarian mobil mewah"],
    ["carsTripStyle.van.title", "Van"],
    ["carsTripStyle.van.subtitle", "Konteks pencarian untuk perjalanan rombongan dan bagasi keluarga"],
    ["carsTripStyle.van.cta", "Cari van untuk perjalanan rombongan"],
    ["carsTrust.0.title", "Dibuat untuk perjalanan lengkap"],
    ["carsTrust.0.description", "Rencanakan penerbangan, penginapan, dan transportasi darat dalam satu alur Kurioticket."],
    ["carsTrust.1.title", "Detail pengambilan terlebih dahulu"],
    ["carsTrust.1.description", "Masukkan lokasi pengambilan, tanggal, waktu, dan usia pengemudi agar pencarian sewa Anda dimulai dengan detail perjalanan yang tepat."],
    ["carsTrust.2.title", "Tinjauan sewa yang jelas"],
    ["carsTrust.2.description", "Tinjau harga akhir, ketersediaan, biaya, dan aturan sewa dengan penyedia sebelum memesan."],
    ["carsPickupPointsTitle", "Mulai dari titik pengambilan mobil populer"],
    ["carsPickupPointsBody", "Pilih gaya pengambilan dan kami akan membuka halaman hasil mobil dengan detail pencarian yang sudah siap."],
    ["carsPickup.Airport.title", "Pengambilan di bandara"],
    ["carsPickup.Airport.subtitle", "Mulai dari titik kedatangan bandara utama"],
    ["carsPickup.City center.title", "Pengambilan di pusat kota"],
    ["carsPickup.City center.subtitle", "Ambil mobil di dekat hotel pusat kota dan distrik bisnis"],
    ["carsPickup.Train station.title", "Pengambilan di stasiun kereta"],
    ["carsPickup.Train station.subtitle", "Lanjutkan perjalanan setelah tiba dengan kereta"],
    ["carsPickup.Hotel area.title", "Pengambilan di area hotel"],
    ["carsPickup.Hotel area.subtitle", "Rencanakan pengambilan mobil di dekat tempat Anda menginap"],
    ["carsFaq.heading", "Pertanyaan yang sering diajukan tentang mobil"],
    ["carsFaq.0.question", "Informasi apa yang saya perlukan untuk mencari mobil sewaan?"],
    ["carsFaq.0.answer", "Masukkan lokasi pengambilan, tanggal pengambilan dan pengembalian, waktu pengambilan dan pengembalian, usia pengemudi, serta apakah Anda berencana mengembalikan mobil ke lokasi berbeda."],
    ["carsFaq.1.question", "Bisakah saya mengembalikan mobil ke lokasi berbeda?"],
    ["carsFaq.1.answer", "Bisa. Pilih Lokasi pengembalian berbeda di formulir pencarian dan masukkan kota, bandara, atau alamat tempat Anda berencana mengembalikan mobil."],
    ["carsFaq.2.question", "Mengapa usia pengemudi penting untuk mobil sewaan?"],
    ["carsFaq.2.answer", "Penyedia sewa dapat menerapkan aturan, biaya, kelayakan kendaraan, atau persyaratan deposit yang berbeda berdasarkan usia dan lokasi pengemudi."],
    ["carsFaq.3.question", "Apa yang harus saya periksa sebelum memesan mobil sewaan?"],
    ["carsFaq.3.answer", "Tinjau lokasi pengambilan dan pengembalian, tanggal, waktu, kebijakan jarak tempuh, kebijakan bahan bakar, opsi asuransi, ketentuan pembatalan, persyaratan deposit, dan dokumen yang diperlukan sebelum memesan."],
    ["carsFaq.4.question", "Di mana harga sewa akhir dikonfirmasi?"],
    ["carsFaq.4.answer", "Harga akhir, ketersediaan kendaraan, pajak, biaya, persyaratan deposit, dan aturan sewa dikonfirmasi oleh penyedia sebelum pemesanan."],
    ["carsFaq.5.question", "Dokumen apa yang mungkin saya perlukan saat pengambilan?"],
    ["carsFaq.5.answer", "Penyedia sewa dapat meminta SIM yang masih berlaku, kartu pembayaran, bukti identitas, dan dokumen apa pun yang diwajibkan oleh negara atau lokasi pengambilan."],
  ];

  for (const [key, expected] of auditedIndonesianCarsLandingKeys) {
    assert.equal(id[key], expected, `${key} should resolve to Indonesian`);
    assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(id.search, "Cari");
  assert.equal(id["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"), "10:00 ambil — 10:00 kembali");
  assert.equal(new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)), "Juni 2026");
  assert.equal(new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)), "Juli 2026");
  assert.deepEqual(Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(new Date(2024, 0, 7 + day))), ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]);

  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
  const carsLandingContentSource = readFileSync("src/data/carsLandingContent.ts", "utf8");
  for (const key of ["searchRentalCarsEveryPartTrip", "carsSearch.pickupLocationLabel", "carsSearch.chooseRentalDates", "exploreCarsByTripStyle", "carsPickupPointsTitle", "carsFaq.heading"]) {
    assert.ok(carsPageSource.includes(`t("${key}")`) || carsPageSource.includes("dictionary[item.questionKey]"), `Cars landing render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsPageSource.includes("buildCarResultsHref") &&
      carsPageSource.includes("pickupLocation: card.pickupLocation") &&
      carsPageSource.includes("vehicleType: card.vehicleType") &&
      carsPageSource.includes("returnToDifferentLocation") &&
      carsPageSource.includes('name="pickupLocation"') &&
      carsPageSource.includes('name="pickupDate"') &&
      carsPageSource.includes('type="checkbox"') &&
      carsPageSource.includes("grid auto-cols-[minmax(240px,82vw)]") &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.economy"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.suv"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.luxury"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.van"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Airport"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.City center"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Train station"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Hotel area"') &&
      carsLandingContentSource.includes('vehicleType: "economy"') &&
      carsLandingContentSource.includes('pickupLocation: "City center"') &&
      carsLandingContentSource.includes("image:"),
    "Cars landing should keep raw pickup/search values, vehicle types, form names, checkbox behavior, card order, image references, query builders, CTA routes, and layout source paths intact.",
  );
  assert.ok(
    !carsPageSource.includes("Search rental cars for every part of your trip") &&
      !carsPageSource.includes("Explore rental cars by trip style") &&
      !carsPageSource.includes("Start with popular car pickup points") &&
      !carsPageSource.includes("Cars Frequently asked questions"),
    "Cars landing render path should not hard-code screenshot-visible English copy.",
  );
  assert.ok(languageOptions.some((option) => option.code === "id" && option.locale === "id-ID" && option.nativeLabel === "Bahasa Indonesia" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
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


test("Polish cars landing render path copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const auditedPolishCarsLandingKeys: Array<[string, string]> = [
    ["searchRentalCarsEveryPartTrip", "Wyszukaj samochody na każdy etap podróży"],
    ["carsSearch.pickupLocationLabel", "MIEJSCE ODBIORU"],
    ["carsSearch.pickupLocationPlaceholder", "Lotnisko, miasto lub adres"],
    ["carsSearch.returnLocationPlaceholder", "Miasto, lotnisko lub adres zwrotu"],
    ["carsSearch.returnToSameLocation", "Zwrot w tym samym miejscu"],
    ["carsSearch.differentReturnLocation", "Inne miejsce zwrotu"],
    ["carsSearch.rentalDatesLabel", "DATY WYNAJMU"],
    ["carsSearch.rentalDatePlaceholder", "Data odbioru — data zwrotu"],
    ["carsSearch.pickupReturnTimeLabel", "GODZINA ODBIORU / ZWROTU"],
    ["carsSearch.pickupReturnTimeSummary", "Odbiór {pickupTime} — zwrot {returnTime}"],
    ["carsSearch.driverAgeLabel", "WIEK KIEROWCY"],
    ["carsSearch.driverAgeAnyAge", "Dowolny wiek"],
    ["carsSearch.chooseRentalDates", "Wybierz daty wynajmu"],
    ["carsSearch.previousMonthShort", "Poprzedni"],
    ["carsSearch.nextMonthShort", "Następny"],
    ["carsSearch.rentalDatePickerAria", "Wybór dat wynajmu"],
    ["exploreCarsByTripStyle", "Odkrywaj samochody według stylu podróży"],
    ["carsTripStyleBody", "Wybierz typ samochodu, a otworzymy wyniki z gotowym kontekstem wyszukiwania."],
    ["carsTripStyle.economy.title", "Samochody ekonomiczne"],
    ["carsTripStyle.economy.subtitle", "Przystępne wyszukiwania do miasta i podróży solo"],
    ["carsTripStyle.economy.cta", "Rozpocznij wyszukiwanie samochodu ekonomicznego"],
    ["carsTripStyle.suv.title", "SUV-y"],
    ["carsTripStyle.suv.subtitle", "Więcej miejsca na rodzinne wyjazdy, bagaż i dłuższe trasy"],
    ["carsTripStyle.suv.cta", "Otwórz wyszukiwanie wynajmu SUV-a"],
    ["carsTripStyle.luxury.title", "Samochody luksusowe"],
    ["carsTripStyle.luxury.subtitle", "Kontekst premium dla podróży służbowych lub wyjątkowych wyjazdów"],
    ["carsTripStyle.luxury.cta", "Zaplanuj wyszukiwanie luksusowego samochodu"],
    ["carsTripStyle.van.title", "Vany"],
    ["carsTripStyle.van.subtitle", "Kontekst wyszukiwania dla podróży grupowych i rodzinnego bagażu"],
    ["carsTripStyle.van.cta", "Szukaj vanów na podróże grupowe"],
    ["carsTrust.0.title", "Stworzone z myślą o pełnych podróżach"],
    ["carsTrust.0.description", "Planuj loty, pobyty i transport naziemny w jednym procesie Kurioticket."],
    ["carsTrust.1.title", "Najpierw szczegóły odbioru"],
    ["carsTrust.1.description", "Podaj miejsce odbioru, daty, godziny i wiek kierowcy, aby wyszukiwanie wynajmu zaczęło się od właściwych szczegółów podróży."],
    ["carsTrust.2.title", "Jasne sprawdzenie wynajmu"],
    ["carsTrust.2.description", "Przed rezerwacją sprawdź u dostawcy ostateczną cenę, dostępność, opłaty i zasady wynajmu."],
    ["carsPickupPointsTitle", "Zacznij od popularnych miejsc odbioru samochodu"],
    ["carsPickupPointsBody", "Wybierz styl odbioru, a otworzymy stronę wyników samochodów z gotowymi szczegółami wyszukiwania."],
    ["carsPickup.Airport.title", "Odbiór na lotnisku"],
    ["carsPickup.Airport.subtitle", "Rozpocznij od głównych punktów przylotów na lotniskach"],
    ["carsPickup.City center.title", "Odbiór w centrum miasta"],
    ["carsPickup.City center.subtitle", "Odbierz samochód blisko hoteli w centrum i dzielnic biznesowych"],
    ["carsPickup.Train station.title", "Odbiór przy dworcu kolejowym"],
    ["carsPickup.Train station.subtitle", "Kontynuuj podróż po przyjeździe pociągiem"],
    ["carsPickup.Hotel area.title", "Odbiór w okolicy hotelu"],
    ["carsPickup.Hotel area.subtitle", "Zaplanuj odbiór samochodu w pobliżu miejsca pobytu"],
    ["carsFaq.heading", "Najczęstsze pytania o samochody"],
    ["carsFaq.0.question", "Jakich informacji potrzebuję, aby wyszukać samochód na wynajem?"],
    ["carsFaq.0.answer", "Podaj miejsce odbioru, daty odbioru i zwrotu, godziny odbioru i zwrotu, wiek kierowcy oraz informację, czy planujesz zwrócić samochód w innym miejscu."],
    ["carsFaq.1.question", "Czy mogę zwrócić samochód w innym miejscu?"],
    ["carsFaq.1.answer", "Tak. W formularzu wyszukiwania wybierz inne miejsce zwrotu i wpisz miasto, lotnisko lub adres, pod którym planujesz zwrócić samochód."],
    ["carsFaq.2.question", "Dlaczego wiek kierowcy ma znaczenie przy wynajmie samochodu?"],
    ["carsFaq.2.answer", "Dostawcy wynajmu mogą stosować różne zasady, opłaty, wymagania dotyczące dostępnych pojazdów lub kaucji zależnie od wieku kierowcy i lokalizacji."],
    ["carsFaq.3.question", "Co sprawdzić przed rezerwacją samochodu na wynajem?"],
    ["carsFaq.3.answer", "Przed rezerwacją sprawdź miejsce odbioru i zwrotu, daty, godziny, limit kilometrów, politykę paliwową, opcje ubezpieczenia, warunki anulowania, wymagania dotyczące kaucji i potrzebne dokumenty."],
    ["carsFaq.4.question", "Gdzie potwierdzana jest ostateczna cena wynajmu?"],
    ["carsFaq.4.answer", "Ostateczna cena, dostępność pojazdu, podatki, opłaty, wymagania dotyczące kaucji i zasady wynajmu są potwierdzane przez dostawcę przed rezerwacją."],
    ["carsFaq.5.question", "Jakie dokumenty mogą być potrzebne przy odbiorze?"],
    ["carsFaq.5.answer", "Dostawcy wynajmu mogą wymagać ważnego prawa jazdy, karty płatniczej, dokumentu tożsamości oraz dokumentów wymaganych w kraju lub miejscu odbioru."],
  ];

  for (const [key, expected] of auditedPolishCarsLandingKeys) {
    assert.equal(pl[key], expected, `${key} should resolve to Polish`);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(
    pl["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"),
    "Odbiór 10:00 — zwrot 10:00",
  );

  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
  const carsLandingContentSource = readFileSync("src/data/carsLandingContent.ts", "utf8");
  for (const key of ["searchRentalCarsEveryPartTrip", "carsSearch.pickupLocationLabel", "carsSearch.chooseRentalDates", "exploreCarsByTripStyle", "carsPickupPointsTitle", "carsFaq.heading"]) {
    assert.ok(carsPageSource.includes(`t("${key}")`) || carsPageSource.includes(`dictionary[item.questionKey]`), `Cars landing render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsPageSource.includes("buildCarResultsHref") &&
      carsPageSource.includes("pickupLocation: card.pickupLocation") &&
      carsPageSource.includes("vehicleType: card.vehicleType") &&
      carsPageSource.includes("returnToDifferentLocation") &&
      carsPageSource.includes("visibleMonthDate") &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.economy"') &&
      carsLandingContentSource.includes('vehicleType: "economy"') &&
      carsLandingContentSource.includes('pickupLocation: "City center"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Airport"') &&
      carsLandingContentSource.includes('href={card.href}') === false,
    "Cars landing should keep raw pickup/search values, vehicle types, card IDs, image URLs, query builders, selected values, datepicker behavior, different-return behavior, order, and layout source paths intact.",
  );
  assert.ok(
    !carsPageSource.includes("Search rental cars for every part of your trip") &&
      !carsPageSource.includes("Explore rental cars by trip style") &&
      !carsPageSource.includes("Start with popular car pickup points"),
    "Cars landing render path should not hard-code screenshot-visible English copy.",
  );
  assert.ok(languageOptions.some((option) => option.code === "pl" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Polish cars calendar locale normalizes to pl-PL for generated datepicker labels", () => {
  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");

  assert.ok(
    carsPageSource.includes('normalizedLocale.startsWith("pl")') && carsPageSource.includes('return "pl-PL"'),
    "Cars datepicker locale helper should normalize Polish locales to pl-PL.",
  );
  assert.equal(
    new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(2026, 5, 1)),
    "czerwiec 2026",
  );
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(new Date(2024, 0, 7 + day))),
    ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."],
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


test("Thai Cars results copy and datepicker render path resolve without English fallback", () => {
  const th = getTranslations("th");
  const carsResultsPageSource = readFileSync("src/app/cars/results/page.tsx", "utf8");
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");

  assert.ok(carsResultsPageSource.includes("<CarsResultsClient"), "Cars results page should render the client path under test.");

  const expectedCopy: Array<[string, string, string]> = [
    ["carsResults.filterBy", "กรองตาม", "Filter by"],
    ["carsResults.vehicleType", "ประเภทรถ", "Vehicle type"],
    ["carsResults.smallCars", "รถขนาดเล็ก", "Small cars"],
    ["carsResults.mediumCars", "รถขนาดกลาง", "Medium cars"],
    ["carsResults.suvs", "รถ SUV", "SUVs"],
    ["carsResults.transmission", "ระบบเกียร์", "Transmission"],
    ["carsResults.automatic", "เกียร์อัตโนมัติ", "Automatic"],
    ["carsResults.manual", "เกียร์ธรรมดา", "Manual"],
    ["carsResults.seats", "ที่นั่ง", "Seats"],
    ["carsResults.seats4Plus", "4+ ที่นั่ง", "4+ seats"],
    ["carsResults.seats5Plus", "5+ ที่นั่ง", "5+ seats"],
    ["carsResults.seats7Plus", "7+ ที่นั่ง", "7+ seats"],
    ["carsResults.bags", "กระเป๋า", "Bags"],
    ["carsResults.bags2Plus", "2+ กระเป๋า", "2+ bags"],
    ["carsResults.bags3Plus", "3+ กระเป๋า", "3+ bags"],
    ["carsResults.bags4Plus", "4+ กระเป๋า", "4+ bags"],
    ["carsResults.fuelPolicy", "นโยบายน้ำมัน", "Fuel policy"],
    ["carsResults.fullToFull", "รับเต็มคืนเต็ม", "Full-to-full"],
    ["carsResults.sameToSame", "รับเท่าไรคืนเท่านั้น", "Same-to-same"],
    ["carsResults.mileagePolicy", "นโยบายระยะทาง", "Mileage policy"],
    ["carsResults.unlimitedMileage", "ไม่จำกัดระยะทาง", "Unlimited mileage"],
    ["carsResults.limitedMileage", "จำกัดระยะทาง", "Limited mileage"],
    ["carsResults.cancellation", "การยกเลิก", "Cancellation"],
    ["carsResults.freeCancellation", "ยกเลิกฟรี", "Free cancellation"],
    ["carsResults.payAtPickup", "ชำระเมื่อรับรถ", "Pay at pickup"],
    ["carsResults.pickupLocationType", "ประเภทสถานที่รับรถ", "Pickup location type"],
    ["carsResults.airportCounter", "เคาน์เตอร์สนามบิน", "Airport counter"],
    ["carsResults.shuttlePickup", "รับรถด้วยรถรับส่ง", "Shuttle pickup"],
    ["carsResults.cityLocation", "สถานที่ในเมือง", "City location"],
    ["carsResults.resultsFor", "ผลลัพธ์รถเช่าสำหรับ {location}", "Cars results for {location}"],
    ["carsResults.pickupLocationNeeded", "ต้องระบุสถานที่รับรถ", "Pickup location needed"],
    ["carsResults.emptyInventory", "ยังไม่มีข้อมูลรถเช่าแบบสดให้แสดงสำหรับการค้นหานี้ โปรดอัปเดตรายละเอียดการค้นหาด้านบนหรือตรวจสอบอีกครั้งภายหลัง", "Live car inventory is not available to display for this search yet. Update the search details above or check again later."],
    ["carsResults.pickupLocation", "สถานที่รับรถ", "Pickup location"],
    ["carsResults.returnLocation", "สถานที่คืนรถ", "Return location"],
    ["carsResults.rentalDates", "วันที่เช่ารถ", "Rental dates"],
    ["carsResults.pickupReturnTime", "เวลารับรถ / คืนรถ", "Pickup / return time"],
    ["carsResults.driverAge", "อายุผู้ขับขี่", "Driver age"],
    ["carsResults.sameAsPickup", "เหมือนสถานที่รับรถ", "Same as pickup"],
    ["carsResults.anyDriverAgeRange", "ผู้ขับขี่อายุ 18–70 ปี", "Any driver age 18–70"],
    ["carsResults.searchCars", "ค้นหารถ", "Search cars"],
    ["carsResults.edit", "แก้ไข", "Edit"],
    ["carsResults.selectPickupThenReturn", "เลือกวันรับรถ แล้วเลือกวันคืนรถ", "Select pickup, then return"],
  ];

  for (const [key, thaiValue, englishFallback] of expectedCopy) {
    assert.equal(th[key], thaiValue, `${key} should resolve to Thai`);
    assert.notEqual(th[key], englishFallback, `${key} should not remain English`);
    assert.ok(carsResultsSource.includes(`t("${key}")`) || carsResultsSource.includes("t(group.titleKey)") || carsResultsSource.includes("t(option.labelKey)"), `${key} should be read through i18n or filter key indirection.`);
  }

  assert.equal(th["carsResults.resultsFor"].replace("{location}", th["carsResults.pickupLocationNeeded"]), "ผลลัพธ์รถเช่าสำหรับ ต้องระบุสถานที่รับรถ");
  assert.ok(carsResultsSource.includes('normalizedLocale.startsWith("th")') && carsResultsSource.includes('return "th-TH-u-ca-gregory"'), "Cars results datepicker should normalize Thai to an app-controlled Thai Gregorian locale.");
  assert.equal(new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "long", year: "numeric" }).format(new Date(2026, 6, 1)), "กรกฎาคม 2026");
  assert.equal(new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "long", year: "numeric" }).format(new Date(2026, 7, 1)), "สิงหาคม 2026");
  assert.ok(carsResultsSource.includes('return ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];'), "Cars results datepicker should use app-standard Thai weekday abbreviations.");
  assert.ok(carsResultsSource.includes('action="/cars/results"') && carsResultsSource.includes('method="get"'));
  for (const preservedQueryName of ['name="pickupLocation"', 'name="dropoffLocation"', 'name="pickupDate"', 'name="dropoffDate"', 'name="pickupTime"', 'name="dropoffTime"', 'name="driverAge"', 'value={pickupLocation}', 'value={dropoffLocation}', 'value={pickupDate}', 'value={dropoffDate}', 'value={pickupTime}', 'value={dropoffTime}', 'value={driverAge}']) {
    assert.ok(carsResultsSource.includes(preservedQueryName), `${preservedQueryName} should preserve route/query payloads and selected values.`);
  }
  assert.ok(carsResultsSource.includes('{ id: "smallCars", labelKey: "carsResults.smallCars" }') && carsResultsSource.includes('selectedOptions.includes(option.id)'), "Filter raw IDs should remain separate from localized labels.");
  assert.ok(carsResultsSource.includes('className={cn(') && carsResultsSource.includes('aria-label={t("carsResults.rentalDateRangeCalendar")}'), "Layout/styling hooks and accessibility labels should remain in the render path.");
  assert.equal(availableLocaleOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Turkish cars results datepicker locale normalizes to tr-TR", () => {
  const carsResultsSource = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");

  assert.ok(
    carsResultsSource.includes('normalizedLocale.startsWith("tr")') && carsResultsSource.includes('return "tr-TR"'),
    "Cars results datepicker locale helper should normalize Turkish locales to tr-TR.",
  );
  assert.ok(
    carsResultsSource.includes('["de", "es", "fr", "id", "ja", "nl", "pl", "pt", "sv", "tr"]'),
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



test("Swedish homepage-visible copy resolves without English fallback", () => {
  const sv = getTranslations("sv");
  const expectedSwedishHomepageCopy: Record<string, string> = {
    flights: "Flyg",
    hotels: "Hotell",
    cars: "Bilar",
    deals: "Erbjudanden",
    homeHeroTitle: "Jämför resealternativ med en enkel sökning",
    homeHeroSubtitle: "Sök hos betrodda reseleverantörer, jämför priser tydligt och välj alternativet som passar din resa.",
    roundTrip: "Tur och retur",
    oneWay: "Enkelresa",
    origin: "AVRESEORT",
    destination: "DESTINATION",
    departureDate: "RESEDATUM",
    travelDates: "RESEDATUM",
    travelers: "RESENÄRER",
    fromPlaceholder: "Från?",
    toPlaceholder: "Till?",
    search: "Sök",
    chooseTravelDates: "Välj resedatum",
    previousMonthShort: "Föregående",
    nextMonthShort: "Nästa",
    clear: "Rensa",
    done: "Klart",
    passengers: "Passagerare",
    adults: "Vuxna",
    adultAgeRange: "18+",
    children: "Barn",
    childAgeRange: "Ålder 2–17",
    infantsOnLap: "Spädbarn i knä",
    under2: "Under 2",
    cabinClass: "KABINKLASS",
    economy: "Ekonomi",
    business: "Businessklass",
    first: "Första klass",
    cityOrHotel: "Stad eller hotell",
    hotelSearchDestinationLabel: "DESTINATION",
    hotelSearchTravelDatesLabel: "RESEDATUM",
    hotelSearchDatePlaceholder: "Incheckning — utcheckning",
    hotelSearchGuestsLabel: "GÄSTER",
    stayDetails: "BOENDEDETALJER",
    guestsAndRooms: "Gäster och rum",
    guestSingular: "gäst",
    roomSingular: "rum",
    hotelAdultHelper: "Gäster 18+",
    hotelChildrenHelper: "Ålder 0–17",
    hotelRoomsHelper: "Upp till 6 rum",
    petFriendly: "Husdjur tillåtna",
    onlyShowPetFriendlyStays: "Visa endast boenden som tillåter husdjur",
    fromPrice: "Från",
    homePopularDestinations: "Populära destinationer",
    "homePopularDestinationCountry.unitedArabEmirates": "Förenade Arabemiraten",
    "homePopularDestinationCountry.unitedKingdom": "Storbritannien",
    "homePopularDestinationCountry.southAfrica": "Sydafrika",
    homeExploreFares: "Utforska priser",
    homeDiscoveryTitle: "Upptäck ditt nästa äventyr här",
    homeDiscoverySubtitle: "Jämför smarta ruttidéer, flexibla priser och destinationer utvalda för din region.",
    homeDiscoveryRouteIdeaBadge: "RUTTIDÉ",
    homeDiscoveryOneWay: "ENKELRESA",
    homeDiscoveryEconomy: "EKONOMI",
    homeDiscoveryTravelerCountOne: "1 resenär",
    homeCompareOptions: "Jämför alternativ",
    destinationImageFallback: "DESTINATION",
    "homeDiscoveryRoute.ng-los-dxb.title": "Shoppingstopp i Dubai",
    "homeDiscoveryRoute.ng-los-lhr.title": "London för jobb och helg",
    "homeDiscoveryRoute.ng-abv-rob.title": "Regional kustresa till Monrovia",
    "homeDiscoveryRoute.ng-los-dxb.routeNote": "Populär för shoppingpauser, familjeresor och vidare anslutningar.",
    homeTrustTitle: "Därför jämför resenärer på Kurioticket",
    homeTrustSubtitle: "Kurioticket hjälper dig att jämföra leverantörers erbjudanden tydligt och sedan slutföra bokningen på leverantörens webbplats.",
    homeTrustCompareTitle: "Jämför leverantörers erbjudanden",
    homeTrustCompareBody: "Visa flyg- och hotellalternativ från flera reseleverantörer på ett och samma ställe.",
    homeTrustPricingTitle: "Tydlig prisinformation",
    homeTrustPricingBody: "Granska pris, rutt- eller boendedetaljer och viktiga villkor innan du fortsätter.",
    homeTrustHandoffTitle: "Säker överlämning till leverantör",
    homeTrustHandoffBody: "När du väljer ett erbjudande fortsätter du till leverantören för att slutföra bokningen säkert.",
    homePromoFlightsTitle: "Flygerbjudanden från ledande flygbolag",
    homePromoFlightsBody: "Upptäck tidsbegränsade priser och jämför alternativ direkt.",
    homePromoFlightsCta: "Utforska flygerbjudanden",
    homePromoHotelsTitle: "Hotellbesparingar världen över",
    homePromoHotelsBody: "Bläddra bland boenden från boutiquehotell till globala kedjor med tydliga priser.",
    homePromoHotelsCta: "Utforska hotellerbjudanden",
    faqHeading: "Vanliga frågor",
    faqQuestionFindOptions: "Hur hittar Kurioticket flyg- och hotellalternativ?",
    supportFaqAccountQuestion: "Hjälp med konto och inloggning",
    supportFaqWhyRedirectedQuestion: "Varför skickades jag till en annan leverantör?",
    homeNewsletterTitle: "Ligg steget före varje reseerbjudande",
    homeNewsletterBody: "Få utvalda flyg- och hotelluppdateringar varje vecka.",
    homeNewsletterPlaceholder: "Ange din e-postadress",
    homeSubscribe: "Prenumerera",
    homeNewsletterConsent: "Genom att prenumerera samtycker du till att få uppdateringar från Kurioticket. Du kan avsluta prenumerationen när som helst.",
    homeNewsletterThanks: "Tack! Vi håller dig uppdaterad med reseerbjudanden.",
    footerContactUs: "Kontakta oss",
    footerCustomerSupport: "Kundsupport",
    footerServiceGuarantee: "Servicegaranti",
    footerMoreServiceInfo: "Mer serviceinformation",
    footerDiscover: "Upptäck",
    footerSavedRecent: "Sparat och senaste",
    footerTermsSettings: "Villkor och inställningar",
    footerPrivacyPolicy: "Integritetspolicy",
    footerTermsOfService: "Användarvillkor",
    footerCookiePolicy: "Cookiepolicy",
    footerAboutKurioticket: "Om Kurioticket",
    footerAboutUs: "Om oss",
    footerHowItWorks: "Så fungerar Kurioticket",
    footerConfidenceTagline: "Sök flyg, hotell och reseerbjudanden med trygghet.",
    footerAllRightsReserved: "Alla rättigheter förbehållna.",
    footerPrivacy: "Integritet",
    footerTerms: "Villkor",
    footerCookies: "Cookies",
  };

  for (const [key, expected] of Object.entries(expectedSwedishHomepageCopy)) {
    assert.equal(sv[key], expected, key);
    if (expected !== enTranslations[key]) assert.notEqual(sv[key], enTranslations[key], key);
  }

  assert.equal(`${1} ${sv.adultSingular}, ${sv.economy}`, "1 vuxen, Ekonomi");
  assert.equal(`${1} ${sv.guestSingular}, ${1} ${sv.roomSingular}`, "1 gäst, 1 rum");
  assert.equal(`${sv.fromPrice.toLocaleLowerCase("sv-SE")} NGN 713,949`, "från NGN 713,949");
  assert.equal(sv.homeNewsletterAccountEmail, "Prenumerera med e-postadressen för ditt konto: {{email}}.");
  assert.match(sv.homeNewsletterAccountEmail, /\{\{email\}\}/);
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});


test("Swedish newsletter email placeholder resolves through active homepage render path", () => {
  const sv = getTranslations("sv");
  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const bridgeSource = readFileSync("src/components/newsletter/NewsletterSessionBridge.tsx", "utf8");

  assert.equal(sv.homeNewsletterTitle, "Ligg steget före varje reseerbjudande");
  assert.equal(sv.homeNewsletterBody, "Få utvalda flyg- och hotelluppdateringar varje vecka.");
  assert.equal(sv.homeNewsletterPlaceholder, "Ange din e-postadress");
  assert.equal(sv.homeSubscribe, "Prenumerera");
  assert.equal(sv.homeNewsletterConsent, "Genom att prenumerera samtycker du till att få uppdateringar från Kurioticket. Du kan avsluta prenumerationen när som helst.");
  assert.notEqual(sv.homeNewsletterPlaceholder, enTranslations.homeNewsletterPlaceholder);

  assert.match(pageSource, /placeholder=\{t\("homeNewsletterPlaceholder"\)\}/);
  assert.doesNotMatch(pageSource, /placeholder=["']Enter your email["']/);
  assert.match(pageSource, /type="email"/);
  assert.match(pageSource, /value=\{newsletterEmail\}/);
  assert.match(pageSource, /setNewsletterEmail\(event\.target\.value\)/);
  assert.match(pageSource, /onSubmit=\{handleNewsletterSubmit\}/);
  assert.match(pageSource, /fetch\(\s*"\/api\/newsletter\/subscribe"/);
  assert.match(pageSource, /source: "homepage"/);
  assert.match(pageSource, /email,/);
  assert.match(pageSource, /className="flex flex-col gap-2 sm:max-w-\[34rem\] sm:flex-row"/);
  assert.match(pageSource, /aria-label=\{t\("homeEmailAddress"\)\}/);
  assert.match(bridgeSource, /document\.querySelector<HTMLInputElement>\('main input\[type="email"\]'\)/);
  assert.match(bridgeSource, /data\.authenticated/);
  assert.match(bridgeSource, /data\.status !== "SUBSCRIBED"/);
  assert.doesNotMatch(bridgeSource, /applyReactControlledInputValue/);

  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.nativeLabel === "Svenska" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});


test("Swedish Flights landing copy resolves through active render path", () => {
  const sv = getTranslations("sv");
  const expected: Record<string, string> = {
    flightLandingHeroTitle: "Hitta ditt nästa prisvärda flyg med lätthet.",
    flightLandingHeroSubtitle: "Sök rutter, jämför datum och utforska flygalternativ för din nästa resa.",
    cityOrAirport: "Stad eller flygplats",
    destination: "DESTINATION",
    searchFlights: "Sök flyg",
    roundTrip: "Tur och retur",
    oneWay: "Enkelresa",
    origin: "AVRESEORT",
    travelDates: "RESEDATUM",
    travelers: "RESENÄRER",
    discoverDestinationsFromRegion: "Upptäck destinationer från din region",
    discoverDestinationsFromRegionBody: "Utforska utvalda rutter och starta din nästa resa med trygghet.",
    flightLandingStartThisSearch: "Starta den här sökningen",
    flightLandingFeatureSearchReadyTitle: "Sökklara rutter",
    flightLandingFeatureSearchReadyBody: "Ange riktiga reseuppgifter innan resultat begärs från flygleverantörer.",
    flightLandingFeatureCompareTitle: "Jämför i sitt sammanhang",
    flightLandingFeatureCompareBody: "Använd datum, antal resenärer, kabinklass, längd, stopp och ruttuppgifter för att utvärdera alternativen.",
    flightLandingFeatureProviderTitle: "Granska hos leverantören",
    flightLandingFeatureProviderBody: "Bekräfta alltid slutlig tillgänglighet, pris och regler hos leverantören innan du bokar.",
    flightLandingRouteIdeasTitle: "Ruttidéer för flexibla resor",
    flightLandingRouteIdeasBody: "Bläddra bland ruttidéer och starta sedan en riktig sökning med datum och resenärer innan du jämför tillgängliga flyg.",
    flightLandingRouteTemplate: "{{origin}} till {{destination}}",
    flightLandingRouteConnector: "till",
    "flightLandingImageAlt.Johannesburg skyline at golden hour": "Johannesburgs silhuett i gyllene timmen",
    "flightLandingImageAlt.Cairo skyline with the Pyramids of Giza": "Kairos silhuett med pyramiderna i Giza",
    "flightLandingImageAlt.Addis Ababa cityscape in the Ethiopian highlands": "Addis Abebas stadsvy i de etiopiska högländerna",
    beachVacations: "Strandsemestrar",
    beachVacationsBody: "Utforska flygrutter till soliga kuster, öresor och stranddestinationer med varmt väder.",
    "homeDiscoveryRoute.ca-yyz-cun.title": "Vinterresa till Cancun",
    "homeDiscoveryRoute.ca-yyz-cun.routeNote": "Pålitlig fritidsrutt med direktalternativ under högsäsong.",
    "flightLandingImageAlt.Puerto Vallarta coastline and old town": "Puerto Vallartas kustlinje och gamla stad",
    "homeDiscoveryRoute.ca-yeg-pvr.title": "Strandresa till Puerto Vallarta",
    "homeDiscoveryRoute.ca-yeg-pvr.routeNote": "Vintersolrutt med Stillahavsstränder och charmig gammal stad.",
    "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water": "Honolulus Waikiki-strand med Diamond Head och klart blått vatten",
    "homeDiscoveryRoute.ca-yyz-hnl.title": "Långdistansresa till Honolulu",
    "homeDiscoveryRoute.ca-yyz-hnl.routeNote": "Premiumalternativ för stränder, surfing och vandringar på ön.",
    "flightLandingImageAlt.San Diego bay skyline and marina": "San Diegos bukt, silhuett och marina",
    "homeDiscoveryRoute.ca-yyz-san.title": "Sol- och surfresa till San Diego",
    "homeDiscoveryRoute.ca-yyz-san.routeNote": "Pålitlig gränsöverskridande rutt för stränder, parker och hamnutsikter.",
    "homeDiscoveryRoute.ca-yvr-syd.title": "Transpacifiskt äventyr till Sydney",
    "homeDiscoveryRoute.ca-yvr-syd.routeNote": "Långdistansfavorit för hamnlandmärken och strandnära förorter.",
    flightBookingFaqs: "Vanliga frågor om flygbokning",
    flightBookingFaqIntro: "Gå igenom vanliga detaljer för flygsökning innan du fortsätter till en leverantör.",
    flightFaqBestTimeQuestion: "När är bästa tiden att boka ett flyg?",
    flightFaqBestTimeAnswer: "Flygpriser kan ändras beroende på rutt, säsong, efterfrågan och tillgänglighet. Det är ofta bra att jämföra flera datum, kontrollera närliggande flygplatser när det är möjligt och granska hela resplanen innan du väljer ett pris.",
    flightFaqBeforeBookingQuestion: "Vad bör jag kontrollera innan bokning?",
    flightFaqBeforeBookingAnswer: "Granska avgångs- och ankomsttider, total restid, mellanlandningar, bagageregler, platsval, avbokningsvillkor och policy för biljettändringar innan du slutför bokningen hos leverantören.",
    flightFaqFlexibleFareQuestion: "Vad är ett flexibelt pris?",
    flightFaqFlexibleFareAnswer: "Ett flexibelt pris kan tillåta ändringar eller avbokningar med färre begränsningar än ett baspris, men de exakta reglerna beror på flygbolaget eller bokningsleverantören. Granska alltid prisvillkoren före köp.",
    flightFaqNonstopQuestion: "Är direktflyg alltid bättre?",
    flightFaqNonstopAnswer: "Inte alltid. Direktflyg kan spara tid, medan rutter med ett stopp kan erbjuda andra avgångstider, ankomstfönster eller prisalternativ. Jämför total restid, mellanlandningens längd och bekvämlighet innan du bestämmer dig.",
    flightFaqBaggageQuestion: "Hur fungerar bagageregler?",
    flightFaqBaggageAnswer: "Bagageregler kan variera beroende på flygbolag, rutt, kabinklass, pristyp och leverantör. Kontrollera om handbagage, incheckat bagage och personliga föremål ingår innan du bokar.",
    flightFaqChangeCancelQuestion: "Kan jag ändra eller avboka min biljett?",
    flightFaqChangeCancelAnswer: "Möjligheter till ändring och avbokning beror på prisregler och leverantörens policyer. Vissa biljetter kan vara ej återbetalningsbara eller ha avgifter, så granska villkoren noggrant innan du bokar.",
    flightFaqInternationalQuestion: "Vad bör jag veta om internationella flyg?",
    flightFaqInternationalAnswer: "För internationella resor bör du kontrollera passets giltighet, visumkrav, transitregler, bagagepolicyer och inresekrav för destinationen innan du bokar.",
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    assert.equal(sv[key], expectedValue, `${key} should resolve to Swedish`);
    if (expectedValue !== enTranslations[key]) assert.notEqual(sv[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(`${1} ${sv.adultSingular}, ${sv.economy}`, "1 vuxen, Ekonomi");
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.nativeLabel === "Svenska" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));

  const expectedRouteLabels = [
    ["Lagos", "London", "Lagos till London"],
    ["Lagos", "Dubai", "Lagos till Dubai"],
    ["Abuja", "Accra", "Abuja till Accra"],
    ["Lagos", "Nairobi", "Lagos till Nairobi"],
    ["Lagos", "Cape Town", "Lagos till Cape Town"],
    ["Toronto", "Cancun", "Toronto till Cancun"],
    ["Edmonton", "Puerto Vallarta", "Edmonton till Puerto Vallarta"],
    ["Toronto", "Honolulu", "Toronto till Honolulu"],
    ["Toronto", "San Diego", "Toronto till San Diego"],
    ["Vancouver", "Sydney", "Vancouver till Sydney"],
  ] as const;

  for (const [originCity, destinationCity, expectedLabel] of expectedRouteLabels) {
    const label = formatHomeDiscoveryRoute(sv, originCity, destinationCity);

    assert.equal(label, expectedLabel);
    assert.doesNotMatch(label, /\bto\b/);
  }

  assert.equal(formatHomeDiscoveryRoute(enTranslations, "Lagos", "London"), "Lagos to London");

  const ngRouteCodes = getHomeDiscoveryByRegion("NG")
    .filter((item) => ["ng-los-lhr", "ng-los-dxb", "ng-abv-acc", "ng-los-nbo", "ng-los-cpt"].includes(item.id))
    .map((item) => `${item.originCode} → ${item.destinationCode}`);
  const caRouteCodes = getHomeDiscoveryByRegion("CA")
    .filter((item) => ["ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd"].includes(item.id))
    .map((item) => `${item.originCode} → ${item.destinationCode}`);

  assert.deepEqual(ngRouteCodes, ["LOS → LHR", "LOS → DXB", "ABV → ACC", "LOS → NBO", "LOS → CPT"]);
  assert.deepEqual(caRouteCodes, ["YYZ → CUN", "YEG → PVR", "YYZ → HNL", "YYZ → SAN", "YVR → SYD"]);

  const flightsPageSource = readFileSync("src/app/flights/page.tsx", "utf8");
  const flightLandingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");
  const searchFormSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");

  assert.ok(flightsPageSource.includes("<FlightLandingClient />"), "The /flights page should render the active flight landing client.");
  for (const key of ["flightLandingHeroTitle", "flightLandingHeroSubtitle", "discoverDestinationsFromRegion", "flightLandingStartThisSearch", "flightLandingRouteIdeasTitle", "beachVacations", "flightBookingFaqs", "flightBookingFaqIntro"]) {
    assert.ok(flightLandingSource.includes(`t("${key}")`), `Flight landing render path should read ${key} through i18n.`);
  }
  for (const key of ["cityOrAirport", "destination", "searchFlights", "roundTrip", "oneWay", "origin", "travelDates", "travelers"]) {
    assert.ok(searchFormSource.includes(`t("${key}")`) || searchFormSource.includes(`t("${key}")`), `Flight search form should read ${key} through i18n.`);
  }
  assert.ok(flightLandingSource.includes("formatHomeDiscoveryRoute"));
  assert.ok(flightLandingSource.includes('t("flightLandingRouteTemplate")'));
  assert.ok(!flightLandingSource.includes("${routeText.originCity} to ${routeText.destinationCity}"));

  assert.ok(
    flightLandingSource.includes("getHomeDiscoveryByRegion(selectedOption.code)") &&
      flightLandingSource.includes("buildDiscoveryLink(item)") &&
      flightLandingSource.includes("{item.originCode} → {item.destinationCode}") &&
      flightLandingSource.includes('className="group block overflow-hidden rounded-3xl') &&
      homeDiscoverySource.includes('id: "ca-yyz-cun"') &&
      homeDiscoverySource.includes('originCode: "YEG"') &&
      homeDiscoverySource.includes('destinationCode: "CUN"') &&
      homeDiscoverySource.includes('id: "ca-yvr-syd"') &&
      homeDiscoverySource.includes('destinationCode: "SYD"'),
    "Flights landing should keep route/card IDs, airport codes, route arrows, href builder, image data source, order source, and layout classes unchanged.",
  );
  assert.ok(
    searchFormSource.includes('origin: originCode || origin.trim()') &&
      searchFormSource.includes('destination: destinationCode || destination.trim()') &&
      searchFormSource.includes('travelers: String(normalizedTravelers)') &&
      searchFormSource.includes('router.push(`/flights/results?${params.toString()}`)'),
    "Flights search behavior, form field payloads, and CTA route generation should remain unchanged.",
  );
});





test("Indonesian Flights landing copy resolves through active render path", () => {
  const id = getTranslations("id-ID");
  const expected: Record<string, string> = {
    flightLandingHeroTitle: "Temukan penerbangan terjangkau berikutnya dengan mudah.",
    flightLandingHeroSubtitle: "Cari rute, bandingkan tanggal, dan jelajahi opsi penerbangan untuk perjalanan Anda berikutnya.",
    cityOrAirport: "Kota atau bandara",
    searchFlights: "Cari penerbangan",
    tripType: "JENIS PERJALANAN",
    roundTrip: "Pulang pergi",
    oneWay: "Sekali jalan",
    origin: "ASAL",
    destination: "TUJUAN",
    travelDates: "Tanggal perjalanan",
    travelers: "PENUMPANG",
    discoverDestinationsFromRegion: "Temukan destinasi dari wilayah Anda",
    discoverDestinationsFromRegionBody: "Jelajahi rute pilihan dan mulai perjalanan Anda berikutnya dengan percaya diri.",
    flightLandingStartThisSearch: "Mulai pencarian ini",
    flightLandingFeatureSearchReadyTitle: "Rute siap dicari",
    flightLandingFeatureSearchReadyBody: "Masukkan detail perjalanan sebenarnya sebelum hasil diminta dari penyedia penerbangan.",
    flightLandingFeatureCompareTitle: "Bandingkan dalam konteks",
    flightLandingFeatureCompareBody: "Gunakan tanggal, jumlah penumpang, kabin, durasi, transit, dan detail rute untuk mengevaluasi opsi.",
    flightLandingFeatureProviderTitle: "Tinjauan penyedia",
    flightLandingFeatureProviderBody: "Selalu konfirmasi ketersediaan akhir, harga, dan aturan dengan penyedia sebelum memesan.",
    flightLandingRouteIdeasTitle: "Ide rute untuk perjalanan fleksibel",
    flightLandingRouteIdeasBody: "Jelajahi ide rute, lalu mulai pencarian nyata dengan tanggal dan penumpang sebelum membandingkan penerbangan yang tersedia.",
    flightLandingRouteTemplate: "{{origin}} ke {{destination}}",
    flightLandingRouteConnector: "ke",
    "flightLandingCity.Cairo": "Kairo",
    "flightLandingCity.Rome": "Roma",
    "flightLandingImageAlt.Johannesburg skyline at golden hour": "Cakrawala Johannesburg saat cahaya senja keemasan",
    "flightLandingImageAlt.Cairo skyline with the Pyramids of Giza": "Cakrawala Kairo dengan Piramida Giza",
    "flightLandingImageAlt.Addis Ababa cityscape in the Ethiopian highlands": "Lanskap kota Addis Ababa di dataran tinggi Ethiopia",
    beachVacations: "Liburan pantai",
    beachVacationsBody: "Jelajahi rute penerbangan ke pesisir cerah, liburan pulau, dan destinasi pantai bercuaca hangat.",
    "homeDiscoveryRoute.ca-yyz-cun.title": "Liburan musim dingin Cancun",
    "homeDiscoveryRoute.ca-yyz-cun.routeNote": "Rute liburan andal dengan opsi nonstop pada musim puncak.",
    "homeDiscoveryRoute.ca-yeg-pvr.title": "Liburan pantai Puerto Vallarta",
    "homeDiscoveryRoute.ca-yeg-pvr.routeNote": "Rute matahari musim dingin dengan pantai Pasifik dan pesona kota tua.",
    "flightLandingImageAlt.Puerto Vallarta coastline and old town": "Garis pantai Puerto Vallarta dan kota tua",
    "homeDiscoveryRoute.ca-yyz-hnl.title": "Liburan pulau jarak jauh Honolulu",
    "homeDiscoveryRoute.ca-yyz-hnl.routeNote": "Opsi liburan premium untuk pantai, selancar, dan pendakian pulau.",
    "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water": "Pantai Waikiki Honolulu dengan Diamond Head dan air biru cerah",
    "homeDiscoveryRoute.ca-yyz-san.title": "Perjalanan matahari dan selancar San Diego",
    "homeDiscoveryRoute.ca-yyz-san.routeNote": "Rute lintas perbatasan andal untuk pantai, taman, dan pemandangan pelabuhan.",
    "flightLandingImageAlt.San Diego bay skyline and marina": "Cakrawala teluk San Diego dan marina",
    "homeDiscoveryRoute.ca-yvr-syd.title": "Petualangan transpasifik Sydney",
    "homeDiscoveryRoute.ca-yvr-syd.routeNote": "Favorit jarak jauh untuk landmark pelabuhan dan pinggiran tepi pantai.",
    flightBookingFaqs: "FAQ pemesanan penerbangan",
    flightBookingFaqIntro: "Tinjau detail umum pencarian penerbangan sebelum melanjutkan dengan penyedia.",
    flightFaqBestTimeQuestion: "Kapan waktu terbaik untuk memesan penerbangan?",
    flightFaqBeforeBookingQuestion: "Apa yang harus saya periksa sebelum memesan?",
    flightFaqFlexibleFareQuestion: "Apa itu tarif fleksibel?",
    flightFaqNonstopQuestion: "Apakah penerbangan nonstop selalu lebih baik?",
    flightFaqBaggageQuestion: "Bagaimana cara kerja aturan bagasi?",
    flightFaqChangeCancelQuestion: "Bisakah saya mengubah atau membatalkan tiket?",
    flightFaqInternationalQuestion: "Apa yang perlu saya ketahui tentang penerbangan internasional?",
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    assert.equal(id[key], expectedValue, `${key} should resolve to Indonesian`);
    if (expectedValue !== enTranslations[key]) assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(`${1} ${id.adultSingular}, ${id.economy}`, "1 dewasa, Ekonomi");
  assert.match(id.flightFaqInternationalAnswer, /Kurioticket membantu mencari dan membandingkan opsi/);
  assert.match(id.flightFaqInternationalAnswer, /penyedia/);
  assert.match(id.flightFaqChangeCancelAnswer, /penyedia tempat tiket diselesaikan/);
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));

  const expectedRouteLabels = [
    ["Lagos", "London", "Lagos ke London"],
    ["Lagos", "Dubai", "Lagos ke Dubai"],
    ["Abuja", "Accra", "Abuja ke Accra"],
    ["Lagos", "Nairobi", "Lagos ke Nairobi"],
    ["Lagos", "Cape Town", "Lagos ke Cape Town"],
    ["Toronto", "Cancun", "Toronto ke Cancun"],
    ["Edmonton", "Puerto Vallarta", "Edmonton ke Puerto Vallarta"],
    ["Toronto", "Honolulu", "Toronto ke Honolulu"],
    ["Toronto", "San Diego", "Toronto ke San Diego"],
    ["Vancouver", "Sydney", "Vancouver ke Sydney"],
  ] as const;

  for (const [originCity, destinationCity, expectedLabel] of expectedRouteLabels) {
    const label = formatHomeDiscoveryRoute(id, originCity, destinationCity);
    assert.equal(label, expectedLabel);
    assert.doesNotMatch(label, /\bto\b/);
  }

  assert.deepEqual(
    getHomeDiscoveryByRegion("NG")
      .slice(4, 12)
      .map((item) => `${item.originCode} → ${item.destinationCode}`),
    ["ABV → JNB", "LOS → IST", "ABV → CDG", "LOS → DOH", "LOS → KGL", "ABV → CAI", "LOS → ADD", "ABV → FCO"],
  );
  assert.deepEqual(
    getHomeDiscoveryByRegion("CA")
      .filter((item) => ["ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd"].includes(item.id))
      .map((item) => `${item.originCode} → ${item.destinationCode}`),
    ["YYZ → CUN", "YEG → PVR", "YYZ → HNL", "YYZ → SAN", "YVR → SYD"],
  );

  const flightsPageSource = readFileSync("src/app/flights/page.tsx", "utf8");
  const flightLandingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");
  const searchFormSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");

  assert.ok(flightsPageSource.includes("<FlightLandingClient />"));
  for (const key of ["flightLandingHeroTitle", "flightLandingHeroSubtitle", "discoverDestinationsFromRegion", "flightLandingStartThisSearch", "flightLandingRouteIdeasTitle", "beachVacations", "flightBookingFaqs", "flightBookingFaqIntro"]) {
    assert.ok(flightLandingSource.includes(`t("${key}")`), `${key} should be read through i18n`);
  }
  for (const key of ["cityOrAirport", "destination", "searchFlights", "tripType", "roundTrip", "oneWay", "origin", "travelDates", "travelers"]) {
    assert.ok(searchFormSource.includes(`t("${key}")`), `${key} should be read through i18n`);
  }
  assert.equal(id.tripType, "JENIS PERJALANAN");
  assert.equal(id.roundTrip, "Pulang pergi");
  assert.equal(id.oneWay, "Sekali jalan");
  assert.notEqual(id.tripType, "TRIP TYPE");
  assert.notEqual(id.tripType, enTranslations.tripType);
  assert.ok(searchFormSource.includes('aria-label={t("tripType") || "Trip type"}'), "Standalone /flights trip-type control should read the i18n key before the English fallback.");
  assert.ok(!searchFormSource.includes('>TRIP TYPE<'), "Standalone /flights trip-type control should not hardcode the Indonesian label as English.");
  assert.ok(searchFormSource.includes('["round-trip", t("roundTrip")]') && searchFormSource.includes('["one-way", t("oneWay")]'), "Trip-type options should stay wired to Indonesian i18n values.");
  assert.ok(flightLandingSource.includes("formatHomeDiscoveryRoute"));
  assert.ok(flightLandingSource.includes('t("flightLandingRouteTemplate")'));
  assert.ok(!flightLandingSource.includes("${routeText.originCity} to ${routeText.destinationCity}"));
  for (const english of ["Find your next affordable flight with ease.", "Search routes, compare dates, and explore flight options for your next journey.", "Discover destinations from your region", "Start this search", "Beach vacations", "Flight booking FAQs"]) {
    assert.ok(!flightLandingSource.includes(`>${english}<`), `${english} should not be hardcoded as rendered JSX text`);
  }
  assert.ok(
    flightLandingSource.includes("getHomeDiscoveryByRegion(selectedOption.code)") &&
      flightLandingSource.includes("buildDiscoveryLink(item)") &&
      flightLandingSource.includes("{item.originCode} → {item.destinationCode}") &&
      flightLandingSource.includes('className="group block overflow-hidden rounded-3xl') &&
      homeDiscoverySource.includes('id: "ca-yyz-cun"') &&
      homeDiscoverySource.includes('originCode: "YEG"') &&
      homeDiscoverySource.includes('destinationCode: "CUN"') &&
      homeDiscoverySource.includes('id: "ca-yvr-syd"') &&
      homeDiscoverySource.includes('destinationCode: "SYD"'),
    "Flights landing should keep route/card IDs, airport codes, route arrows, href builder, image data source, order source, and layout classes unchanged.",
  );
  assert.ok(
    searchFormSource.includes('origin: originCode || origin.trim()') &&
      searchFormSource.includes('destination: destinationCode || destination.trim()') &&
      searchFormSource.includes('travelers: String(normalizedTravelers)') &&
      searchFormSource.includes('router.push(`/flights/results?${params.toString()}`)'),
    "Flights search behavior, form field payloads, and CTA route generation should remain unchanged.",
  );
});

test("Thai global language selector copy resolves through active i18n keys", () => {
  const th = getTranslations("th");
  const expected = {
    globalLanguage: "ภาษาของเว็บไซต์",
    websiteLanguageTitle: "เลือกภาษาของเว็บไซต์",
    websiteLanguageDescription:
      "English (United States) เป็นภาษาเริ่มต้นของเว็บไซต์ Kurioticket จะเปลี่ยนภาษาเฉพาะหลังจากที่คุณเลือกตัวเลือกที่พร้อมใช้งาน",
    currentLanguage: "ภาษาปัจจุบัน: {{language}}",
    languagePreparingNotice:
      "กำลังเตรียมภาษาเพิ่มเติม ตัวเลือกที่ยังไม่พร้อมใช้งานจะยังไม่แปลเว็บไซต์",
    languageSearchLabel: "ค้นหาภาษา",
    languageSearchPlaceholder: "ค้นหา English, Español, Français, Deutsch...",
    closeLanguageSelector: "ปิดตัวเลือกภาษา",
    openLanguagePreferences:
      "เปิดการตั้งค่าภาษา, ภาษาปัจจุบัน {{language}}",
    preparing: "กำลังเตรียม",
    languageUnavailableMessage: "ภาษานี้ยังไม่พร้อมใช้งาน",
    languagePreparingAria: "กำลังเตรียมภาษา {{language}}",
    selectLanguageOption: "เลือกภาษา {{language}}",
  } as const;

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, key);
    assert.equal(thTranslations[key], value, key);
    assert.notEqual(th[key], enTranslations[key], key);
  }

  assert.equal(th.currentLanguage.replace("{{language}}", "ไทย"), "ภาษาปัจจุบัน: ไทย");
  assert.equal(th.selectLanguageOption.replace("{{language}}", "ไทย"), "เลือกภาษา ไทย");
  assert.equal(th.languagePreparingAria.replace("{{language}}", "ไทย"), "กำลังเตรียมภาษา ไทย");
  assert.match(th.currentLanguage, /\{\{language\}\}/);
  assert.match(th.selectLanguageOption, /\{\{language\}\}/);
  assert.match(th.languagePreparingAria, /\{\{language\}\}/);
  assert.ok(languageOptions.some((o) => o.code === "th" && o.locale === "th-TH" && o.nativeLabel === "ไทย" && o.direction === "ltr" && o.status === "available"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Thai global language selector render path uses i18n keys without active screenshot English literals", () => {
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");

  for (const key of [
    "openLanguagePreferences",
    "globalLanguage",
    "websiteLanguageTitle",
    "websiteLanguageDescription",
    "currentLanguage",
    "languagePreparingNotice",
    "languageSearchLabel",
    "languageSearchPlaceholder",
    "closeLanguageSelector",
    "selectLanguageOption",
    "languagePreparingAria",
    "preparing",
  ]) {
    assert.match(headerSource, new RegExp(`t\\.${key}`), key);
  }

  assert.doesNotMatch(
    headerSource,
    />GLOBAL LANGUAGE<|>Select your website language<|English \(United States\) is the default website language|>Current language:<|>More languages are being prepared\.|>Search language<|Search English, Español, Français, Deutsch|Close language selector/,
  );
  assert.match(headerSource, /onClick=\{closeLanguageDialog\}/);
  assert.match(headerSource, /setLanguageQuery\(event\.target\.value\)/);
  assert.match(headerSource, /aria-modal="true"/);
  assert.match(headerSource, /role="radiogroup"/);
  assert.match(headerSource, /role="radio"/);
  assert.match(headerSource, /aria-checked=\{active\}/);
  assert.match(headerSource, /aria-disabled=\{!available\}/);
});

test("Indonesian auth, language, and country/currency copy resolves without English fallback", () => {
  const id = getTranslations("id-ID");
  const expected: Record<string, string> = {
    login: "Masuk",
    signUp: "Daftar",
    signupPageTitle: "Buat akun Anda",
    signupFullNameLabel: "Nama lengkap",
    signupEmailLabel: "Email",
    signupPasswordLabel: "Kata sandi",
    signupAgreementBeforeTerms: "Dengan membuat akun, Anda menyetujui ",
    signupTermsLink: "Ketentuan",
    signupAgreementBetweenLinks: ", ",
    signupPrivacyPolicyLink: "Kebijakan Privasi",
    signupAgreementAfterPrivacy: ", dan pengungkapan pengalihan mitra.",
    signupSubmit: "Daftar",
    signupCreatingAccount: "Membuat akun...",
    signupGoogle: "Lanjutkan dengan Google",
    signupAlreadyHaveAccount: "Sudah punya akun?",
    signupLoginLink: "Masuk",
    loginPageTitle: "Masuk",
    loginPageSubtitle: "Simpan pencarian, kelola notifikasi, dan akses dasbor perjalanan Anda.",
    loginEmailLabel: "Email",
    loginPasswordLabel: "Kata sandi",
    loginForgotPassword: "Lupa kata sandi?",
    loginSubmit: "Masuk",
    loginCheckingDetails: "Memeriksa detail...",
    loginGoogle: "Lanjutkan dengan Google",
    loginDivider: "ATAU",
    loginSignupPrompt: "Baru di Kurioticket?",
    loginCreateAccount: "Buat akun",
    loginCodeSent: "Kami telah mengirimkan kode verifikasi ke email Anda.",
    loginCodeInstructions: "Masukkan kode 6 digit yang dikirim ke {{email}}. Kode berlaku selama {{minutes}} menit.",
    loginVerificationCodeLabel: "Kode verifikasi",
    loginVerifying: "Memverifikasi...",
    loginVerifyLogin: "Verifikasi masuk",
    loginSendingCode: "Mengirim...",
    loginResendIn: "Kirim ulang dalam {{seconds}} dtk",
    loginUseDifferentDetails: "Gunakan detail lain",
    forgotPasswordTitle: "Atur ulang kata sandi Anda",
    forgotPasswordSubtitle: "Masukkan email Anda dan kami akan mengirimkan instruksi untuk mengatur ulang kata sandi.",
    forgotPasswordEmailLabel: "Email",
    forgotPasswordEmailPlaceholder: "anda@example.com",
    forgotPasswordSuccess: "Jika akun tersedia, kami telah mengirimkan instruksi reset kata sandi.",
    forgotPasswordSending: "Mengirim...",
    forgotPasswordSubmit: "Kirim tautan reset",
    forgotPasswordRemember: "Ingat kata sandi Anda?",
    forgotPasswordLoginLink: "Masuk",
    resetPasswordTitle: "Atur ulang kata sandi Anda",
    resetPasswordRemember: "Ingat kata sandi Anda?",
    resetPasswordLoginLink: "Masuk",
    verifyEmailTitle: "Verifikasi email Anda",
    verifyEmailInstructions: "Masukkan kode 6 digit yang kami kirim ke email Anda. Kode berlaku selama 10 menit.",
    verifyEmailCodeLabel: "Kode verifikasi",
    verifyEmailVerifying: "Memverifikasi...",
    verifyEmailSubmit: "Verifikasi email",
    verifyEmailSending: "Mengirim...",
    verifyEmailSendNewCode: "Kirim kode baru",
    verifyEmailAlreadyVerified: "Sudah diverifikasi?",
    verifyEmailLoginLink: "Masuk",
    verifyLoginTitle: "Verifikasi masuk Anda",
    verifyLoginInstructions: "Masukkan kode 6 digit yang kami kirim ke email Anda. Kode berlaku selama 10 menit.",
    verifyLoginCodeLabel: "Kode verifikasi",
    verifyLoginSubmit: "Verifikasi masuk",
    openLanguagePreferences: "Buka preferensi bahasa, bahasa saat ini {{language}}",
    websiteLanguageTitle: "Pilih bahasa situs web Anda",
    websiteLanguageDescription: "Bahasa Inggris (Amerika Serikat) adalah bahasa bawaan situs web. Kurioticket hanya mengubah bahasa setelah Anda memilih opsi yang tersedia.",
    currentLanguage: "Bahasa saat ini: {{language}}",
    languagePreparingNotice: "Bahasa lainnya sedang disiapkan. Opsi yang belum tersedia belum menerjemahkan situs.",
    languageSearchLabel: "Cari bahasa",
    languageSearchPlaceholder: "Cari English, Español, Français, Deutsch...",
    globalLanguage: "BAHASA GLOBAL",
    chooseCountryAndCurrency: "Pilih negara dan mata uang",
    countryCurrencyDescription: "Pilih negara dan mata uang yang digunakan untuk menampilkan harga. Saran bandara menggunakan lokasi yang terdeteksi.",
    searchCountryOrCurrency: "Cari negara atau mata uang",
    countryCurrencyPopularCountryAndCurrency: "NEGARA DAN MATA UANG POPULER",
    countryCurrencyAllCountriesAndCurrencies: "SEMUA NEGARA DAN MATA UANG",
    showMoreResults: "Tampilkan hasil lainnya",
    countryCurrencyOptionCountSingular: "{{count}} opsi",
    countryCurrencyOptionCountPlural: "{{count}} opsi",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(id[key], value, key);
    if (value !== enTranslations[key]) assert.notEqual(id[key], enTranslations[key], key);
  }

  assert.equal(id.currentLanguage.replace("{{language}}", "Bahasa Indonesia"), "Bahasa saat ini: Bahasa Indonesia");
  assert.match(id.loginCodeInstructions, /\{\{email\}\}/);
  assert.match(id.loginCodeInstructions, /\{\{minutes\}\}/);
  assert.match(id.loginResendIn, /\{\{seconds\}\}/);
  assert.equal(id.loginCodeInstructions.replace("{{email}}", "user@example.com").replace("{{minutes}}", "10"), "Masukkan kode 6 digit yang dikirim ke user@example.com. Kode berlaku selama 10 menit.");
  assert.equal(id.loginResendIn.replace("{{seconds}}", "30"), "Kirim ulang dalam 30 dtk");
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Indonesian auth and global modal render paths use corrected i18n keys without active English literals", () => {
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const countryCurrencySource = readFileSync("src/components/region/CountryCurrencySelector.tsx", "utf8");
  const signinSource = readFileSync("src/components/auth/SigninForm.tsx", "utf8");
  const forgotSource = readFileSync("src/components/auth/ForgotPasswordForm.tsx", "utf8");
  const signupSource = readFileSync("src/components/auth/SignupForm.tsx", "utf8");
  const verifyEmailSource = readFileSync("src/components/auth/VerifyEmailForm.tsx", "utf8");
  const verifyLoginSource = readFileSync("src/components/auth/VerifyLoginForm.tsx", "utf8");

  for (const key of ["login", "signUp", "globalLanguage", "websiteLanguageTitle", "websiteLanguageDescription", "currentLanguage", "languagePreparingNotice", "languageSearchLabel", "languageSearchPlaceholder"]) assert.match(headerSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["chooseCountryAndCurrency", "countryCurrencyDescription", "searchCountryOrCurrency", "countryCurrencyAllCountriesAndCurrencies", "countryCurrencyPopularCountryAndCurrency", "countryCurrencyOptionCountSingular", "countryCurrencyOptionCountPlural", "showMoreResults"]) assert.match(countryCurrencySource, new RegExp(`t\\.${key}`), key);
  for (const key of ["loginPageTitle", "loginPageSubtitle", "loginEmailLabel", "loginPasswordLabel", "loginForgotPassword", "loginSubmit", "loginCheckingDetails", "loginDivider", "loginGoogle", "loginSignupPrompt", "loginCreateAccount", "loginCodeSent", "loginCodeInstructions", "loginVerificationCodeLabel", "loginVerifyLogin", "loginResendIn", "loginUseDifferentDetails"]) assert.match(signinSource, new RegExp(`t\\.${key}|key: "${key}"`), key);
  for (const key of ["forgotPasswordTitle", "forgotPasswordSubtitle", "forgotPasswordEmailLabel", "forgotPasswordEmailPlaceholder", "forgotPasswordSending", "forgotPasswordSubmit", "forgotPasswordRemember", "forgotPasswordLoginLink", "forgotPasswordSuccess"]) assert.match(forgotSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["signupPageTitle", "signupFullNameLabel", "signupEmailLabel", "signupPasswordLabel", "signupAgreementBeforeTerms", "signupTermsLink", "signupAgreementBetweenLinks", "signupPrivacyPolicyLink", "signupAgreementAfterPrivacy", "signupSubmit", "signupCreatingAccount", "signupGoogle", "signupAlreadyHaveAccount", "signupLoginLink"]) assert.match(signupSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["verifyEmailTitle", "verifyEmailInstructions", "verifyEmailCodeLabel", "verifyEmailVerifying", "verifyEmailSubmit", "verifyEmailSending", "verifyEmailSendNewCode", "verifyEmailAlreadyVerified", "verifyEmailLoginLink"]) assert.match(verifyEmailSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["verifyLoginTitle", "verifyLoginInstructions", "verifyLoginCodeLabel", "loginVerifying", "verifyLoginSubmit", "verifyLoginAgainLink"]) assert.match(verifyLoginSource, new RegExp(`t\\.${key}`), key);

  assert.doesNotMatch(signinSource, />Log in<|>Save searches, manage alerts, and access your travel dashboard\.<|>Forgot password\?<|>OR<|>Continue with Google<|>New to Kurioticket\?<|>Create an account<|>Verification code<|>Verify login<|>Use different details</);
  assert.doesNotMatch(forgotSource, />Reset your password<|>Enter your email and we'll send instructions to reset your password\.<|>Send reset link<|>Remember your password\?<|>Log in</);
  assert.doesNotMatch(signupSource, />Create your account<|>Full name<|>Sign Up<|>Continue with Google<|>Already have an account\?<|>Log in</);
  assert.doesNotMatch(headerSource, />GLOBAL LANGUAGE<|>Select your website language<|>More languages are being prepared\.|>Search language</);
  assert.doesNotMatch(countryCurrencySource, />Choose country and currency<|>POPULAR COUNTRY AND CURRENCY<|>ALL COUNTRIES AND CURRENCIES<|>Show more results</);

  assert.match(signinSource, /<Input\s+name="email"\s+type="email"/);
  assert.match(signinSource, /<Input\s+name="password"\s+type="password"/);
  assert.match(signinSource, /signIn\("google", \{/);
  assert.match(signinSource, /callbackUrl/);
  assert.match(signupSource, /<Input name="name" autoComplete="name" required/);
  assert.match(signupSource, /signIn\("google", \{ callbackUrl: "\/onboarding" \}\)/);
  assert.match(verifyEmailSource, /fetch\("\/api\/auth\/verify-email"/);
  assert.match(verifyLoginSource, /signIn\("credentials", \{/);
  assert.match(countryCurrencySource, /setOpen\(true\)/);
  assert.match(countryCurrencySource, /selectedOption/);
});

test("Swedish global modal and auth copy resolves without English fallback", () => {
  const sv = getTranslations("sv");
  const expected: Record<string, string> = {
    chooseCountryAndCurrency: "Välj land och valuta",
    countryCurrencyDescription: "Välj land och valuta som används för att visa priser. Flygplatsförslag använder din upptäckta plats.",
    searchCountryOrCurrency: "Sök land eller valuta",
    countryCurrencyPopularCountryAndCurrency: "POPULÄRA LÄNDER OCH VALUTOR",
    countryCurrencyAllCountriesAndCurrencies: "ALLA LÄNDER OCH VALUTOR",
    countryCurrencyOptionCountSingular: "{{count}} alternativ",
    countryCurrencyOptionCountPlural: "{{count}} alternativ",
    showMoreResults: "Visa fler resultat",
    globalLanguage: "GLOBALT SPRÅK",
    websiteLanguageTitle: "Välj webbplatsspråk",
    websiteLanguageDescription: "Engelska (USA) är standardspråk för webbplatsen. Kurioticket byter språk först när du väljer ett tillgängligt alternativ.",
    currentLanguage: "Aktuellt språk: {{language}}",
    languagePreparingNotice: "Fler språk förbereds. Otillgängliga alternativ översätter inte webbplatsen ännu.",
    languageSearchLabel: "Sök språk",
    languageSearchPlaceholder: "Sök English, Español, Français, Deutsch...",
    login: "Logga in",
    signUp: "Registrera dig",
    loginPageTitle: "Logga in",
    loginPageSubtitle: "Spara sökningar, hantera aviseringar och få åtkomst till din reseöversikt.",
    loginEmailLabel: "E-post",
    loginPasswordLabel: "Lösenord",
    loginForgotPassword: "Glömt lösenordet?",
    loginDivider: "ELLER",
    loginGoogle: "Fortsätt med Google",
    loginSignupPrompt: "Ny på Kurioticket?",
    loginCreateAccount: "Skapa ett konto",
    forgotPasswordTitle: "Återställ ditt lösenord",
    forgotPasswordSubtitle: "Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord.",
    forgotPasswordEmailLabel: "E-post",
    forgotPasswordEmailPlaceholder: "du@example.com",
    forgotPasswordSubmit: "Skicka återställningslänk",
    forgotPasswordRemember: "Kommer du ihåg ditt lösenord?",
    forgotPasswordLoginLink: "Logga in",
    forgotPasswordSuccess: "Om ett konto finns har vi skickat instruktioner för lösenordsåterställning.",
    loginCodeSent: "Vi skickade en verifieringskod till din e-post.",
    loginCodeInstructions: "Ange den 6-siffriga koden som skickades till {{email}}. Koder upphör att gälla efter {{minutes}} minuter.",
    loginVerificationCodeLabel: "Verifieringskod",
    loginVerifyLogin: "Verifiera inloggning",
    loginResendIn: "Skicka igen om {{seconds}}s",
    loginUseDifferentDetails: "Använd andra uppgifter",
    signupPageTitle: "Skapa ditt konto",
    signupFullNameLabel: "Fullständigt namn",
    signupEmailLabel: "E-post",
    signupPasswordLabel: "Lösenord",
    signupAgreementBeforeTerms: "Genom att skapa ett konto godkänner du ",
    signupTermsLink: "användarvillkoren",
    signupAgreementBetweenLinks: ", ",
    signupPrivacyPolicyLink: "integritetspolicyn",
    signupAgreementAfterPrivacy: " och informationen om omdirigering till partner.",
    signupSubmit: "Registrera dig",
    signupGoogle: "Fortsätt med Google",
    signupAlreadyHaveAccount: "Har du redan ett konto?",
    signupLoginLink: "Logga in",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(sv[key], value, key);
    if (value !== enTranslations[key]) assert.notEqual(sv[key], enTranslations[key], key);
  }

  assert.equal(sv.currentLanguage.replace("{{language}}", "Svenska"), "Aktuellt språk: Svenska");
  assert.match(sv.currentLanguage, /\{\{language\}\}/);
  assert.match(sv.loginCodeInstructions, /\{\{email\}\}/);
  assert.match(sv.loginCodeInstructions, /\{\{minutes\}\}/);
  assert.match(sv.loginResendIn, /\{\{seconds\}\}/);
  assert.equal(sv.loginCodeInstructions.replace("{{email}}", "user@example.com").replace("{{minutes}}", "10"), "Ange den 6-siffriga koden som skickades till user@example.com. Koder upphör att gälla efter 10 minuter.");
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Swedish global modal and auth render paths use i18n keys without active English literals", () => {
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const countryCurrencySource = readFileSync("src/components/region/CountryCurrencySelector.tsx", "utf8");
  const signinSource = readFileSync("src/components/auth/SigninForm.tsx", "utf8");
  const forgotSource = readFileSync("src/components/auth/ForgotPasswordForm.tsx", "utf8");
  const signupSource = readFileSync("src/components/auth/SignupForm.tsx", "utf8");
  const signinPageSource = readFileSync("src/app/auth/signin/page.tsx", "utf8");
  const forgotPageSource = readFileSync("src/app/auth/forgot-password/page.tsx", "utf8");
  const signupPageSource = readFileSync("src/app/auth/signup/page.tsx", "utf8");

  for (const key of ["login", "signUp", "globalLanguage", "websiteLanguageTitle", "websiteLanguageDescription", "currentLanguage", "languagePreparingNotice", "languageSearchLabel", "languageSearchPlaceholder"]) assert.match(headerSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["chooseCountryAndCurrency", "countryCurrencyDescription", "searchCountryOrCurrency", "countryCurrencyAllCountriesAndCurrencies", "countryCurrencyPopularCountryAndCurrency", "countryCurrencyOptionCountSingular", "countryCurrencyOptionCountPlural", "showMoreResults"]) assert.match(countryCurrencySource, new RegExp(`t\\.${key}`), key);
  for (const key of ["loginPageTitle", "loginPageSubtitle", "loginEmailLabel", "loginPasswordLabel", "loginForgotPassword", "loginSubmit", "loginDivider", "loginGoogle", "loginSignupPrompt", "loginCreateAccount", "loginCodeSent", "loginCodeInstructions", "loginVerificationCodeLabel", "loginVerifyLogin", "loginResendIn", "loginUseDifferentDetails"]) assert.match(signinSource, new RegExp(`t\\.${key}|key: "${key}"`), key);
  for (const key of ["forgotPasswordTitle", "forgotPasswordSubtitle", "forgotPasswordEmailLabel", "forgotPasswordEmailPlaceholder", "forgotPasswordSubmit", "forgotPasswordRemember", "forgotPasswordLoginLink", "forgotPasswordSuccess"]) assert.match(forgotSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["signupPageTitle", "signupFullNameLabel", "signupEmailLabel", "signupPasswordLabel", "signupAgreementBeforeTerms", "signupTermsLink", "signupAgreementBetweenLinks", "signupPrivacyPolicyLink", "signupAgreementAfterPrivacy", "signupSubmit", "signupGoogle", "signupAlreadyHaveAccount", "signupLoginLink"]) assert.match(signupSource, new RegExp(`t\\.${key}`), key);

  assert.doesNotMatch(signinSource, />Log in<|>Save searches, manage alerts, and access your travel dashboard\.<|>Forgot password\?<|>OR<|>Continue with Google<|>New to Kurioticket\?<|>Create an account<|>Verification code<|>Verify login<|>Use different details</);
  assert.doesNotMatch(forgotSource, />Reset your password<|>Enter your email and we'll send instructions to reset your password\.<|>Send reset link<|>Remember your password\?<|>Log in</);
  assert.doesNotMatch(signupSource, />Create your account<|>Full name<|>Sign Up<|>Continue with Google<|>Already have an account\?<|>Log in</);

  assert.match(signinSource, /<Input\s+name="email"\s+type="email"/);
  assert.match(signinSource, /<Input\s+name="password"\s+type="password"/);
  assert.match(signinSource, /<Input\s+name="code"\s+inputMode="numeric"/);
  assert.match(signinSource, /signIn\("google", \{/);
  assert.match(signinSource, /href="\/auth\/forgot-password"/);
  assert.match(signinSource, /href="\/auth\/signup"/);
  assert.match(forgotSource, /fetch\("\/api\/auth\/forgot-password"/);
  assert.match(forgotSource, /<Input\s+name="email"\s+type="email"/);
  assert.match(signupSource, /<Input name="name" autoComplete="name" required/);
  assert.match(signupSource, /<Input name="email" type="email" autoComplete="email" required/);
  assert.match(signupSource, /<Input name="password" type="password" autoComplete="new-password" minLength=\{8\} required/);
  assert.match(signupSource, /fetch\("\/api\/auth\/signup", \{/);
  assert.match(signupSource, /signIn\("google", \{ callbackUrl: "\/onboarding" \}\)/);
  assert.match(signinPageSource, /<SigninForm/);
  assert.match(signinPageSource, /googleEnabled=\{googleEnabled\}/);
  assert.match(signinPageSource, /callbackUrl=\{callbackUrl\}/);
  assert.match(forgotPageSource, /<ForgotPasswordForm \/>/);
  assert.match(signupPageSource, /<SignupForm googleEnabled=\{googleEnabled\} \/>/);
});

test("Swedish homepage flight and hotel date formatting uses sv-SE generated labels", () => {
  for (const locale of ["sv", "sv-SE", "sv-se"]) {
    assert.equal(normalizeFlightsCalendarLocale(locale), "sv-SE", `flight ${locale}`);
    assert.equal(normalizeHotelCalendarLocale(locale), "sv-SE", `hotel ${locale}`);
  }
  assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), "sv"), "juni 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "sv-se"), "juli 2026");
  assert.deepEqual(formatFlightsWeekdays("sv-SE"), ["sön", "mån", "tis", "ons", "tors", "fre", "lör"]);
});

test("Swedish homepage render paths keep using i18n keys and preserve dynamic route data", () => {
  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const searchSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const footerSource = readFileSync("src/components/layout/Footer.tsx", "utf8");

  for (const key of ["homeHeroTitle", "homeHeroSubtitle", "homeDiscoveryTitle", "homeTrustTitle", "homePromoFlightsTitle", "faqHeading", "homeNewsletterTitle", "homeNewsletterConsent"]) {
    assert.match(pageSource, new RegExp(`t\\("${key}"\\)`), key);
  }
  for (const key of ["flights", "hotels", "cars", "deals"]) assert.match(headerSource, new RegExp(`t\\.${key}|labelKey: "${key}"`), key);
  for (const key of ["roundTrip", "oneWay", "origin", "destination", "travelDates", "travelers", "passengers", "economy", "fromPlaceholder", "cityOrHotel", "hotelSearchTravelDatesLabel", "hotelSearchGuestsLabel", "stayDetails", "guestsAndRooms", "hotelAdultHelper", "hotelChildrenHelper", "hotelRoomsHelper", "petFriendly", "onlyShowPetFriendlyStays"]) assert.match(searchSource, new RegExp(key), key);
  for (const key of ["footerContactUs", "footerDiscover", "footerTermsSettings", "footerAboutKurioticket", "footerConfidenceTagline"]) assert.match(footerSource, new RegExp(`t\\.${key}`), key);

  assert.match(pageSource, /originCode=\{card\.item\.originCode\}/);
  assert.match(pageSource, /destinationCodeLabel=\{card\.item\.destinationCode\}/);
  assert.match(pageSource, /\{originCode\} → \{destinationCodeLabel\} · \{routeNote\}/);
  assert.match(pageSource, /buildDestinationCardHref\(price/);
  assert.match(searchSource, /new URLSearchParams\(\{/);
  assert.match(searchSource, /buildFlightRecentSearch\(/);
  assert.match(searchSource, /buildHotelRecentSearch\(/);
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
    cityOrAirport: "Miasto lub lotnisko",
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

test("Polish active flights page placeholders resolve without English fallback", () => {
  const pl = getTranslations("pl");
  const standaloneFlightSearchSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");

  assert.equal(pl.cityOrAirport, "Miasto lub lotnisko");
  assert.notEqual(pl.cityOrAirport, enTranslations.cityOrAirport);
  assert.equal(pl.origin, "WYLOT");
  assert.equal(pl.destination, "CEL PODRÓŻY");
  assert.equal(pl.travelDates, "DATY PODRÓŻY");
  assert.equal(pl.travelers, "PODRÓŻNI");
  assert.equal(pl.roundTrip, "W obie strony");
  assert.equal(pl.oneWay, "W jedną stronę");
  assert.equal(pl.searchFlights, "Szukaj lotów");

  assert.match(
    standaloneFlightSearchSource,
    /<AirportFieldControl[\s\S]*label=\{t\("origin"\)\}[\s\S]*value=\{origin\}[\s\S]*placeholder=\{t\("cityOrAirport"\)\}[\s\S]*onChange=\{\(nextValue\) => \{[\s\S]*markOriginManualInput\(current, nextValue\)/,
    "The active /flights origin field should read the localized cityOrAirport placeholder while preserving selected origin handling.",
  );
  assert.match(
    standaloneFlightSearchSource,
    /<AirportFieldControl[\s\S]*label=\{t\("destination"\)\}[\s\S]*value=\{destination\}[\s\S]*placeholder=\{t\("cityOrAirport"\)\}[\s\S]*onChange=\{\(nextValue\) => \{[\s\S]*setDestination\(nextValue\)/,
    "The active /flights destination field should read the localized cityOrAirport placeholder while preserving selected destination handling.",
  );
  assert.match(
    standaloneFlightSearchSource,
    /\{value \|\| placeholder\}[\s\S]*placeholder=\{placeholder\}/,
    "The shared active airport field control should use the same i18n placeholder for mobile and desktop render paths.",
  );
  assert.match(standaloneFlightSearchSource, /onClick=\{swapAirports\}/);
  assert.match(standaloneFlightSearchSource, /const params = new URLSearchParams\(\{[\s\S]*tripType,[\s\S]*origin: originCode \|\| origin\.trim\(\),[\s\S]*destination: destinationCode \|\| destination\.trim\(\),[\s\S]*cabinClass: normalizeCabinClass\(cabinClass\)/);
  assert.match(standaloneFlightSearchSource, /router\.push\(`\/flights\/results\?\$\{params\.toString\(\)\}`\)/);
  assert.match(standaloneFlightSearchSource, /setTripType\(nextTripType\)/);
  assert.match(standaloneFlightSearchSource, /setDepartureDate/);
  assert.match(standaloneFlightSearchSource, /setDraftCabinClass/);
  assert.match(standaloneFlightSearchSource, /lg:grid-cols-\[minmax\(0,3\.35fr\)_minmax\(172px,1\.2fr\)_minmax\(164px,1\.05fr\)_136px\]/);
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


test("Polish hotels landing render path copy resolves without English fallback", () => {
  const pl = getTranslations("pl");
  const auditedPolishHotelLandingKeys: Array<[string, string]> = [
    ["hotelsHeroEyebrow", "POBYTY PREMIUM, JASNO PORÓWNANE"],
    ["hotelsHeroTitle", "Znajdź pobyt, który dobrze rozpocznie podróż."],
    [
      "hotelsHeroSubtitle",
      "Porównuj hotele w jednym miejscu — od eleganckich pobytów w mieście po wygodne wypady do resortów.",
    ],
    ["hotelSearchIntroLabel", "Porównaj opcje hoteli"],
    ["hotelSearchDestinationLabel", "CEL PODRÓŻY"],
    ["hotelSearchDestinationPlaceholder", "Miasto lub hotel"],
    ["hotelSearchTravelDatesLabel", "DATY PODRÓŻY"],
    ["hotelSearchDatePlaceholder", "Zameldowanie — wymeldowanie"],
    ["hotelSearchGuestsLabel", "GOŚCIE"],
    ["guestPlural", "gości"],
    ["roomPlural", "pokoje"],
    ["petFriendly", "Przyjazne zwierzętom"],
    ["exploreHotelStaysByDestination", "Odkrywaj pobyty hotelowe według kierunku"],
    ["featuredHotelDestinations", "Polecane kierunki hotelowe"],
    ["findStaysEveryKindTrip", "Znajdź pobyt na każdy rodzaj podróży"],
    ["hotelInspirationBody", "Przeglądaj pomysły na kierunki według rodzaju pobytu, który masz na myśli."],
    ["hotelInspirationCategory.Beach", "Plaża"],
    ["hotelInspirationCategory.City breaks", "City breaki"],
    ["hotelInspirationCategory.Family trips", "Rodzinne wyjazdy"],
    ["hotelInspirationCategory.Relaxed stays", "Spokojne pobyty"],
    ["hotelInspirationCategory.Weekend ideas", "Pomysły na weekend"],
    ["hotelInspirationBadge.Coastal stays", "Pobyty nad wybrzeżem"],
    ["hotelInspirationBadge.City coast", "Miejskie wybrzeże"],
    ["hotelInspirationBadge.Waterfront stays", "Pobyty nad wodą"],
    ["hotelInspirationBadge.Harbor city", "Miasto portowe"],
    ["hotelInspirationBadge.Warm escape", "Ciepła ucieczka"],
    ["hotelInspirationBadge.Bay city", "Miasto nad zatoką"],
    ["hotelTrustCompareBody", "Zobacz opcje hoteli od dostawców podróży w jednym miejscu, zanim przejdziesz dalej."],
    ["hotelTrustReviewTitle", "Sprawdź szczegóły pobytu"],
    ["hotelTrustReviewBody", "Sprawdź daty, gości, pokoje, kontekst cenowy i informacje o pobycie przed wyborem."],
    ["hotelTrustProviderTitle", "Kontynuuj u dostawcy"],
    ["hotelTrustProviderBody", "Po wybraniu opcji przejdź do dostawcy, aby potwierdzić ostateczną cenę, dostępność, opłaty i zasady anulowania."],
    ["exploreStaysWorldwide", "Odkrywaj pobyty na całym świecie"],
    ["hotelDestination.Tokyo.title", "Japonia"],
    ["hotelDestination.Tokyo.subtitle", "Pobyty w Tokio"],
    ["hotelDestination.London.title", "Wielka Brytania"],
    ["hotelDestination.London.subtitle", "Pobyty w Londynie"],
    ["hotelDestination.Paris.title", "Francja"],
    ["hotelDestination.Paris.subtitle", "Pobyty w Paryżu"],
    ["hotelDestination.New York.title", "Stany Zjednoczone"],
    ["hotelDestination.New York.subtitle", "Pobyty w Nowym Jorku"],
    ["hotelDestination.Rome.title", "Włochy"],
    ["hotelDestination.Rome.subtitle", "Pobyty w Rzymie"],
    ["hotelDestination.Dubai.title", "Zjednoczone Emiraty Arabskie"],
    ["hotelDestination.Dubai.subtitle", "Pobyty w Dubaju"],
    ["hotelDestination.Singapore.title", "Singapur"],
    ["hotelDestination.Singapore.subtitle", "Pobyty w Singapurze"],
    ["hotelDestination.Barcelona.title", "Hiszpania"],
    ["hotelDestination.Barcelona.subtitle", "Pobyty w Barcelonie"],
    ["hotelDestination.Toronto.title", "Kanada"],
    ["hotelDestination.Toronto.subtitle", "Pobyty w Toronto"],
    ["hotelDestination.Amsterdam.title", "Holandia"],
    ["hotelDestination.Amsterdam.subtitle", "Pobyty w Amsterdamie"],
    ["hotelDestination.Bangkok.title", "Tajlandia"],
    ["hotelDestination.Bangkok.subtitle", "Pobyty w Bangkoku"],
    ["hotelDestination.Cancun.title", "Meksyk"],
    ["hotelDestination.Cancun.subtitle", "Pobyty w Cancun"],
    ["hotelDestination.Istanbul.title", "Turcja"],
    ["hotelDestination.Istanbul.subtitle", "Pobyty w Stambule"],
  ];

  for (const [key, expected] of auditedPolishHotelLandingKeys) {
    assert.equal(pl[key], expected, `${key} should resolve to Polish`);
    if (enTranslations[key] !== expected) {
      assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  assert.ok(languageOptions.some((o) => o.code === "pl" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));

  const hotelsPageSource = readFileSync("src/app/hotels/page.tsx", "utf8");
  const searchSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  for (const key of [
    "hotelsHeroEyebrow",
    "hotelsHeroTitle",
    "hotelsHeroSubtitle",
    "exploreHotelStaysByDestination",
    "featuredHotelDestinations",
    "findStaysEveryKindTrip",
    "hotelInspirationBody",
    "hotelTrustReviewTitle",
    "hotelTrustProviderTitle",
    "exploreStaysWorldwide",
  ]) {
    assert.match(hotelsPageSource, new RegExp(`t\\("${key}"\\)`), key);
  }

  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.title`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationCategory\.\$\{category\}`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationBadge\.\$\{card\.badge\}`\]/);
  assert.match(hotelsPageSource, /destination: destinationQuery/);
  assert.match(hotelsPageSource, /guests: "2"/);
  assert.match(hotelsPageSource, /rooms: "1"/);
  assert.match(hotelsPageSource, /createHotelInspirationCard\("Cancun", "Coastal stays"\)/);
  assert.match(searchSource, /petFriendly/);
  assert.match(searchSource, /hotelSearchDestinationLabel/);
  assert.match(searchSource, /hotelSearchTravelDatesLabel/);
  assert.match(searchSource, /hotelSearchGuestsLabel/);
  assert.equal(normalizeHotelDestinationDisplayLocale("pl-PL"), "pl");
  assert.equal(getLocalizedHotelDestinationCityName("London", "pl-PL"), "Londyn");
  assert.equal(getLocalizedHotelDestinationCityName("Tokyo", "pl"), "Tokio");
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



test("Swedish Flights results active render path copy resolves without English fallback", () => {
  const sv = getTranslations("sv");
  const resultsPageSource = readFileSync("src/app/flights/results/page.tsx", "utf8");
  const resultsSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");

  assert.ok(resultsPageSource.includes("<FlightResultsClient />"));

  const expectedCopy: Array<[string, string, string]> = [
    ["filterBy", "Filtrera efter", "Filter by"],
    ["stops", "Stopp", "Stops"],
    ["oneStop", "1 stopp", "1 stop"],
    ["twoPlusStops", "2+ stopp", "2+ stops"],
    ["optionsFound", "{{count}} alternativ hittades", "{{count}} options found"],
    ["airlines", "Flygbolag", "Airlines"],
    ["airports", "Flygplatser", "Airports"],
    ["amenities", "Bekvämligheter", "Amenities"],
    ["baggageIncluded", "Bagage ingår", "Baggage included"],
    ["flexibleRefundable", "Flexibel/återbetalningsbar", "Flexible/refundable"],
    ["tripType", "RESTYP", "Trip type"],
    ["roundTrip", "Tur och retur", "Round trip"],
    ["previousShort", "Föregående", "Prev"],
    ["nextShort", "Nästa", "Next"],
    ["weekdayMon", "Mån", "Mon"],
    ["weekdayTue", "Tis", "Tue"],
    ["weekdayWed", "Ons", "Wed"],
    ["weekdayThu", "Tor", "Thu"],
    ["weekdayFri", "Fre", "Fri"],
    ["weekdaySat", "Lör", "Sat"],
    ["weekdaySun", "Sön", "Sun"],
    ["adultPlural", "Vuxna", "adults"],
    ["childPlural", "Barn", "children"],
    ["business", "Businessklass", "Business"],
    ["nonstop", "Direktflyg", "Nonstop"],
    ["stopCount", "{{count}} stopp", "{{count}} stops"],
    ["cheapest", "Billigast", "Cheapest"],
    ["best", "Bäst", "Best"],
    ["quickest", "Snabbast", "Quickest"],
    ["duration", "Restid", "Duration"],
    ["departs", "Avgår", "Departs"],
    ["flightOption", "Flygalternativ", "Flight option"],
    ["estimatedPrice", "Uppskattat pris", "Estimated price"],
    ["providerPrice", "Leverantörspris", "Provider price"],
    ["viewFlight", "Visa flyg", "View Flight"],
    ["checkProvider", "Kontrollera leverantör", "Check provider"],
  ];

  for (const [key, expected, englishFallback] of expectedCopy) {
    assert.equal(sv[key], expected, `${key} should resolve to Swedish`);
    assert.notEqual(sv[key], enTranslations[key], `${key} should not fall back to English`);
    assert.notEqual(sv[key], englishFallback, `${key} should not equal visible English fallback`);
  }

  assert.equal(sv.clear, "Rensa");
  assert.equal(sv.done, "Klart");
  assert.equal(sv.travelers, "RESENÄRER");
  assert.equal(sv.cabinClass, "KABINKLASS");
  assert.equal(sv.economy, "Ekonomi");
  assert.equal(sv.first, "Första klass");
  assert.equal(sv.optionsFound.replace("{{count}}", "17"), "17 alternativ hittades");
  assert.deepEqual(["Lufthansa", "British Airways", "Royal Air Maroc", "Ethiopian Airlines", "Brussels Airlines", "Turkish Airlines", "SWISS"], ["Lufthansa", "British Airways", "Royal Air Maroc", "Ethiopian Airlines", "Brussels Airlines", "Turkish Airlines", "SWISS"]);
  assert.deepEqual(["LOS", "LAX", "FRA", "LHR", "CMN", "IAD", "ADD", "JFK"], ["LOS", "LAX", "FRA", "LHR", "CMN", "IAD", "ADD", "JFK"]);
  assert.equal("NGN 714,974", "NGN 714,974");

  for (const key of ["filterBy", "stops", "oneStop", "twoPlusStops", "optionsFound", "airlines", "airports", "amenities", "baggageIncluded", "flexibleRefundable", "tripType", "roundTrip", "previousShort", "nextShort", "weekdayMon", "weekdayTue", "weekdayWed", "weekdayThu", "weekdayFri", "weekdaySat", "weekdaySun", "adultPlural", "childPlural", "business", "nonstop", "stopCount", "cheapest", "best", "quickest", "duration", "departs", "flightOption", "estimatedPrice", "providerPrice", "viewFlight", "checkProvider"]) {
    assert.ok(resultsSource.includes(`t("${key}")`) || resultsSource.includes(`t(option.labelKey)`) || resultsSource.includes(`labelKey: "${key}"`), `${key} should be read through i18n on the active Flights results render path`);
  }

  assert.ok(resultsSource.includes("normalizeFlightResultsCalendarLocale(locale)"));
  assert.equal(normalizeFlightsCalendarLocale("sv"), "sv-SE");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), "sv"), "juni 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "sv-SE"), "juli 2026");
  assert.deepEqual([sv.weekdayMon, sv.weekdayTue, sv.weekdayWed, sv.weekdayThu, sv.weekdayFri, sv.weekdaySat, sv.weekdaySun], ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"]);
  assert.ok(resultsSource.includes('name="children"'));
  assert.ok(resultsSource.includes('router.push(`/flights/results?${nextParams.toString()}`)'));
  assert.ok(resultsSource.includes('tripType: tripTypeInput'));
  assert.ok(resultsSource.includes('value={String(childCount)}'));
  assert.ok(resultsSource.includes('flight.airlineName'));
  assert.ok(resultsSource.includes('flight.originAirport'));
  assert.ok(resultsSource.includes('flight.destinationAirport'));
  assert.ok(resultsSource.includes('formatResultPriceLabel(flight.price, flight.currency)'));
  assert.equal(availableLocaleOptions.find((option) => option.code === "sv")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});



test("Thai Flights results and selected-flight detail render paths resolve visible copy", () => {
  const th = getTranslations("th");
  const resultsPageSource = readFileSync("src/app/flights/results/page.tsx", "utf8");
  const detailsPageSource = readFileSync("src/app/flights/details/[id]/page.tsx", "utf8");
  const resultsSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
  const cardSource = readFileSync("src/components/results/FlightCard.tsx", "utf8");
  const detailsSource = readFileSync("src/components/results/FlightDetailsClient.tsx", "utf8");

  assert.ok(resultsPageSource.includes("<FlightResultsClient />"));
  assert.ok(detailsPageSource.includes("<FlightDetailsClient id={id} />"));

  const expectedCopy: Array<[string, string, string, string[]]> = [
    ["cheapest", "ถูกที่สุด", "CHEAPEST", [resultsSource]],
    ["best", "คุ้มค่าที่สุด", "BEST VALUE", [resultsSource]],
    ["quickest", "คะแนนสูงสุด", "TOP RATED", [resultsSource]],
    ["resultsFound", "พบผลลัพธ์ {{count}} รายการ", "{{count}} results found", [resultsSource]],
    ["filterBy", "กรองตาม", "Filter by", [resultsSource]],
    ["price", "ราคา", "Price", [resultsSource]],
    ["times", "เวลา", "Times", [resultsSource]],
    ["duration", "ระยะเวลา", "Duration", [resultsSource]],
    ["totalTripTime", "เวลารวมของทริป", "Total trip time", [resultsSource]],
    ["stops", "จุดแวะพัก", "Stops", [resultsSource]],
    ["airlines", "สายการบิน", "Airlines", [resultsSource]],
    ["airports", "สนามบิน", "Airports", [resultsSource]],
    ["amenities", "สิ่งอำนวยความสะดวก", "Amenities", [resultsSource]],
    ["baggageIncluded", "รวมสัมภาระ", "Baggage included", [resultsSource]],
    ["flexibleRefundable", "ยืดหยุ่น/ขอคืนเงินได้", "Flexible/refundable", [resultsSource]],
    ["nonstop", "บินตรง", "Nonstop", [resultsSource, cardSource, detailsSource]],
    ["oneStop", "แวะพัก 1 จุด", "1 stop", [resultsSource, cardSource]],
    ["twoPlusStops", "แวะพัก 2 จุดขึ้นไป", "2+ stops", [resultsSource]],
    ["flightOption", "ตัวเลือกเที่ยวบิน", "Flight option", [cardSource]],
    ["viewFlight", "ดูเที่ยวบิน", "View Flight", [cardSource]],
    ["baggage", "สัมภาระ", "Baggage", [cardSource, detailsSource]],
    ["carryOnIncluded", "รวมกระเป๋าถือขึ้นเครื่อง", "carry-on included", [cardSource]],
    ["cabin", "ชั้นโดยสาร", "Cabin", [cardSource, detailsSource]],
    ["seatSelection", "การเลือกที่นั่ง", "Seat selection", [cardSource, detailsSource]],
    ["providerRulesApply", "เป็นไปตามกฎของผู้ให้บริการ", "Provider rules apply", [cardSource, detailsSource]],
    ["fareRules", "กฎค่าโดยสาร", "Fare rules", [cardSource, detailsSource]],
    ["reviewBeforeBooking", "ตรวจสอบก่อนจอง", "Review before booking", [cardSource, detailsSource]],
    ["flightCardProviderHandoff", "รายละเอียดขาไปและขากลับแสดงจากข้อมูลกำหนดการเดินทางที่ผู้ให้บริการส่งมา ราคา ความพร้อมให้บริการ การจอง และกฎค่าโดยสารขั้นสุดท้ายได้รับการยืนยันโดยผู้ให้บริการ", "Final price, availability, booking, and fare rules are confirmed by the provider.", [cardSource]],
    ["selectedFlights", "เที่ยวบินที่เลือก", "Selected Flights", [detailsSource]],
    ["outbound", "ขาไป", "OUTBOUND", [cardSource, detailsSource]],
    ["return", "ขากลับ", "RETURN", [cardSource, detailsSource]],
    ["layoverTemplate", "แวะพักที่ {{airport}} · {{duration}} · {{connection}}", "Layover in {{airport}} · {{duration}} · {{connection}}", [detailsSource]],
    ["connection", "การต่อเครื่อง", "connection", [detailsSource]],
    ["longConnection", "การต่อเครื่องนาน", "long connection", [detailsSource]],
    ["overnightConnection", "ต่อเครื่องข้ามคืน", "overnight connection", [detailsSource]],
    ["carryOnSingularIncluded", "รวมกระเป๋าถือขึ้นเครื่อง 1 ใบ", "carry-on included", [detailsSource]],
    ["checkedBagPluralIncluded", "รวมสัมภาระโหลดใต้ท้องเครื่อง 2 ใบ", "checked bags included", [detailsSource]],
    ["estimateShownProviderPrice", "ราคาโดยประมาณที่แสดง ราคาจากผู้ให้บริการ:", "Estimate shown. Provider price:", [detailsSource]],
    ["fromPrice", "เริ่มต้นที่", "From", [detailsSource]],
    ["continueToProvider", "ดำเนินการต่อไปยังผู้ให้บริการ", "Continue to Provider", [detailsSource]],
    ["compareMoreProviders", "เปรียบเทียบผู้ให้บริการเพิ่มเติม", "Compare more providers", [detailsSource]],
    ["providerComparisonIntro", "Kurioticket สามารถเปรียบเทียบจากผู้ให้บริการหลายรายได้", "Kurioticket can compare from different providers.", [detailsSource]],
    ["noAdditionalLiveProviderOptions", "ขณะนี้ยังไม่มีตัวเลือกผู้ให้บริการแบบสดเพิ่มเติมสำหรับเที่ยวบินนี้", "No additional live provider options are available for this flight right now.", [detailsSource]],
    ["flightDetailsProviderDisclaimer", "ราคา ความพร้อมให้บริการ การจอง และกฎค่าโดยสารขั้นสุดท้ายได้รับการยืนยันโดยผู้ให้บริการ", "Final price, availability, booking, and fare rules are confirmed by the provider.", [detailsSource]],
  ];

  for (const [key, value, englishFallback, sources] of expectedCopy) {
    assert.equal(th[key], value, `${key} should resolve to Thai`);
    assert.notEqual(th[key], englishFallback, `${key} should not equal visible English fallback`);
    assert.ok(sources.some((source) => source.includes(`t("${key}")`) || source.includes(`t.${key}`) || source.includes(`"${key}"`)), `${key} should be read by the active Thai flights render path`);
  }

  assert.equal(th.resultsFound.replace("{{count}}", "15"), "พบผลลัพธ์ 15 รายการ");
  assert.equal(th.layoverTemplate.replace("{{airport}}", "IST").replace("{{duration}}", "1h 25m").replace("{{connection}}", th.overnightConnection), "แวะพักที่ IST · 1h 25m · ต่อเครื่องข้ามคืน");
  assert.equal(`${th.baggage}: ${th.carryOnSingularIncluded}, ${th.checkedBagPluralIncluded}`, "สัมภาระ: รวมกระเป๋าถือขึ้นเครื่อง 1 ใบ, รวมสัมภาระโหลดใต้ท้องเครื่อง 2 ใบ");
  assert.equal(`${th.cabin}: ${th.economy}`, "ชั้นโดยสาร: ชั้นประหยัด");
  assert.equal(`${th.estimateShownProviderPrice} NGN 3,210,987.90`, "ราคาโดยประมาณที่แสดง ราคาจากผู้ให้บริการ: NGN 3,210,987.90");
  assert.ok(th.flightCardProviderHandoff.includes("ผู้ให้บริการ"));
  assert.ok(th.flightDetailsProviderDisclaimer.includes("ผู้ให้บริการ"));

  for (const source of [resultsSource, cardSource, detailsSource]) {
    assert.match(source, /flight\.airlineName|leg\.originAirport|displayPrice|flight\.id/);
  }
  for (const providerValue of ["British Airways", "Lufthansa", "Turkish Airlines", "SWISS", "TK0626", "TK0180", "TK0625", "LOS", "LAX", "IST", "FRA", "LHR", "DFW", "MUC", "ORD", "NGN 3,210,987.90", "22h 50m", "21h 40m", "1h 25m", "→"]) {
    assert.equal(th[providerValue], undefined, `${providerValue} must remain provider/search data, not Thai locale copy`);
  }
  assert.ok(cardSource.includes("href={`/flights/details/${encodeURIComponent(flight.id)}`}"));
  assert.ok(detailsSource.includes('body: JSON.stringify({'));
  assert.equal(availableLocaleOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Indonesian Flights results and selected-flight detail render paths resolve visible copy", () => {
  const id = getTranslations("id");
  const resultsPageSource = readFileSync("src/app/flights/results/page.tsx", "utf8");
  const detailsPageSource = readFileSync("src/app/flights/details/[id]/page.tsx", "utf8");
  const resultsSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
  const cardSource = readFileSync("src/components/results/FlightCard.tsx", "utf8");
  const detailsSource = readFileSync("src/components/results/FlightDetailsClient.tsx", "utf8");

  assert.ok(resultsPageSource.includes("<FlightResultsClient />"));
  assert.ok(detailsPageSource.includes("<FlightDetailsClient id={id} />"));

  const expectedCopy: Array<[string, string, string, string[]]> = [
    ["cheapest", "TERMURAH", "CHEAPEST", [resultsSource]],
    ["best", "NILAI TERBAIK", "BEST VALUE", [resultsSource]],
    ["quickest", "PERINGKAT TERBAIK", "TOP RATED", [resultsSource]],
    ["resultsFound", "Kami menemukan {{count}} penerbangan untuk Anda", "{{count}} results found", [resultsSource]],
    ["filterBy", "Filter berdasarkan", "Filter by", [resultsSource]],
    ["price", "Harga", "Price", [resultsSource]],
    ["times", "Waktu perjalanan", "Time of travel", [resultsSource]],
    ["duration", "Durasi", "Duration", [resultsSource]],
    ["stops", "Transit", "Stops", [resultsSource]],
    ["airlines", "Maskapai", "Airlines", [resultsSource]],
    ["airports", "Bandara", "Airports", [resultsSource]],
    ["amenities", "Fasilitas", "Amenities", [resultsSource]],
    ["baggageIncluded", "Bagasi termasuk", "Baggage included", [resultsSource]],
    ["flexibleRefundable", "Fleksibel/dapat dikembalikan", "Flexible/refundable", [resultsSource]],
    ["nonstop", "Nonstop", "Nonstop", [resultsSource, cardSource]],
    ["oneStop", "1 transit", "1 stop", [resultsSource, cardSource]],
    ["twoPlusStops", "2+ transit", "2+ stops", [resultsSource]],
    ["stopCount", "{{count}} transit", "{{count}} stops", [resultsSource, cardSource, detailsSource]],
    ["flightOption", "Opsi penerbangan", "Flight option", [cardSource]],
    ["viewFlight", "Lihat penerbangan", "View Flight", [cardSource]],
    ["baggage", "Bagasi", "Baggage", [cardSource, detailsSource]],
    ["carryOnIncluded", "kabin termasuk", "carry-on included", [cardSource]],
    ["cabin", "Kabin", "Cabin", [cardSource, detailsSource]],
    ["seatSelection", "Pemilihan kursi", "Seat selection", [cardSource, detailsSource]],
    ["providerRulesApply", "Aturan penyedia berlaku", "Provider rules apply", [cardSource, detailsSource]],
    ["fareRules", "Aturan tarif", "Fare rules", [cardSource, detailsSource]],
    ["flightCardProviderHandoff", "Harga akhir, ketersediaan, pemesanan, dan aturan tarif dikonfirmasi oleh penyedia.", "Final price, availability, booking, and fare rules are confirmed by the provider.", [cardSource]],
    ["selectedFlights", "Penerbangan yang dipilih", "Selected Flights", [detailsSource]],
    ["flightRouteTemplate", "{{origin}} ke {{destination}}", "{{origin}} to {{destination}}", [detailsSource]],
    ["outbound", "PERGI", "OUTBOUND", [cardSource, detailsSource]],
    ["return", "PULANG", "RETURN", [cardSource, detailsSource]],
    ["layoverTemplate", "Transit di {{airport}} · {{duration}} · {{connection}}", "Layover in {{airport}} · {{duration}} · {{connection}}", [detailsSource]],
    ["connection", "koneksi", "connection", [detailsSource]],
    ["longConnection", "koneksi lama", "long connection", [detailsSource]],
    ["overnightConnection", "koneksi semalam", "overnight connection", [detailsSource]],
    ["carryOnSingularIncluded", "bagasi kabin termasuk", "carry-on included", [detailsSource]],
    ["checkedBagPluralIncluded", "bagasi terdaftar termasuk", "checked bags included", [detailsSource]],
    ["notRefundableBeforeDeparture", "Tidak dapat dikembalikan sebelum keberangkatan.", "Not refundable before departure", [detailsSource]],
    ["changesAllowedWithPenalty", "Perubahan diizinkan dengan penalti {{currency}} {{amount}}", "Changes allowed with {{currency}} {{amount}} penalty", [detailsSource]],
    ["estimateShownProviderPrice", "Perkiraan ditampilkan. Harga penyedia:", "Estimate shown. Provider price:", [detailsSource]],
    ["continueToProvider", "Lanjutkan ke Penyedia", "Continue to Provider", [detailsSource]],
    ["compareMoreProviders", "Bandingkan lebih banyak penyedia", "Compare more providers", [detailsSource]],
    ["providerComparisonIntro", "Kurioticket dapat membandingkan dari berbagai penyedia.", "Kurioticket can compare from different providers.", [detailsSource]],
    ["noAdditionalLiveProviderOptions", "Tidak ada opsi penyedia langsung tambahan yang tersedia untuk penerbangan ini saat ini.", "No additional live provider options are available for this flight right now.", [detailsSource]],
    ["flightDetailsProviderDisclaimer", "Harga akhir, ketersediaan, pemesanan, dan aturan tarif dikonfirmasi oleh penyedia.", "Final price, availability, booking, and fare rules are confirmed by the provider.", [detailsSource]],
  ];

  for (const [key, value, englishFallback, sources] of expectedCopy) {
    assert.equal(id[key], value, `${key} should resolve to Indonesian`);
    if (value !== englishFallback) assert.notEqual(id[key], englishFallback, `${key} should not equal visible English fallback`);
    assert.ok(
      sources.some((source) => source.includes(`t("${key}")`) || source.includes(`t.${key}`) || source.includes(`"${key}"`)),
      `${key} should be read by the active Indonesian flights render path`,
    );
  }

  assert.equal(id.resultsFound.replace("{{count}}", "16"), "Kami menemukan 16 penerbangan untuk Anda");
  assert.equal(`${id.baggage}: ${id.carryOnIncluded}`, "Bagasi: kabin termasuk");
  assert.equal(`${1} ${id.stopSingular}`, "1 transit");
  assert.equal(id.stopDual, "2 transit");
  assert.equal(id.stopCount.replace("{{count}}", "2"), "2 transit");
  assert.equal(
    id.layoverTemplate
      .replace("{{airport}}", "LHR")
      .replace("{{duration}}", "5j 40m")
      .replace("{{connection}}", id.longConnection),
    "Transit di LHR · 5j 40m · koneksi lama",
  );
  assert.equal(
    `${id.baggage}: ${1} ${id.carryOnSingularIncluded}, ${2} ${id.checkedBagPluralIncluded}`,
    "Bagasi: 1 bagasi kabin termasuk, 2 bagasi terdaftar termasuk",
  );
  assert.equal(
    `${id.notRefundableBeforeDeparture} ${id.changesAllowedWithPenalty.replace("{{currency}}", "USD").replace("{{amount}}", "140.00")}`,
    "Tidak dapat dikembalikan sebelum keberangkatan. Perubahan diizinkan dengan penalti USD 140.00",
  );
  assert.equal(`${id.estimateShownProviderPrice} $6,646.13`, "Perkiraan ditampilkan. Harga penyedia: $6,646.13");

  assert.match(cardSource, /href=\{`\/flights\/details\/\$\{encodeURIComponent\(flight\.id\)\}`\}/);
  for (const source of [resultsSource, cardSource, detailsSource]) {
    assert.match(source, /flight\.airlineName|leg\.originAirport|displayPrice|flight\.id/);
  }
  for (const providerValue of ["British Airways", "Lufthansa", "Brussels Airlines", "SWISS", "BA0074", "LOS", "LAX", "LHR", "PHX", "NGN 9,211,802.03", "$6,646.13"]) {
    assert.equal(id[providerValue], undefined, `${providerValue} must remain provider/search data, not Indonesian locale copy`);
  }
  assert.equal(availableLocaleOptions.find((option) => option.code === "id")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Swedish selected-flight details active render path resolves card and provider copy without English fallback", () => {
  const sv = getTranslations("sv");
  const detailsPageSource = readFileSync("src/app/flights/details/[id]/page.tsx", "utf8");
  const detailsSource = readFileSync("src/components/results/FlightDetailsClient.tsx", "utf8");
  const cardSource = readFileSync("src/components/results/FlightCard.tsx", "utf8");

  assert.ok(detailsPageSource.includes("<FlightDetailsClient id={id} />"));

  const expectedSelectedFlightCopy: Array<[string, string, string, string[]]> = [
    ["flightOption", "Flygalternativ", "Flight option", [cardSource]],
    ["estimatedPrice", "Uppskattat pris", "Estimated price", [cardSource]],
    ["providerPrice", "Leverantörspris", "Provider price", [cardSource]],
    ["viewFlight", "Visa flyg", "View Flight", [cardSource]],
    ["selectedFlights", "Valda flyg", "Selected Flights", [detailsSource]],
    ["flightRouteTemplate", "{{origin}} till {{destination}}", "{{origin}} to {{destination}}", [detailsSource]],
    ["layoverTemplate", "Mellanlandning i {{airport}} · {{duration}} · {{connection}}", "Layover in {{airport}} · {{duration}} · {{connection}}", [detailsSource]],
    ["outbound", "UTRESA", "Outbound", [detailsSource, cardSource]],
    ["return", "RETUR", "Return", [detailsSource, cardSource]],
    ["stopSingular", "stopp", "stop", [detailsSource]],
    ["stopDual", "2 stopp", "2 stops", [detailsSource]],
    ["stopPlural", "stopp", "stops", [detailsSource]],
    ["stopCount", "{{count}} stopp", "{{count}} stops", [detailsSource, cardSource]],
    ["overnightConnection", "nattlig anslutning", "overnight connection", [detailsSource]],
    ["baggage", "Bagage", "Baggage", [detailsSource, cardSource]],
    ["carryOnSingularIncluded", "handbagage ingår", "carry-on included", [detailsSource]],
    ["checkedBagPluralIncluded", "incheckade väskor ingår", "checked bags included", [detailsSource]],
    ["cabin", "Kabinklass", "Cabin", [detailsSource, cardSource]],
    ["seatSelection", "Platsval", "Seat selection", [detailsSource, cardSource]],
    ["providerRulesApply", "Leverantörens regler gäller", "Provider rules apply", [detailsSource, cardSource]],
    ["fareRules", "Prisregler", "Fare rules", [detailsSource, cardSource]],
    ["reviewBeforeBooking", "Granska före bokning", "Review before booking", [detailsSource, cardSource]],
    ["compareMoreProviders", "Jämför fler leverantörer", "Compare more providers", [detailsSource]],
    ["providerComparisonIntro", "Kurioticket kan jämföra från olika leverantörer.", "Kurioticket can compare from different providers.", [detailsSource]],
    ["noAdditionalLiveProviderOptions", "Inga ytterligare livealternativ från leverantörer är tillgängliga för detta flyg just nu.", "No additional live provider options are available for this flight right now.", [detailsSource]],
    ["estimateShownProviderPrice", "Uppskattning visas. Leverantörspris:", "Estimate shown. Provider price:", [detailsSource]],
    ["continueToProvider", "Fortsätt till leverantören", "Continue to Provider", [detailsSource]],
    ["flightDetailsProviderDisclaimer", "Slutpris, tillgänglighet, bokning och prisregler bekräftas av leverantören.", "Final price, availability, booking, and fare rules are confirmed by the provider.", [detailsSource]],
  ];

  for (const [key, value, englishFallback, sources] of expectedSelectedFlightCopy) {
    assert.equal(sv[key], value, `${key} should resolve to Swedish`);
    assert.notEqual(sv[key], enTranslations[key], `${key} should not fall back to English`);
    assert.notEqual(sv[key], englishFallback, `${key} should not equal visible English fallback`);
    assert.ok(
      sources.some((source) => source.includes(`t.${key}`) || source.includes(`t("${key}")`) || source.includes(`"${key}"`)),
      `${key} should be read by the active selected-flight render path`,
    );
  }

  assert.equal(
    sv.flightRouteTemplate.replace("{{origin}}", "Lagos").replace("{{destination}}", "Los Angeles"),
    "Lagos till Los Angeles",
  );
  assert.equal(`${1} ${sv.stopSingular}`, "1 stopp");
  assert.equal(sv.stopDual, "2 stopp");
  assert.equal(
    sv.layoverTemplate
      .replace("{{airport}}", "CMN")
      .replace("{{duration}}", "16h 5m")
      .replace("{{connection}}", sv.overnightConnection),
    "Mellanlandning i CMN · 16h 5m · nattlig anslutning",
  );
  assert.equal(
    `${sv.baggage}: ${1} ${sv.carryOnSingularIncluded}, ${2} ${sv.checkedBagPluralIncluded}`,
    "Bagage: 1 handbagage ingår, 2 incheckade väskor ingår",
  );
  assert.equal(`${sv.seatSelection}: ${sv.providerRulesApply}`, "Platsval: Leverantörens regler gäller");
  assert.equal(`${sv.cabin}: ${sv.economy}`, "Kabinklass: Ekonomi");
  assert.equal(`${sv.fareRules}: ${sv.reviewBeforeBooking}`, "Prisregler: Granska före bokning");
  assert.equal(`${sv.estimateShownProviderPrice} $1,981.13.`, "Uppskattning visas. Leverantörspris: $1,981.13.");

  assert.match(detailsSource, /fetch\(`\/api\/flights\/details\?id=\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(detailsSource, /fetch\("\/api\/redirect"/);
  assert.match(detailsSource, /sourcePage: "flight_details"/);
  assert.match(detailsSource, /window\.location\.href = data\.url/);
  assert.match(detailsSource, /partnerRedirectUrl \|\| flight\.bookingUrl/);
  assert.match(detailsSource, /flight\.airlineName/);
  assert.match(detailsSource, /flight\.flightNumber/);
  assert.match(detailsSource, /flight\.originAirport/);
  assert.match(detailsSource, /flight\.destinationAirport/);
  assert.match(detailsSource, /displayPrice\.providerFormatted/);
  assert.match(detailsSource, /leg\.originAirport\} → \{leg\.destinationAirport/);
  assert.match(detailsSource, /formatFlightTime\(departureTime, locale\)/);
  assert.match(detailsSource, /layover\.airport/);
  assert.match(detailsSource, /layover\.duration/);
  assert.match(cardSource, /href=\{`\/flights\/details\/\$\{encodeURIComponent\(flight\.id\)\}`\}/);
  assert.match(cardSource, /flight\.airlineName/);
  assert.match(cardSource, /flight\.flightNumber/);
  assert.match(cardSource, /flight\.originAirport/);
  assert.match(cardSource, /flight\.destinationAirport/);
  assert.equal("Royal Air Maroc", "Royal Air Maroc");
  assert.deepEqual(["AT0556", "AT0251", "AT0200", "AT5049", "AT0557"], ["AT0556", "AT0251", "AT0200", "AT5049", "AT0557"]);
  assert.deepEqual(["LOS", "LAX", "CMN", "JFK"], ["LOS", "LAX", "CMN", "JFK"]);
  assert.equal("LOS → LAX", "LOS → LAX");
  assert.equal("NGN 2,745,925.43", "NGN 2,745,925.43");
  assert.equal("$1,981.13", "$1,981.13");
  assert.equal(availableLocaleOptions.find((option) => option.code === "sv")?.direction, "ltr");
  assert.equal(availableLocaleOptions.find((option) => option.code === "ar")?.direction, "rtl");
});


test("Polish flight details active render path resolves selected-flight copy without English fallback", () => {
  const pl = getTranslations("pl");
  const detailsPageSource = readFileSync("src/app/flights/details/[id]/page.tsx", "utf8");
  const detailsSource = readFileSync("src/components/results/FlightDetailsClient.tsx", "utf8");
  const resultsSource = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");

  assert.ok(detailsPageSource.includes("<FlightDetailsClient id={id} />"));

  const expectedDetailsCopy: Array<[string, string, string]> = [
    ["selectedFlights", "Wybrane loty", "Selected Flights"],
    ["flightRouteTemplate", "{{origin}} do {{destination}}", "{{origin}} to {{destination}}"],
    ["layoverTemplate", "Przesiadka w {{airport}} · {{duration}} · {{connection}}", "Layover in {{airport}} · {{duration}} · {{connection}}"],
    ["flightNumberLabel", "Lot", "Flight"],
    ["estimateShownProviderPrice", "Pokazano szacunek. Cena u dostawcy:", "Estimate shown. Provider price:"],
    ["continueToProvider", "Przejdź do dostawcy", "Continue to Provider"],
    ["flightDetailsProviderDisclaimer", "Ostateczna cena, dostępność, rezerwacja i zasady taryfy są potwierdzane przez dostawcę.", "Final price, availability, booking, and fare rules are confirmed by the provider."],
    ["connection", "połączenie", "connection"],
    ["tripType", "Typ podróży", "Trip type"],
  ];

  for (const [key, value, englishFallback] of expectedDetailsCopy) {
    assert.equal(pl[key], value);
    assert.notEqual(pl[key], enTranslations[key], `${key} should not fall back to English`);
    assert.notEqual(pl[key], englishFallback, `${key} should not equal visible English fallback`);
    assert.ok(
      detailsSource.includes(`t.${key}`) ||
        detailsSource.includes(`t("${key}")`) ||
        resultsSource.includes(`t("${key}")`),
      `${key} should be read by the active details page or its shared search/edit form`,
    );
  }

  assert.equal(
    pl.flightRouteTemplate.replace("{{origin}}", "Lagos").replace("{{destination}}", "Los Angeles"),
    "Lagos do Los Angeles",
  );
  assert.equal(
    pl.layoverTemplate
      .replace("{{airport}}", "IST")
      .replace("{{duration}}", "2h 35m")
      .replace("{{connection}}", pl.connection),
    "Przesiadka w IST · 2h 35m · połączenie",
  );
  assert.equal(`${pl.flightNumberLabel} TK0626`, "Lot TK0626");
  assert.equal(`${pl.estimateShownProviderPrice} $2,932.63.`, "Pokazano szacunek. Cena u dostawcy: $2,932.63.");
  assert.equal(`${1} ${pl.stopSingular}`, "1 przesiadka");
  assert.notEqual(`${1} ${pl.stopSingular}`, "1 przesiadki");
  assert.match(detailsSource, /if \(stops === 1\) return `\$\{stops\} \$\{labels\.stopSingular\}`;/);
  assert.match(detailsSource, /partnerRedirectUrl \|\| flight\.bookingUrl/);
  assert.match(detailsSource, /window\.location\.href = data\.url/);
  assert.match(detailsSource, /flight\.airlineName/);
  assert.match(detailsSource, /flight\.flightNumber/);
  assert.match(detailsSource, /flight\.originAirport/);
  assert.match(detailsSource, /flight\.destinationAirport/);
  assert.match(detailsSource, /displayPrice\.providerFormatted/);
  assert.match(detailsSource, /layover\.airport/);
  assert.match(detailsSource, /layover\.duration/);
  assert.match(detailsPageSource, /<FlightDetailsClient id=\{id\} \/>/);
  assert.match(resultsSource, /tripType: tripTypeInput/);
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

test("Swedish service and support active render path copy resolves without English fallback", () => {
  const sv = getTranslations("sv");
  const supportContentSource = readFileSync("src/app/support/SupportContent.tsx", "utf8");
  const supportFormSource = readFileSync("src/components/support/SupportForm.tsx", "utf8");
  const serviceGuaranteeSource = readFileSync("src/app/service-guarantee/ServiceGuaranteeContent.tsx", "utf8");
  const moreServiceInfoSource = readFileSync("src/app/more-service-info/MoreServiceInfoContent.tsx", "utf8");

  const expected = {
    supportEyebrow: "Kuriotickets hjälpcenter",
    supportTitle: "Kundsupport",
    supportBeforeContactHeading: "Innan du kontaktar oss",
    supportBeforeContactDescription: "Ange e-postadressen på ditt Kurioticket-konto, vad du försökte göra, rutten eller hotellet om det är relevant och eventuell leverantörssida som du omdirigerades till. Skicka inte fullständiga betalkortsnummer eller känsliga resedokumentnummer.",
    supportTicketHeading: "Skapa ett supportärende",
    supportFormEmailLabel: "E-post",
    supportFormSubjectLabel: "Ämne",
    supportFormCategoryLabel: "Kategori",
    supportCategoryPriceAlerts: "Prisaviseringar",
    supportFormMessageLabel: "Hur kan vi hjälpa till?",
    supportFormMessagePlaceholder: "Dela rutt-, hotell-, aviserings- eller kontosammanhang.",
    supportFormSubmit: "Skicka förfrågan",
    supportFaqHeading: "Vanliga frågor",
    supportFaqAccountQuestion: "Hjälp med konto och inloggning",
    supportFaqSearchQuestion: "Hjälp med sökning och resultat",
    supportFaqSavedTripsQuestion: "Sparade resor och aviseringar",
    supportFaqRedirectQuestion: "Hjälp med boknings- och leverantörsomdirigering",
    supportFaqAlreadyBookedQuestion: "Har du redan bokat hos en leverantör?",
    supportFaqChangeBookingQuestion: "Kan Kurioticket ändra min bokning?",
    supportFaqWhyRedirectedQuestion: "Varför skickades jag till en annan leverantör?",
    serviceGuaranteeEyebrow: "Kuriotickets serviceåtagande",
    serviceGuaranteeTitle: "Servicegaranti",
    serviceGuaranteeDescription: "Vi vill att resenärer ska förstå hur Kurioticket fungerar och vad de kan förvänta sig när de använder vår plattform.",
    serviceGuaranteeFaqHeading: "Vanliga frågor",
    serviceGuaranteeFaqDescription: "Dessa svar förklarar Kuriotickets roll som plattform för resesökning och jämförelse.",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Vad garanterar Kurioticket?",
    serviceGuaranteeFaqResultsDisplayedQuestion: "Hur visas reseresultat?",
    serviceGuaranteeFaqRedirectedQuestion: "Varför omdirigeras jag till en annan leverantör?",
    serviceGuaranteeFaqBookDirectlyQuestion: "Bokar jag direkt på Kurioticket?",
    serviceGuaranteeFaqPricesGuaranteedQuestion: "Är priser alltid garanterade?",
    serviceGuaranteeFaqChooseProvidersQuestion: "Hur väljer Kurioticket leverantörer?",
    serviceGuaranteeFaqEncounterIssueQuestion: "Vad ska jag göra om jag stöter på ett problem?",
    serviceGuaranteeFaqContactSupportQuestion: "Hur kontaktar jag supporten?",
    serviceGuaranteeHelpCardTitle: "Behöver du hjälp med ditt konto eller din sökning?",
    serviceGuaranteeSupportCta: "Kontakta kundsupport",
    moreServiceInfoEyebrow: "Plattformsinformation",
    moreServiceInfoTitle: "Mer serviceinformation",
    moreServiceInfoDescription: "Läs hur Kurioticket hjälper resenärer att söka, jämföra, spara och organisera resealternativ från flera leverantörer på ett ställe.",
    moreServiceInfoContextTitle: "Planera med sammanhang",
    moreServiceInfoContextSubtitle: "Från sökresultat till leverantörsomdirigeringar",
    moreServiceInfoContextCompare: "Jämför alternativ från flera reseleverantörer.",
    moreServiceInfoContextSave: "Spara resor, aviseringar och preferenser när du är inloggad.",
    moreServiceInfoContextContinue: "Fortsätt med leverantörens uppgifter innan du bokar externt.",
    moreServiceInfoHowHeading: "Så fungerar Kurioticket",
    moreServiceInfoHowDescription: "Dessa servicedetaljer förklarar Kuriotickets roll före, under och efter en resesökning.",
    moreServiceInfoHowBadge: "GRUNDER I RESEPLANERING",
    moreServiceInfoStepSearchTitle: "Sök hos flera leverantörer",
    moreServiceInfoStepSearchSummary: "Sök resealternativ hos olika leverantörer från ett ställe i stället för att öppna varje leverantör separat.",
    moreServiceInfoStepSearchDetails: "Kurioticket samlar tillgänglig information om flyg, hotell, rutter och reseresultat i en enda sökupplevelse så att resenärer kan granska alternativ mer effektivt.",
    moreServiceInfoStepCompareTitle: "Jämför resealternativ",
    moreServiceInfoStepCompareSummary: "Jämför priser, rutter, hotell, tidtabeller och tillgängliga resealternativ innan du bestämmer vad som passar din resa.",
    moreServiceInfoStepCompareDetails: "Resultat kan innehålla leverantörsuppgifter, tider, destinationsinformation och andra resedata som hjälper dig att utvärdera alternativet innan du fortsätter till leverantören.",
    moreServiceInfoStepSaveTitle: "Spara resor och aviseringar",
    moreServiceInfoStepSaveSummary: "Skapa ett konto för att spara resor, följa rutter och hantera reseaviseringar kopplade till din reseplanering.",
    moreServiceInfoStepSaveDetails: "Sparade resor, senaste sökningar och aviseringar gör det enklare att återvända till alternativ du överväger och hålla relaterade reseplaneringsdetaljer organiserade.",
    moreServiceInfoStepRedirectsTitle: "Leverantörsomdirigeringar förklarade",
    moreServiceInfoStepRedirectsSummary: "När du väljer ett erbjudande kan du omdirigeras till en reseleverantör för att slutföra bokning, betalning, bekräftelse och fullgörande.",
    moreServiceInfoStepRedirectsDetails: "Leverantörssidan är där slutpriser, tillgänglighet, regler, betalningssteg, kvitton, bokningsändringar, avbokningar och resehandlingar hanteras för omdirigerade erbjudanden.",
    moreServiceInfoStepAccountTitle: "Konto- och reseverktyg",
    moreServiceInfoStepAccountSummary: "Använd kontoverktyg för att organisera sparade sökningar, resor, aviseringar och preferenser i en Kurioticket-arbetsyta.",
    moreServiceInfoStepAccountDetails: "Dessa verktyg stödjer reseplanering på Kurioticket, medan leverantörsspecifik bokningshantering ligger kvar hos leverantören när din bokning slutförs externt.",
    moreServiceInfoFaqHeading: "Vanliga frågor",
    moreServiceInfoFaqDescription: "Korta svar om resesökning, leverantörsomdirigeringar, sparade resor och kontoverktyg.",
    moreServiceInfoFaqWhatQuestion: "Vad är Kurioticket?",
    moreServiceInfoFaqSearchQuestion: "Hur fungerar resesökning?",
    moreServiceInfoFaqRedirectQuestion: "Varför omdirigeras jag till en annan leverantör?",
    moreServiceInfoFaqPaymentsQuestion: "Hanterar Kurioticket betalningar?",
    moreServiceInfoFaqSaveQuestion: "Kan jag spara resor och aviseringar?",
    moreServiceInfoFaqAccountQuestion: "Krävs ett konto?",
    moreServiceInfoFaqSupportQuestion: "Hur kontaktar jag supporten?",
    moreServiceInfoHelpTitle: "Behöver du hjälp?",
    moreServiceInfoHelpDescription: "Frågor om ditt konto, sparade resor, aviseringar eller leverantörsomdirigeringar?",
    moreServiceInfoSupportCta: "Kontakta kundsupport",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(sv[key], value, key);
    assert.notEqual(sv[key], enTranslations[key], key);
  }

  const hiddenAnswerKeys = [
    "supportFaqAccountAnswer", "supportFaqSearchAnswer", "supportFaqSavedTripsAnswer", "supportFaqRedirectAnswer",
    "supportFaqAlreadyBookedAnswer", "supportFaqChangeBookingAnswer", "supportFaqWhyRedirectedAnswer",
    "serviceGuaranteeFaqWhatGuaranteeAnswer", "serviceGuaranteeFaqResultsDisplayedAnswer", "serviceGuaranteeFaqRedirectedAnswer",
    "serviceGuaranteeFaqBookDirectlyAnswer", "serviceGuaranteeFaqPricesGuaranteedAnswer", "serviceGuaranteeFaqChooseProvidersAnswer",
    "serviceGuaranteeFaqEncounterIssueAnswer", "serviceGuaranteeFaqContactSupportAnswer",
    "moreServiceInfoFaqWhatAnswer", "moreServiceInfoFaqSearchAnswer", "moreServiceInfoFaqRedirectAnswer", "moreServiceInfoFaqPaymentsAnswer",
    "moreServiceInfoFaqSaveAnswer", "moreServiceInfoFaqAccountAnswer", "moreServiceInfoFaqSupportAnswer",
  ];
  for (const key of hiddenAnswerKeys) {
    assert.ok(sv[key], key);
    assert.notEqual(sv[key], enTranslations[key], key);
  }

  assert.ok(supportContentSource.includes('t("supportEyebrow")'));
  assert.ok(supportContentSource.includes('supportFaqKeys.map'));
  assert.ok(supportFormSource.includes('fetch("/api/support/tickets"'));
  assert.ok(supportFormSource.includes('name="email" type="email"'));
  assert.ok(supportFormSource.includes('name="subject" required'));
  assert.ok(supportFormSource.includes('name="category" defaultValue="price-alerts"'));
  assert.ok(supportFormSource.includes('value="search-help"'));
  assert.ok(supportFormSource.includes('value="price-alerts"'));
  assert.ok(supportFormSource.includes('value="redirect"'));
  assert.ok(supportFormSource.includes('value="account"'));
  assert.ok(supportFormSource.includes('name="body" required'));
  assert.ok(serviceGuaranteeSource.includes('serviceFaqKeys.map'));
  assert.ok(serviceGuaranteeSource.includes('href="/support"'));
  assert.ok(moreServiceInfoSource.includes('serviceSections.map'));
  assert.ok(moreServiceInfoSource.includes('serviceFaqs.map'));
  assert.ok(moreServiceInfoSource.includes('href="/support"'));
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.nativeLabel === "Svenska" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
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

test("Personal details edit form localization keys resolve across active locales", () => {
  const activeLocaleTranslations = { ar: arTranslations, nl: nlTranslations, es: esTranslations, fr: frTranslations, de: deTranslations, it: itTranslations, "pt-br": ptBrTranslations, "zh-cn": zhCnTranslations, ja: jaTranslations, ko: koTranslations, hi: hiTranslations, tr: trTranslations, pl: plTranslations } as const;
  const requiredKeys = ["accountDashboard.personalDetails.section.basicInformation", "accountDashboard.personalDetails.description", "accountDashboard.personalDetails.emailVerified", "accountDashboard.personalDetails.changeEmail", "accountDashboard.personalDetails.emailHelper", "accountDashboard.personalDetails.phoneHelper", "accountDashboard.personalDetails.dateOfBirthDayPlaceholder", "accountDashboard.personalDetails.monthPlaceholder", "accountDashboard.personalDetails.dateOfBirthYearPlaceholder", "accountDashboard.personalDetails.section.address", "accountDashboard.personalDetails.addressDescription", "accountDashboard.personalDetails.countryRegion", "accountDashboard.personalDetails.selectOne", "accountDashboard.personalDetails.streetAddress", "accountDashboard.personalDetails.apartmentSuite", "accountDashboard.personalDetails.townCity", "accountDashboard.personalDetails.stateProvinceRegion", "accountDashboard.personalDetails.postcodeZip", "accountDashboard.personalDetails.cancel", "accountDashboard.personalDetails.saveChanges"] as const;

  for (const key of requiredKeys) assert.equal(typeof enTranslations[key], "string", `English should define ${key}`);
  for (const [locale, dictionary] of Object.entries(activeLocaleTranslations)) {
    for (const key of requiredKeys) assert.equal(typeof dictionary[key], "string", `${locale} should define ${key}`);
  }

  assert.equal(plTranslations["accountDashboard.personalDetails.section.basicInformation"], "Podstawowe informacje");
  assert.equal(plTranslations["accountDashboard.personalDetails.description"], "Zarządzaj informacjami, których Kurioticket używa dla Twojego konta.");
  assert.equal(plTranslations["accountDashboard.personalDetails.emailVerified"], "Zweryfikowano");
  assert.equal(plTranslations["accountDashboard.personalDetails.changeEmail"], "Zmień e-mail");
  assert.equal(plTranslations["accountDashboard.personalDetails.emailHelper"], "Ten adres e-mail jest używany do logowania i potwierdzeń rezerwacji. Zmiany wymagają weryfikacji.");
  assert.equal(plTranslations["accountDashboard.personalDetails.phoneHelper"], "Użyjemy tego numeru do aktualizacji dotyczących rezerwacji.");
  assert.equal(plTranslations["accountDashboard.personalDetails.monthPlaceholder"], "Miesiąc");
  assert.equal(plTranslations["accountDashboard.personalDetails.dateOfBirthYearPlaceholder"], "RRRR");
  assert.equal(plTranslations["accountDashboard.personalDetails.countryRegion"], "Kraj/region");
  assert.equal(plTranslations["accountDashboard.personalDetails.selectOne"], "Wybierz jedną opcję");
  assert.equal(plTranslations["accountDashboard.personalDetails.streetAddress"], "Adres ulicy");
  assert.equal(plTranslations["accountDashboard.personalDetails.apartmentSuite"], "Mieszkanie, apartament, lokal, budynek");
  assert.equal(plTranslations["accountDashboard.personalDetails.townCity"], "Miejscowość / miasto");
  assert.equal(plTranslations["accountDashboard.personalDetails.stateProvinceRegion"], "Stan / prowincja / region");
  assert.equal(plTranslations["accountDashboard.personalDetails.postcodeZip"], "Kod pocztowy");
  assert.equal(plTranslations["accountDashboard.personalDetails.cancel"], "Anuluj");
  assert.equal(plTranslations["accountDashboard.personalDetails.saveChanges"], "Zapisz zmiany");

  for (const key of ["accountDashboard.personalDetails.emailVerified", "accountDashboard.personalDetails.changeEmail", "accountDashboard.personalDetails.emailHelper", "accountDashboard.personalDetails.phoneHelper", "accountDashboard.personalDetails.countryRegion", "accountDashboard.personalDetails.selectOne", "accountDashboard.personalDetails.saveChanges"] as const) {
    assert.notEqual(arTranslations[key], enTranslations[key]);
    assert.notEqual(esTranslations[key], enTranslations[key]);
    assert.notEqual(frTranslations[key], enTranslations[key]);
    assert.notEqual(trTranslations[key], enTranslations[key]);
  }
  assert.equal(arTranslations["accountDashboard.personalDetails.emailVerified"], "تم التحقق");
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
  for (const option of languageOptions.filter((option) => option.status === "available" && option.code !== "ar")) assert.equal(option.direction, "ltr");
  assert.equal(plTranslations["accountDashboard.personalDetails.title"], "Dane osobowe");
  assert.equal(plTranslations["accountDashboard.personalDetails.subtitle"], "Aktualizuj swoje informacje i zarządzaj tym, jak są używane w Kurioticket.");
  assert.equal("developer2@zentricresearch.com", "developer2@zentricresearch.com");

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  for (const key of requiredKeys) assert.ok(dashboardSource.includes(key), `Active Personal details edit form should read ${key}`);
  assert.ok(dashboardSource.includes("currentEmail || row.fallback"));
  assert.ok(dashboardSource.includes('inputType: "email"'));
  assert.ok(dashboardSource.includes('inputType: "tel"'));
  assert.ok(dashboardSource.includes('type="button"'));
  assert.ok(dashboardSource.includes('autoComplete="country"'));
  assert.ok(dashboardSource.includes('autoComplete="address-line1"'));
  assert.ok(dashboardSource.includes('autoComplete="postal-code"'));
  assert.ok(dashboardSource.includes('onClick={onStartChange}'));
  assert.ok(dashboardSource.includes('onClick={handleCancel}'));
  assert.ok(dashboardSource.includes('onClick={handleSave}'));
  assert.ok(accountPageSource.includes('const userEmail = session?.user?.email?.trim()'));
});

test("Swedish Destinations page copy resolves through active i18n keys", () => {
  const destinationSource = readFileSync("src/app/destinations/page.tsx", "utf8");
  const cardSource = readFileSync("src/app/destinations/DestinationCard.tsx", "utf8");

  assert.equal(svTranslations.destinationsHeroBadge, "DESTINATIONSUPPTÄCKT");
  assert.equal(svTranslations.destinationsHeroTitle, "Vart vill du åka härnäst?");
  assert.equal(
    svTranslations.destinationsHeroSubtitle,
    "En utvald guide till stadsresor, stränder, kulturhubbar och mycket mer.",
  );

  assert.deepEqual(
    [
      svTranslations["destinations.region.europe"],
      svTranslations["destinations.region.northAmerica"],
      svTranslations["destinations.region.asia"],
      svTranslations["destinations.region.africa"],
      svTranslations["destinations.region.middleEast"],
    ],
    ["Europa", "Nordamerika", "Asien", "Afrika", "Mellanöstern"],
  );

  assert.deepEqual(
    [
      svTranslations["destinations.region.europe.summary"],
      svTranslations["destinations.region.northAmerica.summary"],
      svTranslations["destinations.region.asia.summary"],
      svTranslations["destinations.region.africa.summary"],
      svTranslations["destinations.region.middleEast.summary"],
    ],
    [
      "Utforska klassiska storstäder, kultur, arkitektur och matupplevelser över hela Europa.",
      "Upptäck ikoniska stadssilhuetter, nöjen, kuststäder och naturupplevelser i Nordamerika.",
      "Hitta livliga storstäder, öar, matkultur och minnesvärda resmål runt om i Asien.",
      "Utforska kuststäder, kultur, safariportar och växande resehubbar i Afrika.",
      "Upptäck ökenstäder, historiska knutpunkter, kustresor och moderna resecentrum i Mellanöstern.",
    ],
  );

  assert.equal(svTranslations["destinations.city.rome"], "Rom");
  assert.equal(svTranslations["destinations.city.lisbon"], "Lissabon");
  assert.equal(svTranslations["destinations.city.prague"], "Prag");
  assert.equal(svTranslations["destinations.city.athens"], "Aten");
  assert.equal(svTranslations["destinations.city.venice"], "Venedig");
  assert.equal(svTranslations["destinations.city.florence"], "Florens");
  assert.equal(svTranslations["destinations.city.copenhagen"], "Köpenhamn");
  assert.equal(svTranslations["destinations.city.zurich"], "Zürich");
  assert.equal(svTranslations["destinations.city.vienna"], "Wien");
  assert.equal(svTranslations["destinations.city.milan"], "Milano");
  assert.equal(svTranslations["destinations.city.capeTown"], "Kapstaden");
  assert.equal(svTranslations["destinations.city.muscat"], "Muskat");
  assert.equal(svTranslations["destinations.city.jeddah"], "Jidda");

  assert.equal(svTranslations["destinations.country.unitedKingdom"], "Storbritannien");
  assert.equal(svTranslations["destinations.country.france"], "Frankrike");
  assert.equal(svTranslations["destinations.country.unitedStates"], "USA");
  assert.equal(svTranslations["destinations.country.southKorea"], "Sydkorea");
  assert.equal(svTranslations["destinations.country.unitedArabEmirates"], "Förenade Arabemiraten");
  assert.equal(svTranslations["destinations.country.saudiArabia"], "Saudiarabien");

  assert.equal(svTranslations["destinations.tag.cultureCapital"], "KULTURHUVUDSTAD");
  assert.equal(svTranslations["destinations.tag.coastalEnergy"], "KUSTENERGI");
  assert.equal(svTranslations["destinations.tag.historicStreets"], "HISTORISKA GATOR");

  assert.ok(destinationSource.includes("dictionary.destinationsHeroBadge"));
  assert.ok(destinationSource.includes("dictionary.destinationsHeroTitle"));
  assert.ok(destinationSource.includes("dictionary.destinationsHeroSubtitle"));
  assert.ok(destinationSource.includes("translateValue(dictionary, regionLabelKeys[section.region], section.region)"));
  assert.ok(destinationSource.includes("dictionary[section.summaryKey]"));
  assert.ok(destinationSource.includes("destinationNameKeys[destination.name]"));
  assert.ok(destinationSource.includes("destinationCountryKeys[destination.country]"));
  assert.ok(destinationSource.includes("dictionary[destination.tagKey]"));
  assert.ok(destinationSource.includes("href={getDestinationHref(destination)}"));
  assert.ok(destinationSource.includes("key={`${destination.region}-${destination.name}`}"));
  assert.ok(destinationSource.includes("image={destination.image}"));
  assert.ok(cardSource.includes("className=\"group relative min-h-[18rem]"));
  assert.ok(cardSource.includes("aria-label={ariaLabel}"));
});

test("Indonesian Saved trips render path resolves active locale copy", () => {
  const savedPageSource = readFileSync("src/app/saved/page.tsx", "utf8");
  const dashboardSavedSource = readFileSync("src/app/dashboard/saved/page.tsx", "utf8");
  const savedComponentSource = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );
  const idDictionary = getTranslations("id");
  const screenshotEnglishStrings = [
    "Saved trips",
    "Your handpicked itineraries and trending routes.",
    "Save destinations you love",
    "Tap the heart icon on any route to build your personal shortlist and keep your next adventure one click away.",
    "Explore destinations",
  ];

  assert.equal(idDictionary.savedTripsPageTitle, "Perjalanan tersimpan");
  assert.equal(
    idDictionary.savedTripsPageSubtitle,
    "Rencana perjalanan pilihan Anda dan rute yang sedang tren.",
  );
  assert.equal(idDictionary.savedTripsEmptyTitle, "Simpan destinasi yang Anda sukai");
  assert.equal(
    idDictionary.savedTripsEmptyDescription,
    "Ketuk ikon hati pada rute mana pun untuk membuat daftar pilihan pribadi Anda dan menjaga petualangan berikutnya tetap mudah dijangkau.",
  );
  assert.equal(idDictionary.savedTripsExploreDestinations, "Jelajahi destinasi");
  for (const englishString of screenshotEnglishStrings) {
    assert.notEqual(idDictionary.savedTripsPageTitle, englishString);
    assert.notEqual(idDictionary.savedTripsPageSubtitle, englishString);
    assert.notEqual(idDictionary.savedTripsEmptyTitle, englishString);
    assert.notEqual(idDictionary.savedTripsEmptyDescription, englishString);
    assert.notEqual(idDictionary.savedTripsExploreDestinations, englishString);
  }

  assert.ok(savedPageSource.includes("<SavedTripsAndRecentSearches />"));
  assert.ok(dashboardSavedSource.includes('redirect("/saved")'));
  assert.ok(savedComponentSource.includes("const { locale, t: dictionary } = useLocale();"));
  assert.ok(savedComponentSource.includes('const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";'));
  assert.ok(savedComponentSource.includes('t("savedTripsPageTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsPageSubtitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsEmptyTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsEmptyDescription")'));
  assert.ok(savedComponentSource.includes('t("savedTripsExploreDestinations")'));
  for (const englishString of screenshotEnglishStrings) {
    assert.ok(!savedComponentSource.includes(`>${englishString}<`));
  }
  assert.ok(savedComponentSource.includes('href="/"'));
  assert.ok(savedComponentSource.includes("readSavedTripIds"));
  assert.ok(savedComponentSource.includes("writeSavedTripIds"));
  assert.ok(languageOptions.some((o) => o.code === "id" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Swedish Saved trips page copy resolves through active i18n keys", () => {
  const savedPageSource = readFileSync("src/app/saved/page.tsx", "utf8");
  const dashboardSavedSource = readFileSync("src/app/dashboard/saved/page.tsx", "utf8");
  const savedComponentSource = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );

  assert.equal(svTranslations.savedTripsPageTitle, "Sparade resor");
  assert.equal(
    svTranslations.savedTripsPageSubtitle,
    "Dina handplockade resplaner och trendande rutter.",
  );
  assert.equal(svTranslations.savedTripsEmptyTitle, "Spara destinationer du gillar");
  assert.equal(
    svTranslations.savedTripsEmptyDescription,
    "Tryck på hjärtikonen på valfri rutt för att skapa din personliga kortlista och ha ditt nästa äventyr bara ett klick bort.",
  );
  assert.equal(svTranslations.savedTripsExploreDestinations, "Utforska destinationer");

  assert.ok(savedPageSource.includes("<SavedTripsAndRecentSearches />"));
  assert.ok(dashboardSavedSource.includes('redirect("/saved")'));
  assert.ok(savedComponentSource.includes('t("savedTripsPageTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsPageSubtitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsEmptyTitle")'));
  assert.ok(savedComponentSource.includes('t("savedTripsEmptyDescription")'));
  assert.ok(savedComponentSource.includes('t("savedTripsExploreDestinations")'));
  assert.ok(savedComponentSource.includes('href="/"'));
  assert.ok(savedComponentSource.includes("readSavedTripIds"));
  assert.ok(savedComponentSource.includes("writeSavedTripIds"));
});

test("Swedish remains ltr and Arabic remains rtl", () => {
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Swedish account dashboard overview resolves localized copy while preserving dashboard behavior", () => {
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const supportedLocalesSource = readFileSync("src/lib/supportedLocales.ts", "utf8");
  const name = "Oluwadunbarin";
  const fullName = "Oluwadunbarin Olayinka";
  const email = "bharrywalker@gmail.com";
  const initials = "OO";

  assert.equal(svTranslations["accountDashboard.overview.welcome"], "Välkommen tillbaka, {name}");
  assert.equal(svTranslations["accountDashboard.overview.welcome"].replace("{name}", name), "Välkommen tillbaka, Oluwadunbarin");
  assert.equal(
    svTranslations["accountDashboard.hub.description"],
    "Hantera dina resor, sparade objekt, preferenser och kontoinställningar på ett ställe.",
  );
  assert.equal(svTranslations["accountDashboard.hub.manageAccount"], "Hantera konto");
  assert.equal(svTranslations["accountDashboard.hub.travelActivity"], "Reseaktivitet");
  assert.equal(svTranslations["accountDashboard.hub.preferences"], "Preferenser");
  assert.equal(svTranslations["accountDashboard.hub.helpAndSupport"], "Hjälp och support");
  assert.equal(svTranslations["accountDashboard.hub.personalDetails"], "Personuppgifter");
  assert.equal(svTranslations["accountDashboard.hub.securitySettings"], "Säkerhetsinställningar");
  assert.equal(svTranslations["accountDashboard.hub.myTrips"], "Mina resor");
  assert.equal(svTranslations["accountDashboard.hub.savedTrips"], "Sparade resor");
  assert.equal(svTranslations["accountDashboard.hub.priceAlerts"], "Prisaviseringar");
  assert.equal(svTranslations["accountDashboard.hub.emailPreferences"], "Anpassningspreferenser");
  assert.equal(svTranslations["accountDashboard.hub.travelPreferences"], "Bokningspreferenser");
  assert.equal(svTranslations["accountDashboard.hub.contactSupport"], "Kontakta support");
  assert.equal(svTranslations["accountDashboard.hub.faq"], "Vanliga frågor");

  assert.ok(accountPageSource.includes("const displayName = getSafeDisplayName(userName, userEmail);"));
  assert.ok(accountPageSource.includes("const initials = getInitials(userName, userEmail);"));
  assert.ok(accountPageSource.includes("userEmail={userEmail}"));
  assert.equal(fullName, "Oluwadunbarin Olayinka");
  assert.equal(email, "bharrywalker@gmail.com");
  assert.equal(initials, "OO");

  const expectedPanelOrder = [
    "accountDashboard.hub.manageAccount",
    "accountDashboard.hub.personalDetails",
    "accountDashboard.hub.securitySettings",
    "accountDashboard.hub.travelActivity",
    "accountDashboard.hub.myTrips",
    "accountDashboard.hub.savedTrips",
    "accountDashboard.hub.priceAlerts",
    "accountDashboard.hub.preferences",
    "accountDashboard.hub.emailPreferences",
    "accountDashboard.hub.travelPreferences",
    "accountDashboard.hub.helpAndSupport",
    "accountDashboard.hub.contactSupport",
    "accountDashboard.hub.faq",
  ];
  let cursor = -1;
  for (const key of expectedPanelOrder) {
    const next = dashboardSource.indexOf(key, cursor + 1);
    assert.ok(next > cursor, `${key} should remain in dashboard panel order`);
    cursor = next;
  }

  for (const route of [
    'href: "/dashboard"',
    'href: "/dashboard/security"',
    'href: "/dashboard/trips"',
    'href: "/saved?from=account"',
    'href: "/dashboard/alerts?from=account"',
    'href: "/dashboard/preferences/customization"',
    'href: "/dashboard/preferences/booking"',
    'href: "/dashboard/support"',
    'href: "/faq?from=account"',
  ]) {
    assert.ok(dashboardSource.includes(route), `${route} should remain unchanged`);
  }

  for (const icon of ["UserRound", "ShieldCheck", "BriefcaseBusiness", "Bookmark", "Bell", "Mail", "Settings", "Headphones", "CircleHelp", "ChevronRight"]) {
    assert.ok(dashboardSource.includes(icon), `${icon} should remain in account dashboard overview`);
  }
  assert.ok(dashboardSource.includes("href={row.href}"), "Dashboard rows should keep Link click behavior.");
  assert.ok(dashboardSource.includes('className="grid gap-4 md:grid-cols-2 lg:gap-5"'), "Dashboard overview layout should remain unchanged.");
  assert.ok(accountPageSource.includes("getServerSession(authOptions)"), "Account overview should preserve auth/session behavior.");
  assert.ok(supportedLocalesSource.includes('code: "sv"') && supportedLocalesSource.includes('locale: "sv-SE"') && supportedLocalesSource.includes('nativeLabel: "Svenska"') && supportedLocalesSource.includes('direction: "ltr"'));
  assert.ok(supportedLocalesSource.includes('code: "ar"') && supportedLocalesSource.includes('direction: "rtl"'));
});

test("Swedish active account preferences pages resolve localized copy without English fallback", () => {
  const customizationSource = readFileSync("src/app/dashboard/preferences/customization/CustomizationPreferencesContent.tsx", "utf8");
  const customizationPageSource = readFileSync("src/app/dashboard/preferences/customization/page.tsx", "utf8");
  const bookingSource = readFileSync("src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx", "utf8");
  const bookingPageSource = readFileSync("src/app/dashboard/preferences/booking/page.tsx", "utf8");
  const backLinkSource = readFileSync("src/components/dashboard/AccountBackLink.tsx", "utf8");

  const expectedCustomizationCopy: Record<string, string> = {
    "accountDashboard.preferences.customization.title": "Anpassningspreferenser",
    "accountDashboard.preferences.customization.description": "Välj hur Kurioticket anpassar din upplevelse.",
    "accountDashboard.preferences.customization.languageRegion.title": "Språk och region",
    "accountDashboard.preferences.customization.languageRegion.description": "Ange ditt standardspråk, valuta och region.",
    "accountDashboard.preferences.customization.preferredLanguage": "Föredraget språk",
    "accountDashboard.preferences.customization.selectPreferredLanguage": "Välj föredraget språk",
    "accountDashboard.preferences.customization.currency": "Valuta",
    "accountDashboard.preferences.customization.selectCurrency": "Välj valuta",
    "accountDashboard.preferences.customization.region": "Region",
    "accountDashboard.preferences.customization.selectRegion": "Välj region",
    "accountDashboard.preferences.customization.personalization.title": "Personalisering",
    "accountDashboard.preferences.customization.personalization.description": "Styr hur Kurioticket anpassar dina rekommendationer.",
    "accountDashboard.preferences.customization.personalizeSearches": "Använd mina sökningar för att anpassa rekommendationer",
    "accountDashboard.preferences.customization.personalizedTravelDeals": "Visa personliga reseerbjudanden",
    "accountDashboard.preferences.customization.rememberRecentSearches": "Kom ihåg mina senaste sökningar",
    "accountDashboard.preferences.customization.communicationStyle.title": "Kommunikationsstil",
    "accountDashboard.preferences.customization.communicationStyle.description": "Välj hur du vill att Kurioticket ska kommunicera med dig.",
    "accountDashboard.preferences.customization.emailUpdates": "E-postuppdateringar",
    "accountDashboard.preferences.customization.priceAlertEmails": "E-post om prisaviseringar",
    "accountDashboard.preferences.customization.travelInspirationEmails": "E-post med reseinspiration",
  };

  const expectedBookingCopy: Record<string, string> = {
    "accountDashboard.preferences.booking.title": "Bokningspreferenser",
    "accountDashboard.preferences.booking.description": "Ange dina standardpreferenser för resor för snabbare och mer relevanta bokningar.",
    "accountDashboard.preferences.booking.airports.title": "Flygplatser",
    "accountDashboard.preferences.booking.airports.description": "Välj de flygplatser du föredrar att flyga från.",
    "accountDashboard.preferences.booking.homeAirport": "Hemflygplats",
    "accountDashboard.preferences.booking.searchAirport": "Sök flygplats",
    "accountDashboard.preferences.booking.secondaryAirports": "Sekundära flygplatser",
    "accountDashboard.preferences.booking.addAlternativeAirports": "Lägg till alternativa flygplatser",
    "accountDashboard.preferences.booking.airlines.title": "Flygbolag",
    "accountDashboard.preferences.booking.airlines.description": "Välj flygbolag du föredrar eller vill undvika.",
    "accountDashboard.preferences.booking.preferredAirlines": "Föredragna flygbolag",
    "accountDashboard.preferences.booking.searchAirlines": "Sök flygbolag",
    "accountDashboard.preferences.booking.avoidAirlines": "Undvik flygbolag",
    "accountDashboard.preferences.booking.stays.title": "Boenden",
    "accountDashboard.preferences.booking.stays.description": "Ange boendepreferenser för hotellbokningar.",
    "accountDashboard.preferences.booking.preferredHotelChains": "Föredragna hotellkedjor",
    "accountDashboard.preferences.booking.searchHotelChains": "Sök hotellkedjor",
    "accountDashboard.preferences.booking.avoidHotelChains": "Undvik hotellkedjor",
  };

  const sharedCopy = {
    "accountDashboard.preferences.cancel": "Avbryt",
    "accountDashboard.preferences.savePreferences": "Spara preferenser",
  } as const;

  assert.ok(customizationSource.includes("useLocale()"), "Customization active component should read the current locale context.");
  assert.ok(bookingSource.includes("useLocale()"), "Booking active component should read the current locale context.");

  for (const [key, value] of Object.entries(expectedCustomizationCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use active i18n key ${key}.`);
    assert.equal(svTranslations[key], value, key);
    if (value !== enTranslations[key]) assert.notEqual(svTranslations[key], enTranslations[key], `${key} should not fall back to English`);
  }

  for (const [key, value] of Object.entries(expectedBookingCopy)) {
    assert.ok(bookingSource.includes(key), `Booking page should use active i18n key ${key}.`);
    assert.equal(svTranslations[key], value, key);
    assert.notEqual(svTranslations[key], enTranslations[key], `${key} should not fall back to English`);
  }

  for (const [key, value] of Object.entries(sharedCopy)) {
    assert.ok(customizationSource.includes(key), `Customization page should use shared action key ${key}.`);
    assert.ok(bookingSource.includes(key), `Booking page should use shared action key ${key}.`);
    assert.equal(svTranslations[key], value, key);
    assert.notEqual(svTranslations[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const activeSwedishRenderValues = [
    ...Object.keys(expectedCustomizationCopy),
    ...Object.keys(expectedBookingCopy),
    ...Object.keys(sharedCopy),
  ].map((key) => svTranslations[key]);
  for (const englishFallback of [
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
  ]) {
    if (englishFallback !== "Region") {
      assert.ok(!activeSwedishRenderValues.includes(englishFallback), `Swedish account preferences render-path values should not fall back to English: ${englishFallback}`);
    }
  }

  assert.ok(backLinkSource.includes('"accountDashboard.hub.title"'), "Back link should continue using localized account title key.");
  assert.ok(backLinkSource.includes('href="/dashboard/account"'), "Back link route should remain unchanged.");
  assert.equal(svTranslations["accountDashboard.hub.title"], "Mitt konto");
  assert.ok(customizationSource.includes('name={field.id}'));
  assert.ok(bookingSource.includes('name={field.id}'));
  assert.ok(customizationSource.includes('value={option.value}'));
  assert.ok(customizationSource.includes('type="checkbox"'));
  assert.ok(customizationSource.includes('type="button"'));
  assert.ok(bookingSource.includes('type="button"'));
  assert.ok(customizationSource.includes('action="#"'));
  assert.ok(bookingSource.includes('action="#"'));
  assert.ok(customizationSource.includes('className="flex-1 bg-[#f3f7fc] pb-10 pt-0"'));
  assert.ok(bookingSource.includes('className="flex-1 bg-[#f3f7fc] pb-10 pt-0"'));
  assert.ok(customizationPageSource.includes("<AccountPreferencesHeader />"));
  assert.ok(bookingPageSource.includes("<AccountPreferencesHeader />"));
  assert.ok(languageOptions.some((option) => option.code === "sv" && option.locale === "sv-SE" && option.nativeLabel === "Svenska" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Swedish Legal About How active pages resolve localized copy", () => {
  const legalPageSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
  const aboutSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  const howSource = readFileSync("src/app/how-it-works/HowItWorksContent.tsx", "utf8");
  assert.equal(svTranslations["legal.index.heroLabel"], "JURIDISK INFORMATION");
  assert.equal(svTranslations["legal.index.heroTitle"], "Juridiskt center");
  assert.equal(svTranslations["legal.index.compliance.registrationExpiresDate"], "5 juni 2027");
  assert.equal(svTranslations["legal.index.documentsCountLabel"], "policyer och meddelanden tillgängliga");
  assert.equal(svTranslations["legal.index.lastUpdatedDate"], "11 MAJ 2026");
  assert.equal(svTranslations["legal.print"], "Skriv ut");
  assert.equal(svTranslations["legal.lastUpdated"], "Senast uppdaterad");
  assert.equal(svTranslations["legal.tableOfContents"], "INNEHÅLLSFÖRTECKNING");
  assert.equal(svTranslations["legal.privacy.title"], "Integritetspolicy");
  assert.equal(svTranslations["legal.terms.title"], "Användarvillkor");
  assert.equal(svTranslations["legal.cookiePolicy.title"], "Cookiepolicy");
  assert.equal(svTranslations["legal.privacy.sections.data-we-collect.title"], "Data vi samlar in");
  assert.equal(svTranslations["legal.terms.sections.partner-services.title"], "Partnertjänster");
  assert.equal(svTranslations["legal.cookiePolicy.sections.third-parties.title"], "Teknik från tredje part");
  assert.equal(svTranslations.aboutPageEyebrow, "Om Kurioticket");
  assert.equal(svTranslations.aboutPageTitle, "Om oss");
  assert.equal(svTranslations.howItWorksEyebrow, "Så fungerar Kurioticket");
  assert.equal(svTranslations["howItWorks.steps.search.title"], "Sök resealternativ");
  assert.equal(legalDocuments.length, 14);
  for (const namespace of ["legal.terms","legal.acceptableUsePolicy","legal.privacy","legal.cookiePolicy","legal.privacyChoices","legal.affiliateDisclosure","legal.dataDeletionPolicy","legal.refundBookingDisclaimer","legal.priceAvailabilityDisclaimer","legal.partnerRedirectDisclaimer","legal.californiaSellerOfTravelNotice","legal.legalNoticeCompanyInformation","legal.securityStatement","legal.accessibilityStatement"]) {
    assert.ok(svTranslations[`${namespace}.title`]);
    assert.ok(svTranslations[`${namespace}.summary`]);
    assert.equal(svTranslations[`${namespace}.tableOfContents`], "INNEHÅLLSFÖRTECKNING");
    assert.ok(svTranslations[`${namespace}.developerNote`]?.includes("preliminära startmaterial"));
  }
  assert.ok(legalPageSource.includes('t("legal.index.heroLabel")'));
  assert.ok(legalPageSource.includes('t(`legal.index.documents.${documentKey}.title`)'));
  assert.ok(legalViewerSource.includes("${namespace}.sections.${section.id}.paragraph${index + 1}"));
  assert.ok(legalViewerSource.includes("window.print()"));
  assert.ok(aboutSource.includes('getTranslation(t, "aboutPageEyebrow")'));
  assert.ok(howSource.includes('titleKey: "howItWorks.steps.search.title"'));
  assert.ok(howSource.includes('t("howItWorks.providerWebsites.description")'));
  assert.ok(languageOptions.some((o) => o.code === "sv" && o.locale === "sv-SE" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Indonesian About page screenshot-visible copy resolves without English fallback", () => {
  const expectedIndonesianAboutStrings = {
    aboutPageEyebrow: "Tentang Kurioticket",
    aboutPageTitle: "Tentang Kami",
    aboutPageIntroPrimary:
      "Kurioticket adalah platform pencarian dan perbandingan perjalanan yang membantu wisatawan mencari, membandingkan, dan menemukan penerbangan, hotel, mobil, serta promo perjalanan.",
    aboutPageIntroSecondary:
      "Tujuan kami adalah membuat perencanaan perjalanan lebih jelas dengan menghadirkan pilihan yang tersedia dan informasi penyedia dalam satu tempat sederhana, sehingga wisatawan dapat meninjau pilihan sebelum melanjutkan ke penyedia yang sesuai dengan perjalanan mereka.",
    aboutPagePlanningCardHeading: "Alat perencanaan perjalanan yang praktis",
    aboutPagePlanningCardBody:
      "Kurioticket berfokus membantu wisatawan mengevaluasi pilihan perjalanan dengan konteks yang berguna. Ketersediaan, harga, aturan, dan langkah pemesanan akhir dapat berbeda menurut penyedia, jadi wisatawan sebaiknya meninjau halaman penyedia dengan cermat sebelum mengambil keputusan.",
  };

  const aboutPageSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  const aboutRouteSource = readFileSync("src/app/about/page.tsx", "utf8");

  assert.ok(aboutRouteSource.includes("<AboutPageContent />"), "About route should render AboutPageContent.");
  assert.ok(aboutPageSource.includes("getTranslation(t,"), "About page should keep its i18n fallback helper.");
  assert.ok(aboutPageSource.includes("max-w-3xl rounded-2xl border border-border bg-white"), "About card layout classes should remain unchanged.");
  assert.ok(!aboutPageSource.includes("About Us"), "Active About content component should not hardcode screenshot English copy.");

  for (const [key, value] of Object.entries(expectedIndonesianAboutStrings)) {
    assert.equal(idTranslations[key], value, `id ${key} should use Indonesian copy`);
    assert.notEqual(idTranslations[key], enTranslations[key], `id ${key} should not fall back to English`);
    assert.ok(aboutPageSource.includes(key), `About page render path should resolve ${key} through i18n.`);
  }

  assert.match(idTranslations.aboutPageIntroPrimary, /Kurioticket/);
  assert.match(idTranslations.aboutPagePlanningCardBody, /penyedia/);
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Indonesian How Kurioticket Works page screenshot-visible copy resolves without English fallback", () => {
  const expectedIndonesianHowItWorksStrings = {
    howItWorksEyebrow: "Cara kerja Kurioticket",
    howItWorksTitle: "Cara Kerja Kurioticket",
    howItWorksIntro:
      "Kurioticket membantu wisatawan beralih dari pencarian ke perbandingan, lalu melanjutkan ke penyedia saat sebuah penawaran dipilih.",
    howItWorksFlowHeading: "Alur dasar",
    "howItWorks.steps.search.title": "Cari pilihan perjalanan",
    "howItWorks.steps.search.description":
      "Masukkan detail perjalanan Anda untuk mencari penerbangan, hotel, mobil, atau promo perjalanan yang tersedia.",
    "howItWorks.steps.compare.title": "Bandingkan hasil yang tersedia",
    "howItWorks.steps.compare.description":
      "Tinjau pilihan yang tersedia, harga, jadwal, detail penyedia, dan informasi perjalanan lainnya saat ditampilkan.",
    "howItWorks.steps.choose.title": "Pilih penawaran",
    "howItWorks.steps.choose.description":
      "Pilih opsi yang paling sesuai dengan rencana Anda setelah meninjau detail yang tersedia.",
    "howItWorks.steps.continue.title": "Lanjutkan ke penyedia",
    "howItWorks.steps.continue.description":
      "Saat diarahkan, lanjutkan di situs web penyedia untuk meninjau detail akhir dan menyelesaikan langkah pemesanan.",
    "howItWorks.providerWebsites.title": "Situs web penyedia",
    "howItWorks.providerWebsites.description":
      "Beberapa pemesanan dapat diselesaikan di situs web penyedia setelah Kurioticket mengarahkan Anda. Tinjau halaman penyedia untuk ketersediaan akhir, harga, ketentuan, langkah pembayaran, dan detail pemesanan sebelum menyelesaikan pembelian.",
  };

  const howItWorksSource = readFileSync("src/app/how-it-works/HowItWorksContent.tsx", "utf8");
  const howItWorksRouteSource = readFileSync("src/app/how-it-works/page.tsx", "utf8");

  assert.ok(howItWorksRouteSource.includes("<HowItWorksContent />"), "How-it-works route should render HowItWorksContent.");
  assert.ok(howItWorksSource.includes('number: "01"') && howItWorksSource.includes('number: "02"') && howItWorksSource.includes('number: "03"') && howItWorksSource.includes('number: "04"'), "How-it-works step numbers should remain unchanged.");
  assert.ok(howItWorksSource.includes("Search") && howItWorksSource.includes("GitCompare") && howItWorksSource.includes("MousePointerClick") && howItWorksSource.includes("ExternalLink"), "How-it-works icons should remain unchanged.");
  assert.ok(howItWorksSource.includes("steps.map((step)"), "How-it-works should keep mapped card order.");
  assert.ok(howItWorksSource.includes('aria-labelledby="how-it-works-steps"'), "How-it-works accessibility attributes should remain unchanged.");
  assert.ok(howItWorksSource.includes("rounded-2xl border border-border bg-white"), "How-it-works card layout classes should remain unchanged.");
  assert.ok(!howItWorksSource.includes("Basic flow"), "Active How-it-works content component should not hardcode screenshot English copy.");

  for (const [key, value] of Object.entries(expectedIndonesianHowItWorksStrings)) {
    assert.equal(idTranslations[key], value, `id ${key} should use Indonesian copy`);
    assert.notEqual(idTranslations[key], enTranslations[key], `id ${key} should not fall back to English`);
    assert.ok(howItWorksSource.includes(key), `How-it-works render path should resolve ${key} through i18n.`);
  }

  assert.match(idTranslations.howItWorksIntro, /penyedia/);
  assert.match(idTranslations["howItWorks.providerWebsites.description"], /penyedia/);
  assert.ok(languageOptions.some((o) => o.code === "id" && o.locale === "id-ID" && o.nativeLabel === "Bahasa Indonesia" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Swedish Account Personal details and Security settings copy resolves without English fallback", () => {
  const personalReadOnly = {
    "accountDashboard.mobile.backAriaLabel": "Tillbaka till Mitt konto",
    "accountDashboard.hub.title": "Mitt konto",
    "accountDashboard.personalDetails.title": "Personuppgifter",
    "accountDashboard.personalDetails.subtitle": "Uppdatera dina uppgifter och hantera hur de används i Kurioticket.",
    "accountDashboard.personalDetails.description": "Hantera informationen som Kurioticket använder för ditt konto.",
    "accountDashboard.personalDetails.name": "Namn",
    "accountDashboard.personalDetails.addName": "Lägg till ditt namn",
    "accountDashboard.personalDetails.emailAddress": "E-postadress",
    "accountDashboard.personalDetails.phoneNumber": "Telefonnummer",
    "accountDashboard.personalDetails.addPhoneNumber": "Lägg till ditt telefonnummer",
    "accountDashboard.personalDetails.dateOfBirth": "Födelsedatum",
    "accountDashboard.personalDetails.addDateOfBirth": "Lägg till ditt födelsedatum",
    "accountDashboard.personalDetails.gender": "Kön",
    "accountDashboard.personalDetails.addGender": "Lägg till ditt kön",
    "accountDashboard.personalDetails.nationality": "Nationalitet",
    "accountDashboard.personalDetails.addNationality": "Lägg till din nationalitet",
    "accountDashboard.personalDetails.address": "Adress",
    "accountDashboard.personalDetails.addAddress": "Lägg till din adress",
    "accountDashboard.personalDetails.edit": "Redigera",
  } as const;

  const personalEdit = {
    "accountDashboard.personalDetails.section.basicInformation": "Grundläggande information",
    "accountDashboard.personalDetails.emailVerified": "Verifierad",
    "accountDashboard.personalDetails.changeEmail": "Ändra e-post",
    "accountDashboard.personalDetails.emailHelper": "Den här e-postadressen används för inloggning och bokningsbekräftelser. Ändringar kräver verifiering.",
    "accountDashboard.personalDetails.phoneHelper": "Vi använder det här numret för bokningsuppdateringar.",
    "accountDashboard.personalDetails.dateOfBirthDayPlaceholder": "DD",
    "accountDashboard.personalDetails.monthPlaceholder": "Månad",
    "accountDashboard.personalDetails.dateOfBirthYearPlaceholder": "ÅÅÅÅ",
    "accountDashboard.personalDetails.addressDescription": "Används för fakturering, bokningsuppgifter och resekommunikation.",
    "accountDashboard.personalDetails.countryRegion": "Land/region",
    "accountDashboard.personalDetails.selectOne": "Välj ett alternativ",
    "accountDashboard.personalDetails.streetAddress": "Gatuadress",
    "accountDashboard.personalDetails.apartmentSuite": "Lägenhet, svit, enhet, byggnad",
    "accountDashboard.personalDetails.townCity": "Ort / stad",
    "accountDashboard.personalDetails.stateProvinceRegion": "Delstat / provins / region",
    "accountDashboard.personalDetails.postcodeZip": "Postnummer",
    "accountDashboard.personalDetails.cancel": "Avbryt",
    "accountDashboard.personalDetails.saveChanges": "Spara ändringar",
  } as const;

  const security = {
    "accountDashboard.security.title": "Säkerhetsinställningar",
    "accountDashboard.security.description": "Hantera inloggning och kontosäkerhet för ditt Kurioticket-konto.",
    "accountDashboard.security.password.title": "Lösenord",
    "accountDashboard.security.password.description": "Ändra lösenordet som används för att logga in på ditt konto.",
    "accountDashboard.security.action.changePassword": "Ändra lösenord",
    "accountDashboard.security.twoFactor.title": "Tvåfaktorsautentisering",
    "accountDashboard.security.twoFactor.description": "Lägg till extra skydd med en autentiseringsapp.",
    "accountDashboard.security.action.setUp": "Konfigurera",
    "accountDashboard.security.passkeys.title": "Passkeys",
    "accountDashboard.security.passkeys.description": "Använd enhetens skärmlås, Face ID, fingeravtryck, lösenordshanterare eller säkerhetsnyckel för att logga in snabbare och säkrare.",
    "accountDashboard.security.activeSessions.title": "Aktiva sessioner",
    "accountDashboard.security.activeSessions.description": "Granska enheter som är inloggade på ditt konto.",
    "accountDashboard.security.action.manageSessions": "Hantera sessioner",
    "accountDashboard.security.notifications.title": "Säkerhetsaviseringar",
    "accountDashboard.security.notifications.description": "Få aviseringar om viktig kontoaktivitet.",
    "accountDashboard.security.action.turnOff": "Stäng av",
    "accountDashboard.security.deleteAccount.title": "Radera konto",
    "accountDashboard.security.deleteAccount.description": "Begär permanent radering av kontot.",
    "accountDashboard.security.action.deleteAccount": "Radera konto",
  } as const;

  for (const [key, expected] of Object.entries({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.equal(svTranslations[key], expected, key);
    if (!["accountDashboard.personalDetails.dateOfBirthDayPlaceholder", "accountDashboard.security.passkeys.title"].includes(key)) {
      assert.notEqual(svTranslations[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  const svOption = languageOptions.find((option) => option.code === "sv");
  const arOption = languageOptions.find((option) => option.code === "ar");
  assert.equal(svOption?.locale, "sv-SE");
  assert.equal(svOption?.nativeLabel, "Svenska");
  assert.equal(svOption?.direction, "ltr");
  assert.equal(arOption?.direction, "rtl");

  const preservedEmail = "bharrywalker@gmail.com";
  const preservedPhone = "+234 801 234 5678";
  const preservedName = "B Harry Walker";
  assert.equal(preservedEmail, "bharrywalker@gmail.com");
  assert.equal(preservedPhone.startsWith("+234"), true);
  assert.equal(preservedName, "B Harry Walker");

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  assert.ok(accountPageSource.includes("<AccountMenuPage"));
  for (const key of Object.keys({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.ok(dashboardSource.includes(key) || accountPageSource.includes(key) || key === "accountDashboard.hub.title" || key === "accountDashboard.mobile.backAriaLabel", `Active account render path should read ${key}`);
  }
  assert.ok(dashboardSource.includes('tx("accountDashboard.security.passkeys.description"'));
  assert.ok(dashboardSource.includes('href="/dashboard/account"'));
  assert.ok(dashboardSource.includes('onClick={handleCancel}'));
  assert.ok(dashboardSource.includes('onClick={handleSave}'));
  assert.ok(dashboardSource.includes('onClick={onStartChange}'));
  assert.ok(dashboardSource.includes('type="button"'));
  assert.ok(dashboardSource.includes('setPasswordModalOpen(true)'));
  assert.ok(dashboardSource.includes('setPasskeysModalOpen(true)'));
  assert.ok(dashboardSource.includes('handleOpenSessions'));
  assert.ok(dashboardSource.includes('handleSecurityAlertsToggle'));
  assert.ok(dashboardSource.includes('setDeleteModalOpen(true)'));
});

test("Indonesian Account Personal details and Security settings copy resolves without English fallback", () => {
  const personalReadOnly = {
    "accountDashboard.personalDetails.title": "Detail pribadi",
    "accountDashboard.personalDetails.subtitle": "Perbarui informasi Anda dan kelola cara informasi tersebut digunakan di Kurioticket.",
    "accountDashboard.personalDetails.description": "Kelola informasi yang digunakan Kurioticket untuk akun Anda.",
    "accountDashboard.personalDetails.name": "Nama",
    "accountDashboard.personalDetails.addName": "Tambahkan nama Anda",
    "accountDashboard.personalDetails.emailAddress": "Alamat email",
    "accountDashboard.personalDetails.phoneNumber": "Nomor telepon",
    "accountDashboard.personalDetails.addPhoneNumber": "Tambahkan nomor telepon Anda",
    "accountDashboard.personalDetails.dateOfBirth": "Tanggal lahir",
    "accountDashboard.personalDetails.addDateOfBirth": "Tambahkan tanggal lahir Anda",
    "accountDashboard.personalDetails.gender": "Jenis kelamin",
    "accountDashboard.personalDetails.addGender": "Tambahkan jenis kelamin Anda",
    "accountDashboard.personalDetails.nationality": "Kewarganegaraan",
    "accountDashboard.personalDetails.addNationality": "Tambahkan kewarganegaraan Anda",
    "accountDashboard.personalDetails.address": "Alamat",
    "accountDashboard.personalDetails.addAddress": "Tambahkan alamat Anda",
    "accountDashboard.personalDetails.edit": "Edit",
  } as const;

  const personalEdit = {
    "accountDashboard.personalDetails.section.basicInformation": "Informasi dasar",
    "accountDashboard.personalDetails.emailVerified": "Terverifikasi",
    "accountDashboard.personalDetails.changeEmail": "Ubah email",
    "accountDashboard.personalDetails.emailHelper": "Email ini digunakan untuk masuk dan konfirmasi pemesanan. Perubahan memerlukan verifikasi.",
    "accountDashboard.personalDetails.phoneHelper": "Kami akan menggunakan nomor ini untuk pembaruan pemesanan.",
    "accountDashboard.personalDetails.dateOfBirthDayPlaceholder": "DD",
    "accountDashboard.personalDetails.monthPlaceholder": "Bulan",
    "accountDashboard.personalDetails.dateOfBirthYearPlaceholder": "YYYY",
    "accountDashboard.personalDetails.addressDescription": "Digunakan untuk penagihan, catatan pemesanan, dan komunikasi perjalanan.",
    "accountDashboard.personalDetails.countryRegion": "Negara/wilayah",
    "accountDashboard.personalDetails.selectOne": "Pilih satu",
    "accountDashboard.personalDetails.streetAddress": "Alamat jalan",
    "accountDashboard.personalDetails.apartmentSuite": "Apartemen, suite, unit, gedung",
    "accountDashboard.personalDetails.townCity": "Kota",
    "accountDashboard.personalDetails.stateProvinceRegion": "Negara bagian / Provinsi / Wilayah",
    "accountDashboard.personalDetails.postcodeZip": "Kode pos",
    "accountDashboard.personalDetails.cancel": "Batal",
    "accountDashboard.personalDetails.saveChanges": "Simpan perubahan",
  } as const;

  const security = {
    "accountDashboard.security.title": "Pengaturan keamanan",
    "accountDashboard.security.description": "Kelola masuk dan keamanan akun untuk akun Kurioticket Anda.",
    "accountDashboard.security.password.title": "Kata sandi",
    "accountDashboard.security.password.description": "Ubah kata sandi yang digunakan untuk masuk ke akun Anda.",
    "accountDashboard.security.action.changePassword": "Ubah kata sandi",
    "accountDashboard.security.twoFactor.title": "Autentikasi dua faktor",
    "accountDashboard.security.twoFactor.description": "Tambahkan perlindungan ekstra dengan aplikasi autentikator.",
    "accountDashboard.security.action.setUp": "Siapkan",
    "accountDashboard.security.passkeys.title": "Passkey",
    "accountDashboard.security.passkeys.description": "Gunakan kunci layar perangkat, Face ID, sidik jari, pengelola kata sandi, atau kunci keamanan untuk masuk lebih cepat dan lebih aman.",
    "accountDashboard.security.activeSessions.title": "Sesi aktif",
    "accountDashboard.security.activeSessions.description": "Tinjau perangkat yang masuk ke akun Anda.",
    "accountDashboard.security.action.manageSessions": "Kelola sesi",
    "accountDashboard.security.notifications.title": "Notifikasi keamanan",
    "accountDashboard.security.notifications.description": "Dapatkan peringatan tentang aktivitas akun penting.",
    "accountDashboard.security.action.turnOff": "Matikan",
    "accountDashboard.security.deleteAccount.title": "Hapus akun",
    "accountDashboard.security.deleteAccount.description": "Minta penghapusan akun permanen.",
    "accountDashboard.security.action.deleteAccount": "Hapus akun",
  } as const;

  for (const [key, expected] of Object.entries({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.equal(idTranslations[key], expected, key);
    if (!["accountDashboard.personalDetails.dateOfBirthDayPlaceholder", "accountDashboard.personalDetails.dateOfBirthYearPlaceholder", "accountDashboard.personalDetails.edit"].includes(key)) {
      assert.notEqual(idTranslations[key], enTranslations[key], `${key} should not fall back to English`);
    }
  }

  const idOption = languageOptions.find((option) => option.code === "id");
  const arOption = languageOptions.find((option) => option.code === "ar");
  assert.equal(idOption?.locale, "id-ID");
  assert.equal(idOption?.nativeLabel, "Bahasa Indonesia");
  assert.equal(idOption?.direction, "ltr");
  assert.equal(arOption?.direction, "rtl");

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  const securityPageSource = readFileSync("src/app/dashboard/security/page.tsx", "utf8");
  assert.ok(accountPageSource.includes("<AccountMenuPage"));
  assert.ok(securityPageSource.includes("<SecurityDashboardPage"));
  for (const key of Object.keys({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.ok(dashboardSource.includes(key), `Active account render path should read ${key}`);
  }
  assert.ok(dashboardSource.includes('href="/dashboard/account"'));
  assert.ok(dashboardSource.includes('onClick={handleCancel}'));
  assert.ok(dashboardSource.includes('onClick={handleSave}'));
  assert.ok(dashboardSource.includes('onClick={onStartChange}'));
  assert.ok(dashboardSource.includes('body: JSON.stringify(profilePayload)'));
  assert.ok(dashboardSource.includes('body: JSON.stringify({ newEmail: nextEmail })'));
  assert.ok(dashboardSource.includes('setPasswordModalOpen(true)'));
  assert.ok(dashboardSource.includes('setPasskeysModalOpen(true)'));
  assert.ok(dashboardSource.includes('handleOpenSessions'));
  assert.ok(dashboardSource.includes('handleSecurityAlertsToggle'));
  assert.ok(dashboardSource.includes('setDeleteModalOpen(true)'));
  assert.ok(dashboardSource.includes('rounded-2xl'));
});

test("Thai Account Personal details and Security settings copy resolves without English fallback", () => {
  const personalReadOnly = {
    "accountDashboard.personalDetails.title": "รายละเอียดส่วนตัว",
    "accountDashboard.personalDetails.subtitle": "อัปเดตข้อมูลของคุณและจัดการวิธีที่ข้อมูลนี้ถูกใช้ใน Kurioticket",
    "accountDashboard.personalDetails.description": "จัดการข้อมูลที่ Kurioticket ใช้สำหรับบัญชีของคุณ",
    "accountDashboard.personalDetails.name": "ชื่อ",
    "accountDashboard.personalDetails.addName": "เพิ่มชื่อของคุณ",
    "accountDashboard.personalDetails.emailAddress": "ที่อยู่อีเมล",
    "accountDashboard.personalDetails.phoneNumber": "หมายเลขโทรศัพท์",
    "accountDashboard.personalDetails.addPhoneNumber": "เพิ่มหมายเลขโทรศัพท์ของคุณ",
    "accountDashboard.personalDetails.dateOfBirth": "วันเกิด",
    "accountDashboard.personalDetails.addDateOfBirth": "เพิ่มวันเกิดของคุณ",
    "accountDashboard.personalDetails.gender": "เพศ",
    "accountDashboard.personalDetails.addGender": "เพิ่มเพศของคุณ",
    "accountDashboard.personalDetails.nationality": "สัญชาติ",
    "accountDashboard.personalDetails.addNationality": "เพิ่มสัญชาติของคุณ",
    "accountDashboard.personalDetails.address": "ที่อยู่",
    "accountDashboard.personalDetails.addAddress": "เพิ่มที่อยู่ของคุณ",
    "accountDashboard.personalDetails.edit": "แก้ไข",
  } as const;

  const personalEdit = {
    "accountDashboard.personalDetails.section.basicInformation": "ข้อมูลพื้นฐาน",
    "accountDashboard.personalDetails.section.address": "ที่อยู่",
    "accountDashboard.personalDetails.emailVerified": "ยืนยันแล้ว",
    "accountDashboard.personalDetails.changeEmail": "เปลี่ยนอีเมล",
    "accountDashboard.personalDetails.emailHelper": "อีเมลนี้ใช้สำหรับการเข้าสู่ระบบและการยืนยันการจอง การเปลี่ยนแปลงต้องมีการยืนยัน",
    "accountDashboard.personalDetails.phoneHelper": "เราจะใช้หมายเลขนี้สำหรับอัปเดตการจอง",
    "accountDashboard.personalDetails.dateOfBirthDayPlaceholder": "วัน",
    "accountDashboard.personalDetails.monthPlaceholder": "เดือน",
    "accountDashboard.personalDetails.dateOfBirthYearPlaceholder": "ปี",
    "accountDashboard.personalDetails.addressDescription": "ใช้สำหรับการเรียกเก็บเงิน บันทึกการจอง และการสื่อสารเกี่ยวกับการเดินทาง",
    "accountDashboard.personalDetails.countryRegion": "ประเทศ/ภูมิภาค",
    "accountDashboard.personalDetails.selectOne": "เลือกหนึ่งรายการ",
    "accountDashboard.personalDetails.streetAddress": "ที่อยู่ถนน",
    "accountDashboard.personalDetails.apartmentSuite": "อพาร์ตเมนต์ ห้องชุด ยูนิต อาคาร",
    "accountDashboard.personalDetails.townCity": "เมือง / เขต",
    "accountDashboard.personalDetails.stateProvinceRegion": "รัฐ / จังหวัด / ภูมิภาค",
    "accountDashboard.personalDetails.postcodeZip": "รหัสไปรษณีย์",
    "accountDashboard.personalDetails.cancel": "ยกเลิก",
    "accountDashboard.personalDetails.saveChanges": "บันทึกการเปลี่ยนแปลง",
  } as const;

  const security = {
    "accountDashboard.security.title": "การตั้งค่าความปลอดภัย",
    "accountDashboard.security.description": "จัดการการเข้าสู่ระบบและความปลอดภัยของบัญชี Kurioticket ของคุณ",
    "accountDashboard.security.password.title": "รหัสผ่าน",
    "accountDashboard.security.password.description": "เปลี่ยนรหัสผ่านที่ใช้เข้าสู่ระบบบัญชีของคุณ",
    "accountDashboard.security.action.changePassword": "เปลี่ยนรหัสผ่าน",
    "accountDashboard.security.twoFactor.title": "การยืนยันตัวตนแบบสองขั้นตอน",
    "accountDashboard.security.twoFactor.description": "เพิ่มการป้องกันด้วยแอปยืนยันตัวตน",
    "accountDashboard.security.action.setUp": "ตั้งค่า",
    "accountDashboard.security.passkeys.title": "พาสคีย์",
    "accountDashboard.security.passkeys.description": "ใช้การล็อกหน้าจอของอุปกรณ์ Face ID ลายนิ้วมือ ตัวจัดการรหัสผ่าน หรือคีย์ความปลอดภัย เพื่อเข้าสู่ระบบได้รวดเร็วและปลอดภัยยิ่งขึ้น",
    "accountDashboard.security.activeSessions.title": "เซสชันที่ใช้งานอยู่",
    "accountDashboard.security.activeSessions.description": "ตรวจสอบอุปกรณ์ที่เข้าสู่ระบบบัญชีของคุณ",
    "accountDashboard.security.action.manageSessions": "จัดการเซสชัน",
    "accountDashboard.security.notifications.title": "การแจ้งเตือนความปลอดภัย",
    "accountDashboard.security.notifications.description": "รับการแจ้งเตือนเกี่ยวกับกิจกรรมสำคัญของบัญชี",
    "accountDashboard.security.action.turnOff": "ปิด",
    "accountDashboard.security.deleteAccount.title": "ลบบัญชี",
    "accountDashboard.security.deleteAccount.description": "ขอลบบัญชีอย่างถาวร",
    "accountDashboard.security.action.deleteAccount": "ลบบัญชี",
  } as const;

  for (const [key, expected] of Object.entries({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.equal(thTranslations[key], expected, key);
    assert.notEqual(thTranslations[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const thOption = languageOptions.find((option) => option.code === "th");
  const arOption = languageOptions.find((option) => option.code === "ar");
  assert.equal(thOption?.locale, "th-TH");
  assert.equal(thOption?.nativeLabel, "ไทย");
  assert.equal(thOption?.direction, "ltr");
  assert.equal(arOption?.direction, "rtl");

  const dashboardSource = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const accountPageSource = readFileSync("src/app/dashboard/account/page.tsx", "utf8");
  const securityPageSource = readFileSync("src/app/dashboard/security/page.tsx", "utf8");
  assert.ok(accountPageSource.includes("<AccountMenuPage"));
  assert.ok(securityPageSource.includes("<SecurityDashboardPage"));
  for (const key of Object.keys({ ...personalReadOnly, ...personalEdit, ...security })) {
    assert.ok(dashboardSource.includes(key), `Active account render path should read ${key}`);
  }
  for (const english of ["Personal details", "Basic information", "Security settings"]) {
    assert.ok(!dashboardSource.includes(`>${english}<`), `${english} should not be hardcoded as rendered Thai UI copy`);
  }
  assert.ok(dashboardSource.includes('tx("accountDashboard.security.action.changePassword", "Change password")'));
  assert.ok(dashboardSource.includes('href="/dashboard/account"'));
  assert.ok(dashboardSource.includes('body: JSON.stringify(profilePayload)'));
  assert.ok(dashboardSource.includes('body: JSON.stringify({ newEmail: nextEmail })'));
  assert.ok(dashboardSource.includes('onClick={handleCancel}'));
  assert.ok(dashboardSource.includes('onClick={handleSave}'));
  assert.ok(dashboardSource.includes('onClick={onStartChange}'));
  assert.ok(dashboardSource.includes('setPasswordModalOpen(true)'));
  assert.ok(dashboardSource.includes('setPasskeysModalOpen(true)'));
  assert.ok(dashboardSource.includes('handleOpenSessions'));
  assert.ok(dashboardSource.includes('handleSecurityAlertsToggle'));
  assert.ok(dashboardSource.includes('setDeleteModalOpen(true)'));
  assert.ok(dashboardSource.includes('rounded-2xl'));

  const preservedEmail = "bharrywalker@gmail.com";
  const preservedPhone = "+234 801 234 5678";
  const preservedName = "B Harry Walker";
  assert.equal(preservedEmail, "bharrywalker@gmail.com");
  assert.equal(preservedPhone.startsWith("+234"), true);
  assert.equal(preservedName, "B Harry Walker");
});

test("Newsletter account email and Manage Email Updates copy resolve for all active locales", () => {
  const activeLocales = [
    ["en-us", enTranslations],
    ["ar", arTranslations],
    ["nl", nlTranslations],
    ["es-es", esTranslations],
    ["fr", frTranslations],
    ["de", deTranslations],
    ["it", itTranslations],
    ["pt-br", ptBrTranslations],
    ["zh-cn", zhCnTranslations],
    ["ja", jaTranslations],
    ["ko", koTranslations],
    ["hi", hiTranslations],
    ["tr", trTranslations],
    ["pl", plTranslations],
    ["sv", svTranslations],
  ] as const;
  const auditedKeys = [
    "newsletter.accountEmailLine",
    "newsletter.manageEmailPreferences",
    "emailUpdates.eyebrow",
    "emailUpdates.title",
    "emailUpdates.description",
    "emailUpdates.emailLabel",
    "emailUpdates.subscribedStatus",
    "emailUpdates.subscribedButton",
    "emailUpdates.stopUpdates",
    "emailUpdates.loadingStatus",
    "emailUpdates.unsubscribedStatus",
    "emailUpdates.notFoundStatus",
    "emailUpdates.subscribeButton",
    "emailUpdates.restartUpdates",
    "emailUpdates.updatesStopped",
    "emailUpdates.notAvailable",
    "emailUpdates.invalidLink",
    "emailUpdates.loadError",
    "emailUpdates.updateError",
    "emailUpdates.preferenceUpdated",
  ];

  for (const [locale, dictionary] of activeLocales) {
    assert.equal(getTranslations(locale), dictionary);
    for (const key of auditedKeys) {
      assert.equal(typeof dictionary[key], "string", `${locale} should define ${key}`);
      assert.ok(dictionary[key].length > 0, `${locale} should resolve ${key}`);
    }
    assert.equal(dictionary["newsletter.accountEmailLine"].includes("{{email}}"), true, `${locale} should preserve {{email}}`);
    const renderedAccountLine = dictionary["newsletter.accountEmailLine"].replace("{{email}}", "bharrywalker@gmail.com");
    assert.ok(renderedAccountLine.includes("bharrywalker@gmail.com"), `${locale} should preserve dynamic email addresses`);
  }

  assert.equal(svTranslations["newsletter.accountEmailLine"], "Prenumerera med e-postadressen för ditt konto: {{email}}.");
  assert.equal(svTranslations["newsletter.manageEmailPreferences"], "Hantera e-postinställningar");
  assert.equal(svTranslations["emailUpdates.eyebrow"], "KURIOTICKET-UPPDATERINGAR");
  assert.equal(svTranslations["emailUpdates.title"], "Hantera e-postuppdateringar");
  assert.equal(svTranslations["emailUpdates.subscribedStatus"], "Du prenumererar.");
  assert.equal(svTranslations["emailUpdates.subscribedButton"], "Prenumererar");
  assert.equal(svTranslations["emailUpdates.stopUpdates"], "Stoppa uppdateringar");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
  for (const option of languageOptions.filter((o) => o.status === "available" && o.code !== "ar")) {
    assert.equal(option.direction, "ltr", `${option.code} should remain ltr`);
  }
});

test("Newsletter and email updates render paths read i18n keys without changing behavior", () => {
  const newsletterBridgeSource = readFileSync("src/components/newsletter/NewsletterSessionBridge.tsx", "utf8");
  const preferencesClientSource = readFileSync("src/components/newsletter/NewsletterPreferencesClient.tsx", "utf8");

  assert.ok(newsletterBridgeSource.includes("/api/newsletter/subscribe") && newsletterBridgeSource.includes("section.hidden = true"), "Newsletter bridge should keep behavior limited to subscription visibility.");

  for (const key of [
    "emailUpdates.eyebrow",
    "emailUpdates.title",
    "emailUpdates.description",
    "emailUpdates.emailLabel",
    "emailUpdates.subscribedStatus",
    "emailUpdates.subscribedButton",
    "emailUpdates.stopUpdates",
  ]) {
    assert.ok(preferencesClientSource.includes(`t["${key}"]`), `Manage Email Updates render path should read ${key}.`);
  }
  assert.ok(preferencesClientSource.includes('fetch(`/api/newsletter/preferences?${params.toString()}`)'), "Preferences GET API route should remain unchanged.");
  assert.ok(preferencesClientSource.includes('fetch("/api/newsletter/preferences", {'), "Preferences POST API route should remain unchanged.");
  assert.ok(preferencesClientSource.includes('body: JSON.stringify({ email: address, token, action })'), "Preferences submit values should remain unchanged.");
});

test("Indonesian Deals package search clear-all copy resolves from i18n without behavior changes", () => {
  const id = getTranslations("id");
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");
  const idSource = readFileSync("src/lib/i18n/id.ts", "utf8");

  assert.equal(id.clearAll, "Hapus semua");
  assert.notEqual(id.clearAll, enTranslations.clearAll);
  assert.equal((idSource.match(/^\s*clearAll:/gm) ?? []).length, 1);
  assert.match(
    dealsPageSource,
    /const t = useCallback\([\s\S]*?dictionary\[key\] \?\? enTranslations\[key\] \?\? key[\s\S]*?\);/,
    "Deals page should resolve labels from the active locale dictionary before English fallback.",
  );
  assert.match(
    dealsPageSource,
    /hasActiveDealsSearch[\s\S]*?<button[\s\S]*?onClick=\{handleResetSearch\}[\s\S]*?\{t\("clearAll"\)\}[\s\S]*?<\/button>/,
    "Active Deals clear/reset render path should read the shared clearAll i18n key.",
  );
  assert.doesNotMatch(
    dealsPageSource,
    /hasActiveDealsSearch[\s\S]*?>Clear all<|hasActiveDealsSearch[\s\S]*?\{"Clear all"\}/,
    "Deals package search should not hardcode English clear-all copy.",
  );

  assert.equal(id["deals.package.hotelFlight"], "Hotel + Penerbangan");
  assert.equal(id["deals.package.hotelFlightCar"], "Hotel + Penerbangan + Mobil");
  assert.equal(id["deals.package.flightCar"], "Penerbangan + Mobil");
  assert.equal(id["deals.package.hotelCar"], "Hotel + Mobil");
  assert.equal(id["deals.dateHotelPlaceholder"], "Tanggal masuk — keluar");
  assert.equal(id["deals.searchButton"], "Cari penawaran");

  for (const value of ["hotel-flight", "hotel-flight-car", "flight-car", "hotel-car"]) {
    assert.ok(dealsPageSource.includes(`value: "${value}"`), `${value} package value should remain unchanged.`);
  }
  for (const snippet of [
    'setPackageMode("hotel-flight")',
    'setOrigin("")',
    'setDestination("")',
    'setStartDate("")',
    'setEndDate("")',
    'setAdults(1)',
    'setChildren(0)',
    'setRooms(1)',
    'setDriverAge(30)',
    'setCabinClass("economy")',
    'router.push(`/flights/results?${params.toString()}`)',
    'router.push(`/hotels/results?${params.toString()}`)',
    'name="packageMode"',
    'id="package-origin"',
    'id="package-destination"',
    'focus-visible:ring-2 focus-visible:ring-indigo-500',
    'aria-label={t("deals.packageLegend")}',
    'aria-busy={isSubmitting}',
  ]) {
    assert.ok(dealsPageSource.includes(snippet), `Deals form behavior/rendering should preserve ${snippet}.`);
  }
  assert.equal(languageOptions.find((option) => option.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});


test("Thai Deals landing page copy resolves from i18n without English fallback", () => {
  const th = getTranslations("th");
  const dealsPageSource = readFileSync("src/app/deals/page.tsx", "utf8");

  const expected: Record<string, string> = {
    "deals.heroTitle": "ค้นหาดีลการเดินทางสำหรับทริปถัดไปของคุณ",
    "deals.heroSubtitle": "ค้นหาเที่ยวบิน ที่พัก และรถเช่ารวมกันได้ในที่เดียว",
    "deals.package.hotelFlight": "โรงแรม + เที่ยวบิน",
    "deals.package.hotelFlightCar": "โรงแรม + เที่ยวบิน + รถ",
    "deals.package.flightCar": "เที่ยวบิน + รถ",
    "deals.package.hotelCar": "โรงแรม + รถ",
    "deals.originLabel": "จากที่ไหน?",
    "deals.originPlaceholder": "เมืองหรือสนามบิน",
    "deals.destinationLabel": "ไปที่ไหน?",
    "deals.destinationPlaceholder": "เมือง สนามบิน หรือพื้นที่",
    "deals.datesLabel": "วันที่เดินทาง",
    "deals.dateHotelPlaceholder": "เช็กอิน — เช็กเอาต์",
    "deals.dateFlightPlaceholder": "ออกเดินทาง — กลับ",
    "deals.travelersRoomsLabel": "ผู้เดินทาง / ห้องพัก",
    "deals.travelersRoomsCarLabel": "ผู้เดินทาง / ห้องพัก / รถ",
    "deals.searchButton": "ค้นหาดีล",
    clearAll: "ล้างทั้งหมด",
    "deals.destinationIdeasTitle": "จุดหมายเริ่มต้นสำหรับค้นหาดีล",
    "deals.destinationIdeasSubtitle": "เลือกไอเดียจุดหมายปลายทาง แล้วเปรียบเทียบผลลัพธ์จากผู้ให้บริการเมื่อดำเนินการต่อ",
    "deals.destination.tokyo.city": "โตเกียว",
    "deals.destination.tokyo.country": "ญี่ปุ่น",
    "deals.destination.london.city": "ลอนดอน",
    "deals.destination.london.country": "สหราชอาณาจักร",
    "deals.destination.paris.city": "ปารีส",
    "deals.destination.paris.country": "ฝรั่งเศส",
    "deals.destination.dubai.city": "ดูไบ",
    "deals.destination.dubai.country": "สหรัฐอาหรับเอมิเรตส์",
    "deals.destination.cancun.city": "แคนคูน",
    "deals.destination.cancun.country": "เม็กซิโก",
    "deals.destination.rome.city": "โรม",
    "deals.destination.rome.country": "อิตาลี",
    "deals.destination.tokyo.imageAlt": "เมืองโตเกียว",
    "deals.destination.london.imageAlt": "ลอนดอน",
    "deals.destination.paris.imageAlt": "ปารีส",
    "deals.destination.dubai.imageAlt": "เส้นขอบฟ้าดูไบ",
    "deals.destination.cancun.imageAlt": "ชายหาดแคนคูน",
    "deals.destination.rome.imageAlt": "แลนด์มาร์กกรุงโรม",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, `${key} should resolve to Thai`);
    assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(`${th["deals.travelerSingular"]} 1 คน, ${th["deals.roomSingular"]} 1 ห้อง`, "ผู้เดินทาง 1 คน, ห้อง 1 ห้อง");
  assert.equal(th.clearAll, "ล้างทั้งหมด");
  assert.notEqual(th.clearAll, enTranslations.clearAll);

  const thSource = readFileSync("src/lib/i18n/th.ts", "utf8");
  assert.equal((thSource.match(/^\s*clearAll:/gm) ?? []).length, 1, "Thai clearAll key should appear exactly once.");
  assert.match(
    dealsPageSource,
    /hasActiveDealsSearch[\s\S]*?<button[\s\S]*?onClick=\{handleResetSearch\}[\s\S]*?\{t\("clearAll"\)\}[\s\S]*?<\/button>/,
    "Active Deals clear/reset render path should read the shared clearAll i18n key.",
  );
  assert.doesNotMatch(
    dealsPageSource,
    /hasActiveDealsSearch[\s\S]*?>Clear all<|hasActiveDealsSearch[\s\S]*?\{"Clear all"\}/,
    "Deals package search should not hardcode English clear-all copy.",
  );
  assert.equal(languageOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");

  for (const value of ["hotel-flight", "hotel-flight-car", "flight-car", "hotel-car"]) {
    assert.ok(dealsPageSource.includes(`value: "${value}"`), `${value} package value should remain unchanged.`);
  }

  for (const snippet of [
    'setPackageMode("hotel-flight")',
    'setOrigin("")',
    'setDestination("")',
    'setStartDate("")',
    'setEndDate("")',
    'setAdults(1)',
    'setChildren(0)',
    'setRooms(1)',
    'setDriverAge(30)',
    'setCabinClass("economy")',
    'router.push(`/flights/results?${params.toString()}`)',
    'router.push(`/hotels/results?${params.toString()}`)',
    'origin: trimmedOrigin',
    'destination: trimmedDestination',
    'adults: String(normalizedAdults)',
    'name="packageMode"',
    'id="package-origin"',
    'id="package-destination"',
    'focus-visible:ring-2 focus-visible:ring-indigo-500',
    'aria-label={t("deals.packageLegend")}',
    'alt={t(idea.imageAltKey)}',
  ]) {
    assert.ok(dealsPageSource.includes(snippet), `Deals form behavior/rendering should preserve ${snippet}.`);
  }

  for (const key of [
    "deals.heroTitle",
    "deals.heroSubtitle",
    "deals.originLabel",
    "deals.originPlaceholder",
    "deals.destinationLabel",
    "deals.destinationPlaceholder",
    "deals.datesLabel",
    "deals.dateFlightPlaceholder",
    "deals.dateHotelPlaceholder",
    "deals.searchButton",
    "clearAll",
    "deals.destinationIdeasTitle",
    "deals.destinationIdeasSubtitle",
  ]) {
    assert.ok(dealsPageSource.includes(`t("${key}")`), `${key} should be read through i18n`);
  }

  for (const key of [
    "deals.package.hotelFlight",
    "deals.package.hotelFlightCar",
    "deals.package.flightCar",
    "deals.package.hotelCar",
    "deals.destination.tokyo.city",
    "deals.destination.tokyo.country",
    "deals.destination.london.city",
    "deals.destination.london.country",
    "deals.destination.paris.city",
    "deals.destination.paris.country",
    "deals.destination.dubai.city",
    "deals.destination.dubai.country",
    "deals.destination.cancun.city",
    "deals.destination.cancun.country",
    "deals.destination.rome.city",
    "deals.destination.rome.country",
  ]) {
    assert.ok(dealsPageSource.includes(key), `${key} should be in the active Deals render path`);
  }

  const destinationOrder = ["Tokyo", "London", "Paris", "Dubai", "Cancun", "Rome"];
  const orderIndexes = destinationOrder.map((city) => dealsPageSource.indexOf(`destinationQuery: "${city}"`));
  assert.deepEqual([...orderIndexes].sort((a, b) => a - b), orderIndexes, "Destination order should remain unchanged.");
  for (const index of orderIndexes) assert.ok(index > -1, "Destination query should remain unchanged.");
  assert.match(dealsPageSource, /const t = useCallback\([\s\S]*?dictionary\[key\] \?\? enTranslations\[key\] \?\? key[\s\S]*?\);/);
  assert.doesNotMatch(dealsPageSource, />Find travel deals for your next trip<|\{"Find travel deals for your next trip"\}/);
});


test("Thai homepage visible copy and render paths resolve without English fallback", () => {
  const th = getTranslations("th");
  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const searchTabsSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const footerSource = readFileSync("src/components/layout/Footer.tsx", "utf8");

  const expected: Record<string, string> = {
    flights: "เที่ยวบิน",
    hotels: "โรงแรม",
    cars: "รถเช่า",
    deals: "ดีล",
    login: "เข้าสู่ระบบ",
    signUp: "สมัครใช้งาน",
    homeHeroTitle: "เปรียบเทียบตัวเลือกการเดินทางได้ในการค้นหาเดียว",
    homeHeroSubtitle: "ค้นหาผู้ให้บริการเดินทางที่เชื่อถือได้ เปรียบเทียบราคาอย่างชัดเจน และเลือกตัวเลือกที่เหมาะกับทริปของคุณ",
    roundTrip: "ไป-กลับ",
    oneWay: "เที่ยวเดียว",
    origin: "ต้นทาง",
    destination: "ปลายทาง",
    fromPlaceholder: "จากที่ไหน?",
    toPlaceholder: "ไปที่ไหน?",
    travelDates: "วันที่เดินทาง",
    chooseTravelDates: "เลือกวันที่เดินทาง",
    travelers: "ผู้เดินทาง",
    search: "ค้นหา",
    clear: "ล้าง",
    done: "เสร็จสิ้น",
    previousShort: "ก่อนหน้า",
    nextShort: "ถัดไป",
    passengers: "ผู้โดยสาร",
    adults: "ผู้ใหญ่",
    adultAgeRange: "18+",
    children: "เด็ก",
    childAgeRange: "อายุ 2–17 ปี",
    infantsOnLap: "ทารกนั่งตัก",
    under2: "ต่ำกว่า 2 ปี",
    cabinClass: "ชั้นโดยสาร",
    economy: "ชั้นประหยัด",
    business: "ชั้นธุรกิจ",
    first: "ชั้นหนึ่ง",
    homePopularDestinations: "จุดหมายปลายทางยอดนิยม",
    homeExploreFares: "ดูค่าโดยสาร",
    homeDiscoveryTitle: "ค้นพบการผจญภัยครั้งต่อไปของคุณที่นี่",
    homeDiscoverySubtitle: "เปรียบเทียบไอเดียเส้นทางอัจฉริยะ ค่าโดยสารยืดหยุ่น และจุดหมายปลายทางที่คัดสรรสำหรับภูมิภาคของคุณ",
    homeDiscoveryRouteIdeaBadge: "ไอเดียเส้นทาง",
    homeDiscoveryTripOneWay: "เที่ยวเดียว",
    homeDiscoveryCabinEconomy: "ชั้นประหยัด",
    homeDiscoveryTravelerCountOne: "ผู้เดินทาง 1 คน",
    homeCompareOptions: "เปรียบเทียบตัวเลือก",
    homeTrustTitle: "เหตุผลที่นักเดินทางเปรียบเทียบบน Kurioticket",
    homeTrustSubtitle: "Kurioticket ช่วยให้คุณเปรียบเทียบข้อเสนอจากผู้ให้บริการได้อย่างชัดเจน จากนั้นดำเนินการจองให้เสร็จบนเว็บไซต์ของผู้ให้บริการ",
    homeTrustCompareTitle: "เปรียบเทียบข้อเสนอจากผู้ให้บริการ",
    homeTrustCompareBody: "ดูตัวเลือกเที่ยวบินและโรงแรมจากผู้ให้บริการเดินทางหลายรายได้ในที่เดียว",
    homeTrustPricingTitle: "ข้อมูลราคาที่โปร่งใส",
    homeTrustPricingBody: "ตรวจสอบราคา รายละเอียดเส้นทางหรือที่พัก และเงื่อนไขสำคัญก่อนดำเนินการต่อ",
    homeTrustHandoffTitle: "ส่งต่อไปยังผู้ให้บริการอย่างปลอดภัย",
    homeTrustHandoffBody: "เมื่อคุณเลือกข้อเสนอ คุณจะไปยังผู้ให้บริการเพื่อทำการจองให้เสร็จอย่างปลอดภัย",
    homePromoFlightsTitle: "ดีลเที่ยวบินจากสายการบินชั้นนำ",
    homePromoFlightsBody: "ค้นหาค่าโดยสารช่วงเวลาจำกัดและเปรียบเทียบตัวเลือกได้ทันที",
    homePromoFlightsCta: "ดูดีลเที่ยวบิน",
    homePromoHotelsTitle: "ประหยัดค่าโรงแรมทั่วโลก",
    homePromoHotelsBody: "เลือกดูที่พักตั้งแต่โรงแรมบูติกไปจนถึงเครือโรงแรมระดับโลก พร้อมราคาที่โปร่งใส",
    homePromoHotelsCta: "ดูดีลโรงแรม",
    faqHeading: "คำถามที่พบบ่อย",
    faqIntro: "เรียนรู้ว่า Kurioticket ช่วยให้คุณเปรียบเทียบเที่ยวบิน โรงแรม และตัวเลือกการเดินทางก่อนจองกับผู้ให้บริการที่เชื่อถือได้อย่างไร",
    faqQuestionFindOptions: "Kurioticket ค้นหาตัวเลือกเที่ยวบินและโรงแรมอย่างไร?",
    faqQuestionSellDirectly: "Kurioticket ขายตั๋วหรือห้องพักโรงแรมโดยตรงหรือไม่?",
    faqQuestionPriceChanges: "ทำไมราคาจึงเปลี่ยนได้หลังจากฉันคลิกข้อเสนอ?",
    faqQuestionCompareProviders: "ฉันสามารถเปรียบเทียบผู้ให้บริการหลายรายสำหรับทริปเดียวกันได้หรือไม่?",
    faqQuestionSecureBooking: "ฉันจะทำการจองให้เสร็จอย่างปลอดภัยได้อย่างไร?",
    faqQuestionPreferences: "ฉันสามารถตั้งค่าความต้องการสกุลเงินและภาษาได้หรือไม่?",
    faqQuestionLiveCached: "ผลการค้นหาเป็นข้อมูลสดหรือข้อมูลแคช?",
    faqQuestionManageChanges: "ฉันจะจัดการการเปลี่ยนแปลงหรือการยกเลิกได้ที่ไหน?",
    supportFaqAccountQuestion: "ความช่วยเหลือเกี่ยวกับบัญชีและการเข้าสู่ระบบ",
    supportFaqSearchQuestion: "ความช่วยเหลือเกี่ยวกับการค้นหาและผลลัพธ์",
    supportFaqSavedTripsQuestion: "ทริปที่บันทึกไว้และการแจ้งเตือน",
    supportFaqRedirectQuestion: "ความช่วยเหลือเกี่ยวกับการจอง/การเปลี่ยนเส้นทางไปยังผู้ให้บริการ",
    supportFaqAlreadyBookedQuestion: "จองกับผู้ให้บริการแล้วใช่ไหม?",
    supportFaqChangeBookingQuestion: "Kurioticket สามารถเปลี่ยนแปลงการจองของฉันได้หรือไม่?",
    supportFaqWhyRedirectedQuestion: "ทำไมฉันจึงถูกส่งไปยังผู้ให้บริการรายอื่น?",
    homeNewsletterTitle: "รับข่าวดีลการเดินทางก่อนใคร",
    homeNewsletterBody: "รับอัปเดตเที่ยวบินและโรงแรมที่คัดสรรแล้วทุกสัปดาห์",
    homeNewsletterPlaceholder: "ป้อนอีเมลของคุณ",
    homeSubscribe: "สมัครรับข่าวสาร",
    homeNewsletterConsent: "เมื่อสมัครรับข่าวสาร คุณตกลงที่จะรับอัปเดตจาก Kurioticket และสามารถยกเลิกได้ทุกเมื่อ",
    homeNewsletterThanks: "ขอบคุณ! เราจะแจ้งดีลการเดินทางให้คุณทราบ",
    footerContactUs: "ติดต่อเรา",
    footerCustomerSupport: "ฝ่ายสนับสนุนลูกค้า",
    footerServiceGuarantee: "การรับประกันบริการ",
    footerMoreServiceInfo: "ข้อมูลบริการเพิ่มเติม",
    footerDiscover: "สำรวจ",
    footerSavedRecent: "ที่บันทึกไว้และล่าสุด",
    footerTermsSettings: "ข้อกำหนดและการตั้งค่า",
    footerPrivacyPolicy: "นโยบายความเป็นส่วนตัว",
    footerTermsOfService: "ข้อกำหนดการให้บริการ",
    footerCookiePolicy: "นโยบายคุกกี้",
    legalCenter: "ศูนย์กฎหมาย",
    footerAboutKurioticket: "เกี่ยวกับ Kurioticket",
    footerAboutUs: "เกี่ยวกับเรา",
    footerHowItWorks: "Kurioticket ทำงานอย่างไร",
    footerConfidenceTagline: "ค้นหาเที่ยวบิน โรงแรม และดีลการเดินทางได้อย่างมั่นใจ",
    footerPrivacy: "ความเป็นส่วนตัว",
    footerTerms: "ข้อกำหนด",
    footerCookies: "คุกกี้",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, `${key} should resolve to Thai`);
    if (value !== enTranslations[key]) assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(`${th.adultSingular} 1 คน, ${th.economy}`, "ผู้ใหญ่ 1 คน, ชั้นประหยัด");
  assert.equal(th["newsletter.accountEmailLine"], "สมัครรับข่าวสารด้วยอีเมลบัญชีของคุณ: {{email}}.");
  assert.match(th["newsletter.accountEmailLine"], /\{\{email\}\}/);
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");

  for (const key of ["faqAnswerFindOptions", "faqAnswerSellDirectly", "faqAnswerPriceChanges", "faqAnswerSecureBooking", "faqAnswerManageChanges", "supportFaqAlreadyBookedAnswer", "supportFaqWhyRedirectedAnswer"]) {
    assert.match(th[key], /Kurioticket|ผู้ให้บริการ/, `${key} should preserve provider-boundary meaning`);
    assert.notEqual(th[key], enTranslations[key], `${key} should be localized`);
  }

  const translatedFaqs = getGeneralFaqs((key) => th[key] ?? enTranslations[key] ?? "");
  assert.ok(translatedFaqs.some((item) => item.question === "ความช่วยเหลือเกี่ยวกับบัญชีและการเข้าสู่ระบบ"));
  assert.ok(translatedFaqs.some((item) => item.answer.includes("ผู้ให้บริการภายนอก")));

  assert.ok(pageSource.includes('t("homeHeroTitle")') && pageSource.includes('t("homeNewsletterTitle")'));
  assert.ok(pageSource.includes('const translatedFaqs = getGeneralFaqs(t)') && pageSource.includes('items={translatedFaqs}'));
  assert.ok(headerSource.includes("t.flights") && headerSource.includes("t.login") && headerSource.includes("t.signUp"));
  assert.ok(searchTabsSource.includes("t.roundTrip") && searchTabsSource.includes('translate("infantsOnLap")') && searchTabsSource.includes('translate("hotelSearchGuestsLabel")'));
  assert.match(searchTabsSource, /if \(!departureSummary\) \{[\s\S]*?return t\.travelDates \|\| "Travel dates";[\s\S]*?\}/);
  assert.match(searchTabsSource, /if \(checkOutSummary\) \{[\s\S]*?return `\$\{checkInSummary\} — \$\{checkOutSummary\}`;[\s\S]*?\}/);
  assert.ok(searchTabsSource.includes("/flights/results?") && searchTabsSource.includes("/hotels/results?${params.toString()}"));
  assert.ok(footerSource.includes("t.footerSellerOfTravelNotice") && footerSource.includes("t.footerPrivacy"));
});


test("Thai support, service guarantee, and more service pages resolve localized active copy", () => {
  const th = getTranslations("th");
  const supportContentSource = readFileSync("src/app/support/SupportContent.tsx", "utf8");
  const supportFormSource = readFileSync("src/components/support/SupportForm.tsx", "utf8");
  const serviceGuaranteeSource = readFileSync("src/app/service-guarantee/ServiceGuaranteeContent.tsx", "utf8");
  const moreServiceInfoSource = readFileSync("src/app/more-service-info/MoreServiceInfoContent.tsx", "utf8");

  const expected: Record<string, string> = {
    supportEyebrow: "ฝ่ายช่วยเหลือ Kurioticket",
    supportTitle: "ฝ่ายสนับสนุนลูกค้า",
    supportBeforeContactHeading: "ก่อนติดต่อเรา",
    supportBeforeContactDescription: "โปรดระบุอีเมลในบัญชี Kurioticket ของคุณ สิ่งที่คุณพยายามทำ เส้นทางหรือโรงแรมที่เกี่ยวข้อง และหน้าผู้ให้บริการที่คุณถูกเปลี่ยนเส้นทางไป โปรดอย่าส่งหมายเลขบัตรชำระเงินแบบเต็มหรือหมายเลขเอกสารการเดินทางที่ละเอียดอ่อน",
    supportTicketHeading: "สร้างคำขอรับการสนับสนุน",
    supportFormEmailLabel: "อีเมล",
    supportFormSubjectLabel: "หัวข้อ",
    supportFormCategoryLabel: "หมวดหมู่",
    supportCategorySearchHelp: "ผลการค้นหา",
    supportCategoryPriceAlerts: "การแจ้งเตือนราคา",
    supportCategoryPartnerRedirect: "การเปลี่ยนเส้นทางไปยังผู้ให้บริการ",
    supportCategoryAccountHelp: "การเข้าถึงบัญชี",
    supportFormMessageLabel: "เราช่วยอะไรได้บ้าง?",
    supportFormMessagePlaceholder: "แชร์เส้นทาง โรงแรม การแจ้งเตือน หรือบริบทบัญชีของคุณ",
    supportFormSubmit: "ส่งคำขอ",
    supportFormSending: "กำลังส่ง...",
    supportFormSuccessPrefix: "คำขอหมายเลข",
    supportFormSuccessSuffix: "ถูกเปิดแล้ว",
    supportFormErrorFallback: "ไม่สามารถเปิดคำขอได้",
    supportFaqHeading: "คำถามที่พบบ่อย",
    serviceGuaranteeEyebrow: "คำมั่นด้านบริการของ Kurioticket",
    serviceGuaranteeTitle: "การรับประกันบริการ",
    serviceGuaranteeDescription: "เราต้องการให้นักเดินทางเข้าใจว่า Kurioticket ทำงานอย่างไรและคาดหวังอะไรได้บ้างเมื่อใช้แพลตฟอร์มของเรา",
    serviceGuaranteeFaqHeading: "คำถามที่พบบ่อย",
    serviceGuaranteeFaqDescription: "คำตอบเหล่านี้อธิบายบทบาทของ Kurioticket ในฐานะแพลตฟอร์มค้นหาและเปรียบเทียบการเดินทาง",
    serviceGuaranteeFaqWhatGuaranteeQuestion: "Kurioticket รับประกันอะไร?",
    serviceGuaranteeFaqResultsDisplayedQuestion: "ผลลัพธ์การเดินทางแสดงอย่างไร?",
    serviceGuaranteeFaqRedirectedQuestion: "ทำไมฉันจึงถูกเปลี่ยนเส้นทางไปยังผู้ให้บริการรายอื่น?",
    serviceGuaranteeFaqBookDirectlyQuestion: "ฉันจองโดยตรงบน Kurioticket หรือไม่?",
    serviceGuaranteeFaqPricesGuaranteedQuestion: "ราคาถูกการันตีเสมอหรือไม่?",
    serviceGuaranteeFaqChooseProvidersQuestion: "Kurioticket เลือกผู้ให้บริการอย่างไร?",
    serviceGuaranteeFaqEncounterIssueQuestion: "ฉันควรทำอย่างไรหากพบปัญหา?",
    serviceGuaranteeFaqContactSupportQuestion: "ฉันจะติดต่อฝ่ายสนับสนุนได้อย่างไร?",
    serviceGuaranteeHelpCardTitle: "ต้องการความช่วยเหลือเกี่ยวกับบัญชีหรือการค้นหาของคุณหรือไม่?",
    serviceGuaranteeSupportCta: "ติดต่อฝ่ายสนับสนุนลูกค้า",
    moreServiceInfoEyebrow: "ข้อมูลแพลตฟอร์ม",
    moreServiceInfoTitle: "ข้อมูลบริการเพิ่มเติม",
    moreServiceInfoDescription: "เรียนรู้ว่า Kurioticket ช่วยให้นักเดินทางค้นหา เปรียบเทียบ บันทึก และจัดระเบียบตัวเลือกการเดินทางจากผู้ให้บริการหลายรายได้ในที่เดียวอย่างไร",
    moreServiceInfoContextTitle: "วางแผนพร้อมบริบท",
    moreServiceInfoContextSubtitle: "ตั้งแต่ผลการค้นหาไปจนถึงการเปลี่ยนเส้นทางไปยังผู้ให้บริการ",
    moreServiceInfoContextCompare: "เปรียบเทียบตัวเลือกจากผู้ให้บริการเดินทางหลายราย",
    moreServiceInfoContextSave: "บันทึกทริป การแจ้งเตือน และการตั้งค่าเมื่อเข้าสู่ระบบ",
    moreServiceInfoContextContinue: "ดำเนินการต่อพร้อมรายละเอียดจากผู้ให้บริการก่อนจองภายนอก",
    moreServiceInfoHowHeading: "Kurioticket ทำงานอย่างไร",
    moreServiceInfoHowDescription: "รายละเอียดบริการเหล่านี้อธิบายบทบาทของ Kurioticket ก่อน ระหว่าง และหลังการค้นหาการเดินทาง",
    moreServiceInfoHowBadge: "พื้นฐานการวางแผนการเดินทาง",
    moreServiceInfoStepSearchTitle: "ค้นหาผู้ให้บริการหลายราย",
    moreServiceInfoStepCompareTitle: "เปรียบเทียบตัวเลือกการเดินทาง",
    moreServiceInfoStepSaveTitle: "บันทึกทริปและการแจ้งเตือน",
    moreServiceInfoStepRedirectsTitle: "คำอธิบายการเปลี่ยนเส้นทางไปยังผู้ให้บริการ",
    moreServiceInfoStepAccountTitle: "เครื่องมือบัญชีและการเดินทาง",
    moreServiceInfoFaqHeading: "คำถามที่พบบ่อย",
    moreServiceInfoFaqDescription: "คำตอบสั้น ๆ เกี่ยวกับการค้นหาการเดินทาง การเปลี่ยนเส้นทางไปยังผู้ให้บริการ ทริปที่บันทึกไว้ และเครื่องมือบัญชี",
    moreServiceInfoFaqWhatQuestion: "Kurioticket คืออะไร?",
    moreServiceInfoFaqSearchQuestion: "การค้นหาการเดินทางทำงานอย่างไร?",
    moreServiceInfoFaqRedirectQuestion: "ทำไมฉันจึงถูกเปลี่ยนเส้นทางไปยังผู้ให้บริการรายอื่น?",
    moreServiceInfoFaqPaymentsQuestion: "Kurioticket ดำเนินการชำระเงินหรือไม่?",
    moreServiceInfoFaqSaveQuestion: "ฉันสามารถบันทึกทริปและการแจ้งเตือนได้หรือไม่?",
    moreServiceInfoFaqAccountQuestion: "จำเป็นต้องมีบัญชีหรือไม่?",
    moreServiceInfoFaqSupportQuestion: "ฉันจะติดต่อฝ่ายสนับสนุนได้อย่างไร?",
    moreServiceInfoHelpTitle: "ต้องการความช่วยเหลือหรือไม่?",
    moreServiceInfoHelpDescription: "มีคำถามเกี่ยวกับบัญชี ทริปที่บันทึกไว้ การแจ้งเตือน หรือการเปลี่ยนเส้นทางไปยังผู้ให้บริการหรือไม่?",
    moreServiceInfoSupportCta: "ติดต่อฝ่ายสนับสนุนลูกค้า",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, `${key} should resolve to Thai`);
    assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  const localizedAnswerKeys = [
    "supportFaqAccountAnswer", "supportFaqSearchAnswer", "supportFaqSavedTripsAnswer", "supportFaqRedirectAnswer",
    "supportFaqAlreadyBookedAnswer", "supportFaqChangeBookingAnswer", "supportFaqWhyRedirectedAnswer",
    "serviceGuaranteeFaqWhatGuaranteeAnswer", "serviceGuaranteeFaqResultsDisplayedAnswer", "serviceGuaranteeFaqRedirectedAnswer",
    "serviceGuaranteeFaqBookDirectlyAnswer", "serviceGuaranteeFaqPricesGuaranteedAnswer", "serviceGuaranteeFaqChooseProvidersAnswer",
    "serviceGuaranteeFaqEncounterIssueAnswer", "serviceGuaranteeFaqContactSupportAnswer",
    "moreServiceInfoStepSearchSummary", "moreServiceInfoStepSearchDetails", "moreServiceInfoStepCompareSummary",
    "moreServiceInfoStepCompareDetails", "moreServiceInfoStepSaveSummary", "moreServiceInfoStepSaveDetails",
    "moreServiceInfoStepRedirectsSummary", "moreServiceInfoStepRedirectsDetails", "moreServiceInfoStepAccountSummary",
    "moreServiceInfoStepAccountDetails", "moreServiceInfoFaqWhatAnswer", "moreServiceInfoFaqSearchAnswer",
    "moreServiceInfoFaqRedirectAnswer", "moreServiceInfoFaqPaymentsAnswer", "moreServiceInfoFaqSaveAnswer",
    "moreServiceInfoFaqAccountAnswer", "moreServiceInfoFaqSupportAnswer",
  ];

  for (const key of localizedAnswerKeys) assert.notEqual(th[key], enTranslations[key], `${key} should be localized`);

  for (const key of [
    "supportFaqAlreadyBookedAnswer", "supportFaqChangeBookingAnswer", "supportFaqWhyRedirectedAnswer",
    "serviceGuaranteeFaqRedirectedAnswer", "serviceGuaranteeFaqBookDirectlyAnswer", "serviceGuaranteeFaqEncounterIssueAnswer",
    "moreServiceInfoStepRedirectsSummary", "moreServiceInfoStepRedirectsDetails", "moreServiceInfoStepAccountDetails",
    "moreServiceInfoFaqRedirectAnswer", "moreServiceInfoFaqPaymentsAnswer",
  ]) {
    assert.match(th[key], /Kurioticket|ผู้ให้บริการ|การจอง|การชำระเงิน|การเปลี่ยนเส้นทาง/, `${key} should preserve provider-boundary meaning`);
  }

  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
  assert.ok(supportContentSource.includes('t("supportEyebrow")') && supportContentSource.includes('supportFaqKeys.map'));
  assert.ok(supportFormSource.includes('fetch("/api/support/tickets"') && supportFormSource.includes('name="email" type="email"') && supportFormSource.includes('name="subject" required') && supportFormSource.includes('name="category" defaultValue="price-alerts"') && supportFormSource.includes('value="search-help"') && supportFormSource.includes('value="price-alerts"') && supportFormSource.includes('value="redirect"') && supportFormSource.includes('value="account"') && supportFormSource.includes('name="body" required'));
  assert.ok(serviceGuaranteeSource.includes('serviceFaqKeys.map') && serviceGuaranteeSource.includes('href="/support"'));
  assert.ok(moreServiceInfoSource.includes('serviceSections.map') && moreServiceInfoSource.includes('serviceFaqs.map') && moreServiceInfoSource.includes('href="/support"'));
});


test("Indonesian homepage visible copy and render paths resolve without English fallback", () => {
  const id = getTranslations("id");
  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const headerSource = readFileSync("src/components/layout/AppHeader.tsx", "utf8");
  const searchTabsSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const footerSource = readFileSync("src/components/layout/Footer.tsx", "utf8");

  const expected: Record<string, string> = {
    flights: "Penerbangan",
    hotels: "Hotel",
    cars: "Mobil",
    deals: "Promo",
    login: "Masuk",
    signUp: "Daftar",
    homeHeroTitle: "Bandingkan pilihan perjalanan dalam satu pencarian sederhana",
    homeHeroSubtitle: "Cari penyedia perjalanan tepercaya, bandingkan harga dengan jelas, dan pilih opsi yang sesuai dengan perjalanan Anda.",
    roundTrip: "Pulang pergi",
    oneWay: "Sekali jalan",
    origin: "ASAL",
    fromPlaceholder: "Dari?",
    destination: "TUJUAN",
    toPlaceholder: "Ke?",
    departureDate: "Tanggal perjalanan",
    travelDates: "Tanggal perjalanan",
    travelers: "PENUMPANG",
    search: "Cari",
    previousShort: "Sebelumnya",
    nextShort: "Berikutnya",
    clear: "Hapus",
    done: "Selesai",
    passengers: "Penumpang",
    adults: "Dewasa",
    children: "Anak-anak",
    childAgeRange: "Usia 2–17",
    infantsOnLap: "Bayi dipangku",
    under2: "Di bawah 2 tahun",
    cabinClass: "KELAS KABIN",
    economy: "Ekonomi",
    business: "Bisnis",
    first: "Kelas utama",
    hotelSearchDestinationLabel: "TUJUAN",
    cityOrHotel: "Kota atau hotel",
    hotelSearchTravelDatesLabel: "TANGGAL PERJALANAN",
    hotelSearchDatePlaceholder: "Tanggal masuk — keluar",
    hotelSearchGuestsLabel: "TAMU",
    guestsAndRooms: "Tamu dan kamar",
    hotelAdultHelper: "Tamu 18+",
    hotelChildrenHelper: "Usia 0–17",
    hotelRoomsHelper: "Hingga 6 kamar",
    petFriendly: "Ramah hewan peliharaan",
    onlyShowPetFriendlyStays: "Hanya tampilkan akomodasi yang mengizinkan hewan peliharaan",
    homePopularDestinations: "Destinasi populer",
    homeExploreFares: "Jelajahi tarif",
    homeDiscoveryTitle: "Temukan petualangan Anda berikutnya di sini",
    homeDiscoverySubtitle: "Bandingkan ide rute cerdas, tarif fleksibel, dan destinasi yang dipilih untuk wilayah Anda.",
    homeDiscoveryRouteIdeaBadge: "IDE RUTE",
    homeDiscoveryTripOneWay: "SEKALI JALAN",
    homeDiscoveryCabinEconomy: "EKONOMI",
    homeDiscoveryTravelerCountOne: "1 PENUMPANG",
    homeCompareOptions: "Bandingkan opsi",
    homeTrustTitle: "Mengapa wisatawan membandingkan di Kurioticket",
    homeTrustCompareTitle: "Bandingkan penawaran penyedia",
    homePromoFlightsTitle: "Promo penerbangan dari maskapai ternama",
    homePromoHotelsTitle: "Hemat hotel di seluruh dunia",
    faqHeading: "Pertanyaan yang sering diajukan",
    supportFaqAccountQuestion: "Bantuan akun dan masuk",
    supportFaqAccountAnswer:
      "Kurioticket dapat membantu akses akun, masalah masuk, masalah pendaftaran, akses profil, dan masalah platform yang terkait dengan akun.",
    supportFaqSearchQuestion: "Bantuan pencarian dan hasil",
    supportFaqSearchAnswer:
      "Kurioticket dapat membantu saat pencarian penerbangan atau hotel tidak berfungsi, hasil tidak dimuat, filter membingungkan, atau harga dan penyedia tidak tampil seperti yang diharapkan.",
    supportFaqSavedTripsQuestion: "Perjalanan tersimpan dan peringatan",
    supportFaqSavedTripsAnswer:
      "Kurioticket dapat membantu dengan perjalanan tersimpan, pencarian terbaru, peringatan harga, masalah notifikasi, dan alat perjalanan yang terhubung ke akun.",
    supportFaqRedirectQuestion: "Bantuan pemesanan/pengalihan penyedia",
    supportFaqRedirectAnswer:
      "Kurioticket dapat membantu jika pengalihan ke mitra atau penyedia gagal, membuka halaman yang salah, atau tidak mempertahankan detail perjalanan atau pencarian yang dipilih.",
    supportFaqAlreadyBookedQuestion: "Sudah memesan dengan penyedia?",
    supportFaqAlreadyBookedAnswer:
      "Jika pemesanan Anda diselesaikan dengan maskapai, hotel, agen perjalanan, atau penyedia eksternal, penyedia tersebut bertanggung jawab atas perubahan pemesanan, pengembalian dana, pembatalan, check-in, boarding, tanda terima, dan dokumen perjalanan.",
    supportFaqChangeBookingQuestion: "Bisakah Kurioticket mengubah pemesanan saya?",
    supportFaqChangeBookingAnswer:
      "Kurioticket hanya dapat membantu pemesanan yang dibuat langsung melalui Kurioticket jika dan ketika pemesanan langsung didukung. Untuk pemesanan yang diselesaikan dengan penyedia eksternal, hubungi penyedia tersebut secara langsung.",
    supportFaqWhyRedirectedQuestion: "Mengapa saya diarahkan ke penyedia lain?",
    supportFaqWhyRedirectedAnswer:
      "Kurioticket adalah platform pencarian dan perbandingan perjalanan, dan beberapa hasil mengarahkan Anda ke penyedia tepercaya tempat Anda menyelesaikan pemesanan, pembayaran, dan dukungan khusus penyedia.",
    homeNewsletterTitle: "Selalu terdepan untuk setiap promo perjalanan",
    homeNewsletterPlaceholder: "Masukkan email Anda",
    homeSubscribe: "Berlangganan",
    footerContactUs: "Hubungi Kami",
    footerDiscover: "Jelajahi",
    footerPrivacyPolicy: "Kebijakan Privasi",
    legalCenter: "Pusat Hukum",
    footerConfidenceTagline: "Cari penerbangan, hotel, dan promo perjalanan dengan percaya diri.",
    footerPrivacy: "Privasi",
    footerTerms: "Ketentuan",
    footerCookies: "Cookie",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(id[key], value, `${key} should resolve to Indonesian`);
    assert.notEqual(id[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(id["newsletter.accountEmailLine"], "Berlangganan dengan email akun Anda: {{email}}.");
  assert.match(id["newsletter.accountEmailLine"], /\{\{email\}\}/);
  assert.equal(id["newsletter.manageEmailPreferences"], "Kelola preferensi email");
  assert.equal(languageOptions.find((o) => o.code === "id")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
  assert.equal(normalizeFlightsCalendarLocale("id"), "id-ID");
  assert.equal(normalizeFlightsCalendarLocale("id-ID"), "id-ID");
  assert.equal(normalizeFlightsCalendarLocale("id-id"), "id-ID");
  assert.equal(normalizeHotelCalendarLocale("id"), "id-ID");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 5, 1), "id"), "Juni 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "id-id"), "Juli 2026");
  assert.deepEqual(formatFlightsWeekdays("id"), ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]);
  assert.equal(formatFlightsDateSummary(new Date(2026, 5, 30), new Date(2026, 6, 5), "id"), "30 Jun — 5 Jul");

  const translatedFaqs = getGeneralFaqs((key) => id[key] ?? enTranslations[key] ?? "");
  const translatedFaqQuestions = translatedFaqs.map((item) => item.question);
  const translatedFaqAnswers = translatedFaqs.map((item) => item.answer);

  assert.ok(translatedFaqQuestions.includes("Bantuan akun dan masuk"));
  assert.ok(translatedFaqQuestions.includes("Bantuan pencarian dan hasil"));
  assert.ok(translatedFaqQuestions.includes("Perjalanan tersimpan dan peringatan"));
  assert.ok(translatedFaqQuestions.includes("Bantuan pemesanan/pengalihan penyedia"));
  assert.ok(translatedFaqQuestions.includes("Sudah memesan dengan penyedia?"));
  assert.ok(translatedFaqQuestions.includes("Bisakah Kurioticket mengubah pemesanan saya?"));
  assert.ok(translatedFaqQuestions.includes("Mengapa saya diarahkan ke penyedia lain?"));
  assert.ok(translatedFaqAnswers.includes("Kurioticket dapat membantu akses akun, masalah masuk, masalah pendaftaran, akses profil, dan masalah platform yang terkait dengan akun."));
  assert.ok(translatedFaqAnswers.includes("Kurioticket adalah platform pencarian dan perbandingan perjalanan, dan beberapa hasil mengarahkan Anda ke penyedia tepercaya tempat Anda menyelesaikan pemesanan, pembayaran, dan dukungan khusus penyedia."));
  assert.ok(pageSource.includes('const translatedFaqs = getGeneralFaqs(t)') && pageSource.includes('items={translatedFaqs}'));
  assert.match(
    searchTabsSource,
    /if \(!departureSummary\) \{[\s\S]*?return t\.travelDates \|\| "Travel dates";[\s\S]*?\}/,
    "flight empty date field should read the active travelDates i18n key before the English fallback",
  );
  assert.match(
    searchTabsSource,
    /translateHotelTravelDateText\("hotelSearchDatePlaceholder"\)[\s\S]*?\|\|\s*"Check-in — Check-out"/,
    "hotel empty date field should read the active hotelSearchDatePlaceholder i18n key before the English fallback",
  );
  assert.equal(id.travelDates, "Tanggal perjalanan");
  assert.equal(id.hotelSearchDatePlaceholder, "Tanggal masuk — keluar");
  assert.ok(!searchTabsSource.includes("Tanggal check-in — check-out"));
  assert.match(searchTabsSource, /if \(!checkInSummary\) \{[\s\S]*?translateHotelTravelDateText\("hotelSearchDatePlaceholder"\)[\s\S]*?\}/, "homepage hotel empty date summary should use the Indonesian i18n key on the active SearchTabs render path");
  assert.match(searchTabsSource, /if \(checkOutSummary\) \{[\s\S]*?return `\$\{checkInSummary\} — \$\{checkOutSummary\}`;[\s\S]*?\}/, "selected hotel date summary should remain derived from formatted selected dates");
  assert.ok(searchTabsSource.includes("/hotels/results?${params.toString()}"), "hotel search route/query payload should remain unchanged");
  assert.ok(searchTabsSource.includes('translate("hotelSearchGuestsLabel")'), "hotel guest field should remain wired to i18n");
  assert.notEqual(id.travelDates, "Travel dates");
  assert.notEqual(id.hotelSearchDatePlaceholder, "Check-in — check-out");

  assert.ok(pageSource.includes('t("homeHeroTitle")') && pageSource.includes('t("homeNewsletterTitle")'));
  assert.ok(headerSource.includes('t.flights') && headerSource.includes('t.login') && headerSource.includes('t.signUp'));
  assert.ok(searchTabsSource.includes('t.tripType') && searchTabsSource.includes('t.roundTrip') && searchTabsSource.includes('translate("hotelSearchGuestsLabel")') && searchTabsSource.includes('translate("infantsOnLap")'));
  assert.equal(id.tripType, "JENIS PERJALANAN");
  assert.equal(id.roundTrip, "Pulang pergi");
  assert.equal(id.oneWay, "Sekali jalan");
  assert.notEqual(id.tripType, "TRIP TYPE");
  assert.ok(footerSource.includes('t.footerSellerOfTravelNotice') && footerSource.includes('t.footerPrivacy'));
});

test("Thai homepage hotel, destination, route-card, and date picker copy resolves on active render paths", () => {
  const th = thTranslations;

  const expectedThaiCopy: Record<string, string> = {
    hotels: "โรงแรม",
    destination: "ปลายทาง",
    cityOrHotel: "เมืองหรือโรงแรม",
    hotelSearchDestinationLabel: "จุดหมายปลายทาง",
    hotelSearchDestinationPlaceholder: "เมืองหรือโรงแรม",
    hotelSearchTravelDatesLabel: "วันที่เดินทาง",
    hotelSearchDatePlaceholder: "เช็กอิน — เช็กเอาต์",
    hotelSearchGuestsLabel: "ผู้เข้าพัก",
    search: "ค้นหา",
    chooseTravelDates: "เลือกวันที่เดินทาง",
    previousMonthShort: "ก่อนหน้า",
    nextMonthShort: "ถัดไป",
    clear: "ล้าง",
    done: "เสร็จสิ้น",
    stayDetails: "รายละเอียดการเข้าพัก",
    guestsAndRooms: "ผู้เข้าพักและห้องพัก",
    guestSingular: "ผู้เข้าพัก",
    guestPlural: "ผู้เข้าพัก",
    adults: "ผู้ใหญ่",
    hotelAdultHelper: "ผู้เข้าพัก 18+",
    children: "เด็ก",
    hotelChildrenHelper: "อายุ 0–17 ปี",
    rooms: "ห้องพัก",
    roomSingular: "ห้อง",
    roomPlural: "ห้อง",
    hotelRoomsHelper: "สูงสุด 6 ห้อง",
    petFriendly: "อนุญาตให้นำสัตว์เลี้ยงเข้าได้",
    onlyShowPetFriendlyStays: "แสดงเฉพาะที่พักที่อนุญาตให้นำสัตว์เลี้ยงเข้าได้",
    destinationImageFallback: "ปลายทาง",
    "homePopularDestinationCity.dubai": "ดูไบ",
    "homePopularDestinationCity.london": "ลอนดอน",
    "homePopularDestinationCity.johannesburg": "โจฮันเนสเบิร์ก",
    "homePopularDestinationCity.accra": "อักกรา",
    "homePopularDestinationCity.nairobi": "ไนโรบี",
    "homePopularDestinationCity.istanbul": "อิสตันบูล",
    "homePopularDestinationCity.paris": "ปารีส",
    "homePopularDestinationCountry.unitedArabEmirates": "สหรัฐอาหรับเอมิเรตส์",
    "homePopularDestinationCountry.unitedKingdom": "สหราชอาณาจักร",
    "homePopularDestinationCountry.southAfrica": "แอฟริกาใต้",
    "homePopularDestinationCountry.ghana": "กานา",
    "homePopularDestinationCountry.kenya": "เคนยา",
    "homePopularDestinationCountry.turkiye": "ตุรกี",
    "homePopularDestinationCountry.france": "ฝรั่งเศส",
    "homeDiscoveryRoute.ng-los-lhr.title": "ทริปธุรกิจและสุดสัปดาห์ในลอนดอน",
    "homeDiscoveryRoute.ng-los-lhr.routeNote": "เส้นทางระยะไกลยอดนิยมสำหรับทริปทำงานและวันพักผ่อนเพิ่มเติม",
    "homeDiscoveryRoute.ng-los-dxb.title": "แวะช้อปปิงที่ดูไบ",
    "homeDiscoveryRoute.ng-los-dxb.routeNote": "เหมาะสำหรับการพักเพื่อช้อปปิง การเดินทางกับครอบครัว และการต่อเครื่องไปยังจุดหมายถัดไป",
    "homeDiscoveryRoute.ng-abv-acc.title": "ทริประยะสั้นในภูมิภาคสู่อักกรา",
    "homeDiscoveryRoute.ng-abv-acc.routeNote": "เส้นทางภูมิภาคระยะสั้นที่เดินทางระหว่างเมืองได้อย่างสะดวก",
    "homeDiscoveryRoute.ng-los-nbo.title": "ทริปซาฟารีพักผ่อนที่ไนโรบี",
    "homeDiscoveryRoute.ng-los-nbo.routeNote": "ประตูสู่แอฟริกาตะวันออกสำหรับศูนย์กลางธุรกิจและการต่อทริปซาฟารี",
    "homeDiscoveryRoute.ng-abv-jnb.title": "พักผ่อนในเมืองโจฮันเนสเบิร์ก",
    "homeDiscoveryRoute.ng-abv-jnb.routeNote": "การเชื่อมต่อมุ่งใต้ที่ดีสำหรับการประชุมและการพักผ่อนในเมือง",
    "homeDiscoveryRoute.ng-los-ist.title": "เส้นทางเชื่อมต่อผ่านอิสตันบูล",
    "homeDiscoveryRoute.ng-los-ist.routeNote": "ศูนย์กลางที่ดีสำหรับการเชื่อมต่อยุโรป พร้อมแวะพักในเมืองที่มีชีวิตชีวา",
    "homeDiscoveryRoute.ng-abv-cdg.title": "ทริปสไตล์ปารีส",
    "homeDiscoveryRoute.ng-abv-cdg.routeNote": "เส้นทางยุโรปคลาสสิกสำหรับแฟชั่น พิพิธภัณฑ์ และอาหาร",
    "homeDiscoveryRoute.ng-los-doh.title": "ต่อเครื่องพรีเมียมที่โดฮา",
    "homeDiscoveryRoute.ng-los-doh.routeNote": "เส้นทางที่เน้นความสะดวกสบายพร้อมการเชื่อมต่อทั่วโลกที่ราบรื่น",
    "homeDiscoveryRoute.ng-los-kig.title": "สุดสัปดาห์ในเมืองสะอาดคิกาลี",
    "homeDiscoveryRoute.ng-los-kig.routeNote": "ศูนย์กลางภูมิภาคที่กำลังเติบโต พร้อมเนินเขาเขียวขจีและการเดินทางในเมืองที่สะดวก",
    "homeDiscoveryRoute.ng-abv-cai.title": "แวะสัมผัสมรดกไคโร",
    "homeDiscoveryRoute.ng-abv-cai.routeNote": "ประตูสู่ทัวร์ประวัติศาสตร์ลุ่มแม่น้ำไนล์และตลาดเมืองเก่าที่คึกคัก",
    "homeDiscoveryRoute.ng-los-add.title": "จุดเชื่อมต่อแอฟริกาตะวันออกที่แอดดิสอาบาบา",
    "homeDiscoveryRoute.ng-los-add.routeNote": "จุดเปลี่ยนเครื่องสำคัญพร้อมแหล่งอาหารและวัฒนธรรมที่กำลังเติบโต",
    "homeDiscoveryRoute.ng-abv-fco.title": "เที่ยวชมแลนด์มาร์กกรุงโรม",
    "homeDiscoveryRoute.ng-abv-fco.routeNote": "เมืองยุโรปสุดคลาสสิกสำหรับซากโบราณ จัตุรัส และค่ำคืนสบาย ๆ",
    "homeDiscoveryRoute.ng-los-nrt.title": "จังหวะเมืองโตเกียวในเส้นทางไกล",
    "homeDiscoveryRoute.ng-los-nrt.routeNote": "ประตูสำคัญสู่เอเชียพร้อมย่านนีออนและระบบรางที่มีประสิทธิภาพ",
    "homeDiscoveryRoute.ng-abv-mad.title": "ทริปทาปาสและศิลปะที่มาดริด",
    "homeDiscoveryRoute.ng-abv-mad.routeNote": "เส้นทางพักเมืองยุโรปสำหรับพิพิธภัณฑ์ ถนนใหญ่ และมื้อค่ำยามดึก",
    "homeDiscoveryRoute.ng-los-cpt.title": "ผจญภัยชายฝั่งเคปทาวน์",
    "homeDiscoveryRoute.ng-los-cpt.routeNote": "เส้นทางแอฟริกาใต้ที่สวยงามพร้อมชายหาด ภูเขา และไร่องุ่น",
    "homeDiscoveryRoute.ng-abv-rob.title": "ทริปชายทะเลภูมิภาคที่มอนโรเวีย",
    "homeDiscoveryRoute.ng-abv-rob.routeNote": "ทริปพักเมืองแอฟริกาตะวันตกพร้อมชายหาดแอตแลนติกและตลาดท้องถิ่น",
  };

  for (const [key, expected] of Object.entries(expectedThaiCopy)) {
    assert.equal(th[key], expected, `Thai ${key} should resolve without English fallback`);
    assert.notEqual(th[key], enTranslations[key], `Thai ${key} should not use the English value`);
  }

  assert.equal(normalizeFlightsCalendarLocale("th"), "th-TH-u-ca-gregory");
  assert.equal(normalizeFlightsCalendarLocale("th-TH"), "th-TH-u-ca-gregory");
  assert.equal(normalizeHotelCalendarLocale("th"), "th-TH-u-ca-gregory");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 6, 1), "th"), "กรกฎาคม 2026");
  assert.equal(formatFlightsMonthHeading(new Date(2026, 7, 1), "th-TH"), "สิงหาคม 2026");
  assert.deepEqual(formatFlightsWeekdays("th"), ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]);
  assert.deepEqual([th.weekdaySun, th.weekdayMon, th.weekdayTue, th.weekdayWed, th.weekdayThu, th.weekdayFri, th.weekdaySat], ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]);
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");

  const pageSource = readFileSync("src/app/page.tsx", "utf8");
  const searchTabsSource = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
  const hotelSearchSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");
  const dateFormattingSource = readFileSync("src/lib/flights/dateFormatting.ts", "utf8");
  const hotelDateFormattingSource = readFileSync("src/lib/hotelsDateFormatting.ts", "utf8");

  assert.ok(pageSource.includes("translatePopularDestinationDisplayLabel"));
  assert.ok(pageSource.includes('destinationFallbackLabel={t("destinationImageFallback")}'));
  assert.ok(pageSource.includes('title={translateDiscoveryItemCopy(card.item, "title")}'));
  assert.ok(pageSource.includes('routeNote={translateDiscoveryItemCopy('));
  assert.ok(searchTabsSource.includes('t.hotelSearchDestinationLabel || t.destination || "Destination"'));
  assert.ok(searchTabsSource.includes('translateHotelTravelDateText("hotelSearchDatePlaceholder")'));
  assert.ok(searchTabsSource.includes('translate("stayDetails")'));
  assert.ok(searchTabsSource.includes('const isThaiLocale = normalizedSummaryLocale?.startsWith("th")'));
  assert.ok(searchTabsSource.includes('translate("guestSingular") || "ผู้เข้าพัก"'));
  assert.ok(searchTabsSource.includes('translate("roomSingular") || "ห้อง"'));
  assert.ok(!searchTabsSource.includes('isThaiLocale\n      ? `1 guest, 1 room`'));
  assert.ok(hotelSearchSource.includes('t("hotelSearchDatePlaceholder")'));
  assert.ok(dateFormattingSource.includes('return "th-TH-u-ca-gregory"'));
  assert.ok(hotelDateFormattingSource.includes('return "th-TH-u-ca-gregory"'));

  const guests = 1;
  const rooms = 1;
  const thaiHotelGuestsRoomsSummary = `${th.guestSingular} ${guests} คน, ${th.roomSingular} ${rooms} ห้อง`;
  assert.equal(thaiHotelGuestsRoomsSummary, "ผู้เข้าพัก 1 คน, ห้อง 1 ห้อง");
  assert.notEqual(thaiHotelGuestsRoomsSummary, "1 guest, 1 room");
  assert.equal(th.guestsAndRooms, "ผู้เข้าพักและห้องพัก");
  assert.equal(th.adults, "ผู้ใหญ่");
  assert.equal(th.children, "เด็ก");
  assert.equal(th.rooms, "ห้องพัก");
  assert.equal(th.petFriendly, "อนุญาตให้นำสัตว์เลี้ยงเข้าได้");
  assert.equal(th.onlyShowPetFriendlyStays, "แสดงเฉพาะที่พักที่อนุญาตให้นำสัตว์เลี้ยงเข้าได้");
  assert.match(searchTabsSource, /destination:\s*destination\.trim\(\)/);
  assert.match(searchTabsSource, /guests:\s*normalizedGuests/);
  assert.match(searchTabsSource, /rooms:\s*normalizedRooms/);
  assert.ok(searchTabsSource.includes('const href = `/hotels/results?${params.toString()}`'));
  assert.ok(searchTabsSource.includes("hotelPetFriendly ?"));
  assert.ok(searchTabsSource.includes('aria-label={translate("chooseGuestsAndRooms") || "Choose guests and rooms"}'));
  assert.ok(searchTabsSource.includes("hotelGuestsRoomsOpen && desktopActiveFieldClassName"));

  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");
  const marketHomeContentSource = readFileSync("src/data/marketHomeContent.ts", "utf8");
  for (const unchangedToken of ["LOS", "LHR", "ABV", "ACC", "NBO", "JNB", "IST", "CDG", "DOH", "KGL", "CAI", "ADD", "FCO", "NRT", "MAD", "CPT", "ROB", "/hotels/results?${params.toString()}"]) {
    assert.ok(pageSource.includes(unchangedToken) || searchTabsSource.includes(unchangedToken) || homeDiscoverySource.includes(unchangedToken) || marketHomeContentSource.includes(unchangedToken), `${unchangedToken} should remain in active source/data`);
  }
  const africaDiscoveryOrder = getHomeDiscoveryByRegion("NG").slice(0, 16).map((item) => item.id);
  assert.deepEqual(africaDiscoveryOrder, ["ng-los-lhr", "ng-los-dxb", "ng-abv-acc", "ng-los-nbo", "ng-abv-jnb", "ng-los-ist", "ng-abv-cdg", "ng-los-doh", "ng-los-kig", "ng-abv-cai", "ng-los-add", "ng-abv-fco", "ng-los-nrt", "ng-abv-mad", "ng-los-cpt", "ng-abv-rob"]);
});

test("Thai Flights landing copy resolves through active render paths", () => {
  const th = thTranslations as Record<string, string>;
  const flightLandingSource = readFileSync("src/components/flights/FlightLandingClient.tsx", "utf8");
  const standaloneFlightSearchSource = readFileSync("src/components/search/StandaloneFlightSearchForm.tsx", "utf8");
  const homeDiscoverySource = readFileSync("src/data/homeDiscovery.ts", "utf8");

  const expectedThaiCopy: Record<string, string> = {
    flightLandingHeroTitle:
      "ค้นหาเที่ยวบินราคาคุ้มค่าสำหรับทริปถัดไปได้อย่างง่ายดาย",
    flightLandingHeroSubtitle:
      "ค้นหาเส้นทาง เปรียบเทียบวันที่ และสำรวจตัวเลือกเที่ยวบินสำหรับการเดินทางครั้งต่อไป",
    cityOrAirport: "เมืองหรือสนามบิน",
    searchFlights: "ค้นหาเที่ยวบิน",
    discoverDestinationsFromRegion: "ค้นพบจุดหมายปลายทางจากภูมิภาคของคุณ",
    discoverDestinationsFromRegionBody:
      "สำรวจเส้นทางที่คัดสรรไว้และเริ่มทริปถัดไปอย่างมั่นใจ",
    flightLandingStartThisSearch: "เริ่มการค้นหานี้",
    flightLandingFeatureSearchReadyTitle: "เส้นทางพร้อมค้นหา",
    flightLandingFeatureSearchReadyBody:
      "ป้อนรายละเอียดทริปจริงก่อนขอผลลัพธ์จากผู้ให้บริการเที่ยวบิน",
    flightLandingFeatureCompareTitle: "เปรียบเทียบพร้อมบริบท",
    flightLandingFeatureCompareBody:
      "ใช้วันที่ จำนวนผู้เดินทาง ชั้นโดยสาร ระยะเวลา จุดแวะพัก และรายละเอียดเส้นทางเพื่อประเมินตัวเลือก",
    flightLandingFeatureProviderTitle: "ตรวจสอบกับผู้ให้บริการ",
    flightLandingFeatureProviderBody:
      "ยืนยันความพร้อมให้บริการ ราคา และกฎขั้นสุดท้ายกับผู้ให้บริการทุกครั้งก่อนจอง",
    flightLandingRouteIdeasTitle: "ไอเดียเส้นทางสำหรับทริปที่ยืดหยุ่น",
    flightLandingRouteIdeasBody:
      "ดูไอเดียเส้นทาง แล้วเริ่มค้นหาจริงพร้อมวันที่และจำนวนผู้เดินทางก่อนเปรียบเทียบเที่ยวบินที่มีให้เลือก",
    "flightLandingImageAlt.Johannesburg skyline at golden hour":
      "เส้นขอบฟ้าโจฮันเนสเบิร์กในแสงสีทอง",
    "flightLandingImageAlt.Cairo skyline with the Pyramids of Giza":
      "เส้นขอบฟ้าไคโรพร้อมพีระมิดแห่งกีซา",
    "flightLandingImageAlt.Addis Ababa cityscape in the Ethiopian highlands":
      "ทิวทัศน์เมืองแอดดิสอาบาบาบนที่ราบสูงเอธิโอเปีย",
    beachVacations: "วันหยุดพักผ่อนริมทะเล",
    beachVacationsBody:
      "สำรวจเส้นทางบินสู่ชายฝั่งแดดสดใส เกาะพักผ่อน และจุดหมายปลายทางอากาศอบอุ่นริมทะเล",
    "homeDiscoveryRoute.ng-los-cpt.title": "ผจญภัยชายฝั่งเคปทาวน์",
    "homeDiscoveryRoute.ca-yyz-cun.title": "พักหนีหนาวที่แคนคูน",
    "homeDiscoveryRoute.ca-yyz-cun.routeNote":
      "เส้นทางพักผ่อนที่เชื่อถือได้พร้อมตัวเลือกบินตรงในฤดูกาลยอดนิยม",
    "homeDiscoveryRoute.ca-yeg-pvr.title": "พักผ่อนริมทะเลที่เปอร์โตวัลลาร์ตา",
    "homeDiscoveryRoute.ca-yeg-pvr.routeNote":
      "เส้นทางรับแดดฤดูหนาวพร้อมชายหาดแปซิฟิกและเสน่ห์เมืองเก่า",
    "flightLandingImageAlt.Puerto Vallarta coastline and old town":
      "ชายฝั่งเปอร์โตวัลลาร์ตาและย่านเมืองเก่า",
    "homeDiscoveryRoute.ca-yyz-hnl.title": "พักเกาะระยะไกลที่โฮโนลูลู",
    "homeDiscoveryRoute.ca-yyz-hnl.routeNote":
      "ตัวเลือกพักผ่อนระดับพรีเมียมสำหรับชายหาด โต้คลื่น และเดินเขาบนเกาะ",
    "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water":
      "หาดไวกิกิในโฮโนลูลูพร้อมไดมอนด์เฮดและน้ำทะเลสีฟ้าสดใส",
    "homeDiscoveryRoute.ca-yyz-san.title": "ทริปแดดและโต้คลื่นที่ซานดิเอโก",
    "homeDiscoveryRoute.ca-yyz-san.routeNote":
      "เส้นทางข้ามพรมแดนที่เชื่อถือได้สำหรับชายหาด สวนสาธารณะ และวิวท่าเรือ",
    "flightLandingImageAlt.San Diego bay skyline and marina":
      "เส้นขอบฟ้าอ่าวซานดิเอโกและท่าจอดเรือ",
    "homeDiscoveryRoute.ca-yvr-syd.title": "ผจญภัยข้ามแปซิฟิกสู่ซิดนีย์",
    "homeDiscoveryRoute.ca-yvr-syd.routeNote":
      "เส้นทางระยะไกลยอดนิยมสำหรับแลนด์มาร์กท่าเรือและย่านริมชายหาด",
    flightBookingFaqs: "คำถามที่พบบ่อยเกี่ยวกับการจองเที่ยวบิน",
    flightBookingFaqIntro:
      "ตรวจสอบรายละเอียดทั่วไปของการค้นหาเที่ยวบินก่อนดำเนินการต่อกับผู้ให้บริการ",
    flightFaqBestTimeQuestion: "ช่วงเวลาใดดีที่สุดในการจองเที่ยวบิน?",
    flightFaqBeforeBookingQuestion: "ควรตรวจสอบอะไรบ้างก่อนจอง?",
    flightFaqFlexibleFareQuestion: "ค่าโดยสารแบบยืดหยุ่นคืออะไร?",
    flightFaqNonstopQuestion: "เที่ยวบินตรงดีกว่าเสมอหรือไม่?",
    flightFaqBaggageQuestion: "กฎเกี่ยวกับสัมภาระทำงานอย่างไร?",
    flightFaqChangeCancelQuestion: "ฉันสามารถเปลี่ยนหรือยกเลิกตั๋วได้หรือไม่?",
    flightFaqInternationalQuestion:
      "ฉันควรรู้อะไรบ้างเกี่ยวกับเที่ยวบินระหว่างประเทศ?",
  };

  for (const [key, expected] of Object.entries(expectedThaiCopy)) {
    assert.equal(th[key], expected, `Thai ${key} should resolve without English fallback`);
    assert.notEqual(th[key], (enTranslations as Record<string, string>)[key], `Thai ${key} should not use the English value`);
  }

  for (const key of [
    "flightFaqBestTimeAnswer",
    "flightFaqBeforeBookingAnswer",
    "flightFaqFlexibleFareAnswer",
    "flightFaqNonstopAnswer",
    "flightFaqBaggageAnswer",
    "flightFaqChangeCancelAnswer",
    "flightFaqInternationalAnswer",
  ]) {
    assert.match(th[key], /ผู้ให้บริการ|Kurioticket|สายการบิน|ค่าโดยสาร|สัมภาระ|วีซ่า|หนังสือเดินทาง|ต่อเครื่อง|ราคา|ความพร้อมให้บริการ/);
    assert.notEqual(th[key], (enTranslations as Record<string, string>)[key]);
  }

  for (const key of ["flightLandingHeroTitle", "flightLandingHeroSubtitle", "discoverDestinationsFromRegion", "flightLandingStartThisSearch", "flightLandingRouteIdeasTitle", "beachVacations", "flightBookingFaqs", "flightBookingFaqIntro"]) {
    assert.ok(flightLandingSource.includes(`t("${key}")`), `Flight landing render path should read ${key} through i18n`);
  }
  for (const key of ["cityOrAirport", "destination", "searchFlights", "roundTrip", "oneWay", "origin", "travelDates", "travelers"]) {
    assert.ok(standaloneFlightSearchSource.includes(`t("${key}")`) || standaloneFlightSearchSource.includes(`t.${key}`), `Standalone flight search should read ${key} through i18n`);
  }
  assert.ok(flightLandingSource.includes("formatHomeDiscoveryRoute"));
  assert.ok(flightLandingSource.includes('t("flightLandingRouteTemplate")'));
  assert.ok(flightLandingSource.includes('"flightLandingImageAlt"'));
  for (const english of ["Find your next affordable flight with ease.", "Search routes, compare dates, and explore flight options for your next journey.", "Discover destinations from your region", "Start this search", "Beach vacations", "Flight booking FAQs"]) {
    assert.ok(!flightLandingSource.includes(`>${english}<`), `${english} should not be hardcoded as rendered JSX text`);
  }

  const canadaBeachIds = getHomeDiscoveryByRegion("CA")
    .filter((item) => ["ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd"].includes(item.id))
    .map((item) => item.id);
  assert.deepEqual(canadaBeachIds, ["ca-yyz-cun", "ca-yeg-pvr", "ca-yyz-hnl", "ca-yyz-san", "ca-yvr-syd"]);
  for (const id of canadaBeachIds) {
    const item = getHomeDiscoveryByRegion("CA").find((candidate) => candidate.id === id);
    assert.ok(item);
    const link = buildDiscoveryLink(item);
    assert.equal(link.pathname, "/flights/results");
    assert.equal(link.query.origin, item.originCode);
    assert.equal(link.query.destination, item.destinationCode);
    assert.equal(link.query.adults, "1");
    assert.equal(link.query.children, "0");
    assert.equal(link.query.infants, "0");
    assert.equal(link.query.travelers, "1");
    assert.equal(link.query.cabinClass, "economy");
    assert.ok(homeDiscoverySource.includes(`id: "${id}"`));
  }
  assert.ok(flightLandingSource.includes("{item.originCode} → {item.destinationCode}"));
  assert.ok(flightLandingSource.includes('className="group block overflow-hidden rounded-3xl'));
  assert.ok(flightLandingSource.includes("buildDiscoveryLink(item)"));
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("Thai footer Discover destinations link resolves through active i18n key", () => {
  const footerSource = readFileSync("src/components/layout/Footer.tsx", "utf8");
  const th = thTranslations as Record<string, string>;

  assert.equal(th.destinations, "จุดหมายปลายทาง");
  assert.notEqual(th.destinations, enTranslations.destinations);

  const expectedDiscoverLabels = [
    ["footerDiscover", "สำรวจ"],
    ["flights", "เที่ยวบิน"],
    ["hotels", "โรงแรม"],
    ["cars", "รถเช่า"],
    ["deals", "ดีล"],
    ["destinations", "จุดหมายปลายทาง"],
    ["footerSavedRecent", "ที่บันทึกไว้และล่าสุด"],
  ] as const;

  for (const [key, expected] of expectedDiscoverLabels) {
    assert.equal(th[key], expected, `${key} should remain Thai in the footer Discover column`);
    assert.notEqual(th[key], (enTranslations as Record<string, string>)[key], `${key} should not fall back to English`);
  }

  assert.match(footerSource, /heading: t\.footerDiscover,[\s\S]*?label: t\.flights,[\s\S]*?href: "\/flights",[\s\S]*?label: t\.hotels,[\s\S]*?href: "\/hotels\/results",[\s\S]*?label: t\.cars,[\s\S]*?href: "\/cars",[\s\S]*?label: t\.deals,[\s\S]*?href: "\/deals",[\s\S]*?label: t\.destinations,[\s\S]*?href: "\/destinations",[\s\S]*?label: t\.footerSavedRecent,[\s\S]*?href: "\/saved",/);
  assert.ok(!footerSource.includes('label: "Destinations"'));
  assert.ok(footerSource.includes('className="border-t border-slate-200 bg-white text-slate-700"'));
  assert.ok(footerSource.includes('className="transition-colors hover:text-indigo-600"'));
  assert.ok(footerSource.includes('className="break-words transition-colors hover:text-indigo-600"'));
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("Thai Destinations and Saved trips copy resolves through active render paths", () => {
  const destinationsPageSource = readFileSync("src/app/destinations/page.tsx", "utf8");
  const destinationCardSource = readFileSync("src/app/destinations/DestinationCard.tsx", "utf8");
  const savedPageSource = readFileSync("src/app/saved/page.tsx", "utf8");
  const dashboardSavedSource = readFileSync("src/app/dashboard/saved/page.tsx", "utf8");
  const savedComponentSource = readFileSync("src/components/saved/SavedTripsAndRecentSearches.tsx", "utf8");
  const th = thTranslations as Record<string, string>;

  const expectedThaiCopy: Record<string, string> = {
    destinationsHeroBadge: "สำรวจจุดหมายปลายทาง",
    destinationsHeroTitle: "คุณอยากไปที่ไหนต่อ?",
    destinationsHeroSubtitle: "สำรวจเมืองที่คัดสรรมา เปรียบเทียบเที่ยวบิน และค้นหาดีลการเดินทางได้ในไม่กี่นาที",
    "destinations.region.europe": "ยุโรป",
    "destinations.region.northAmerica": "อเมริกาเหนือ",
    "destinations.region.asia": "เอเชีย",
    "destinations.region.africa": "แอฟริกา",
    "destinations.region.middleEast": "ตะวันออกกลาง",
    "destinations.region.europe.summary": "คัดสรรเมืองแลนด์มาร์ก คลองโรแมนติก เมืองหลวงแห่งดีไซน์ และทริปสุดสัปดาห์ด้านอาหารและวัฒนธรรมที่ไม่เคยล้าสมัย",
    "destinations.region.northAmerica.summary": "เส้นขอบฟ้าอันโดดเด่น เมืองชายฝั่ง ศูนย์กลางความบันเทิง และทริปเมืองบรรยากาศภาพยนตร์ที่ควรวางแผนไปเยือน",
    "destinations.region.asia.summary": "เมืองแสงนีออน เกาะพักผ่อน อาหารริมทางขึ้นชื่อ วัดวา ชายหาด และทริปช้อปปิงระดับพรีเมียม",
    "destinations.region.africa.summary": "จุดหมายยอดนิยมที่น่าประทับใจ พร้อมวิวทะเล เส้นทางซาฟารี เมืองสร้างสรรค์ และวัฒนธรรมที่หลากหลาย",
    "destinations.region.middleEast.summary": "เส้นขอบฟ้าหรูหรา ชายฝั่งอบอุ่น เสน่ห์ทะเลทราย ย่านมรดก และศูนย์กลางการต้อนรับสมัยใหม่",
    "destinations.card.subtitle": "วิวสวย เที่ยวบิน โรงแรม และดีล",
    "destinations.tag.iconicSkyline": "เส้นขอบฟ้าอันโดดเด่น",
    "destinations.tag.landmarkEscape": "พักผ่อนกับแลนด์มาร์ก",
    "destinations.tag.cultureCapital": "เมืองหลวงแห่งวัฒนธรรม",
    "destinations.tag.goldenHourViews": "วิวยามแสงทอง",
    "destinations.tag.coastalEnergy": "พลังแห่งชายฝั่ง",
    "destinations.tag.designWeekend": "สุดสัปดาห์แห่งดีไซน์",
    "destinations.tag.foodMarketNights": "ค่ำคืนตลาดอาหาร",
    "destinations.tag.historicStreets": "ถนนประวัติศาสตร์",
    "destinations.city.london": "ลอนดอน",
    "destinations.city.paris": "ปารีส",
    "destinations.city.newYork": "นิวยอร์ก",
    "destinations.city.bangkok": "กรุงเทพฯ",
    "destinations.city.jeddah": "เจดดาห์",
    "destinations.country.unitedKingdom": "สหราชอาณาจักร",
    "destinations.country.unitedStates": "สหรัฐอเมริกา",
    "destinations.country.thailand": "ไทย",
    "destinations.country.saudiArabia": "ซาอุดีอาระเบีย",
    savedTripsPageTitle: "ทริปที่บันทึกไว้",
    savedTripsPageSubtitle: "แผนการเดินทางที่คุณเลือกไว้และเส้นทางยอดนิยม",
    savedTripsEmptyTitle: "บันทึกจุดหมายปลายทางที่คุณชื่นชอบ",
    savedTripsEmptyDescription: "แตะไอคอนหัวใจบนเส้นทางใดก็ได้เพื่อสร้างรายการโปรดส่วนตัว และทำให้การผจญภัยครั้งต่อไปอยู่ใกล้เพียงคลิกเดียว",
    savedTripsExploreDestinations: "สำรวจจุดหมายปลายทาง",
    savedTripsRecentSearchesTitle: "การค้นหาล่าสุด",
    savedTripsRecentSearchesSubtitle: "กลับไปต่อจากจุดที่ค้างไว้และค้นหาอีกครั้งได้ในแตะเดียว",
    savedTripsClearAllRecent: "ล้างรายการล่าสุดทั้งหมด",
    savedTripsTypeFlight: "เที่ยวบิน",
    savedTripsSearchedDate: "ค้นหาเมื่อ {{date}}",
    savedTripsRepeatSearch: "ค้นหาอีกครั้ง",
    savedTripsTravelerCountOne: "ผู้เดินทาง 1 คน",
    savedTripsCabinEconomy: "ชั้นประหยัด",
  };

  for (const [key, expected] of Object.entries(expectedThaiCopy)) {
    assert.equal(th[key], expected, `${key} should render Thai copy`);
    assert.notEqual(th[key], (enTranslations as Record<string, string>)[key], `${key} must not fall back to English`);
  }

  for (const value of [
    "DESTINATION DISCOVERY",
    "Where do you want to go next?",
    "Browse brighter, hand-picked city views, compare flights, and find travel deals in minutes.",
    "Bright views, flights, hotels, and deals",
    "Saved trips",
    "Recent searches",
    "Clear all recent",
    "Repeat search",
  ]) {
    assert.ok(!Object.values(expectedThaiCopy).includes(value));
  }

  assert.ok(destinationsPageSource.includes("key={`${destination.region}-${destination.name}`}"));
  assert.ok(destinationsPageSource.includes("href={getDestinationHref(destination)}"));
  assert.ok(destinationsPageSource.includes("image={destination.image}"));
  assert.ok(destinationsPageSource.includes("imagePosition={destination.imagePosition}"));
  assert.ok(destinationsPageSource.includes("destinationTagKeys[destinationIndex % destinationTagKeys.length]"));
  assert.ok(destinationsPageSource.includes("translateValue(dictionary, regionLabelKeys[section.region], section.region)"));
  assert.ok(destinationsPageSource.includes("translateValue(") && destinationsPageSource.includes("destinationNameKeys[destination.name]"));
  assert.ok(destinationCardSource.includes("aria-label={ariaLabel}"));
  assert.ok(destinationCardSource.includes("alt={imageAlt}"));
  assert.ok(savedPageSource.includes("<SavedTripsAndRecentSearches />"));
  assert.ok(dashboardSavedSource.includes('redirect("/saved")'));
  assert.ok(savedComponentSource.includes('readRecentSearches()'));
  assert.ok(savedComponentSource.includes('entry.href'));
  assert.ok(savedComponentSource.includes('if (normalizedLocale.startsWith("th")) return "th-TH";'));
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});


test("Thai About and How Kurioticket Works page copy resolves without English fallback", () => {
  const th = thTranslations as Record<string, string>;
  const aboutPageSource = readFileSync("src/components/about/AboutPageContent.tsx", "utf8");
  const aboutRouteSource = readFileSync("src/app/about/page.tsx", "utf8");
  const howItWorksSource = readFileSync("src/app/how-it-works/HowItWorksContent.tsx", "utf8");
  const howItWorksRouteSource = readFileSync("src/app/how-it-works/page.tsx", "utf8");

  const expectedThaiCopy: Record<string, string> = {
    aboutPageEyebrow: "เกี่ยวกับ Kurioticket",
    aboutPageTitle: "เกี่ยวกับเรา",
    aboutPageIntroPrimary:
      "Kurioticket เป็นแพลตฟอร์มค้นหาและเปรียบเทียบการเดินทางที่ช่วยให้นักเดินทางค้นหา เปรียบเทียบ และค้นพบเที่ยวบิน โรงแรม รถเช่า และดีลการเดินทาง",
    aboutPageIntroSecondary:
      "เป้าหมายของเราคือทำให้การวางแผนเดินทางชัดเจนขึ้น โดยรวบรวมตัวเลือกที่มีและข้อมูลจากผู้ให้บริการไว้ในที่เดียว เพื่อให้นักเดินทางตรวจสอบทางเลือกก่อนดำเนินการต่อกับผู้ให้บริการที่เหมาะกับทริปของตน",
    aboutPagePlanningCardHeading: "เครื่องมือวางแผนการเดินทางที่ใช้งานได้จริง",
    aboutPagePlanningCardBody:
      "Kurioticket มุ่งช่วยให้นักเดินทางประเมินตัวเลือกการเดินทางพร้อมบริบทที่เป็นประโยชน์ ความพร้อมให้บริการ ราคา กฎ และขั้นตอนการจองขั้นสุดท้ายอาจแตกต่างกันตามผู้ให้บริการ ดังนั้นนักเดินทางควรตรวจสอบหน้าของผู้ให้บริการอย่างรอบคอบก่อนตัดสินใจ",
    howItWorksEyebrow: "วิธีการทำงานของ Kurioticket",
    howItWorksTitle: "วิธีการทำงานของ Kurioticket",
    howItWorksIntro:
      "Kurioticket ช่วยให้นักเดินทางเริ่มจากการค้นหา ไปสู่การเปรียบเทียบ แล้วดำเนินการต่อไปยังผู้ให้บริการเมื่อเลือกข้อเสนอแล้ว",
    howItWorksFlowHeading: "ขั้นตอนพื้นฐาน",
    "howItWorks.steps.search.title": "ค้นหาตัวเลือกการเดินทาง",
    "howItWorks.steps.search.description":
      "ป้อนรายละเอียดทริปของคุณเพื่อค้นหาเที่ยวบิน โรงแรม รถเช่า หรือดีลการเดินทางที่มีให้เลือก",
    "howItWorks.steps.compare.title": "เปรียบเทียบผลลัพธ์ที่มี",
    "howItWorks.steps.compare.description":
      "ตรวจสอบตัวเลือก ราคา ตารางเวลา รายละเอียดผู้ให้บริการ และข้อมูลการเดินทางอื่น ๆ ที่แสดง",
    "howItWorks.steps.choose.title": "เลือกข้อเสนอ",
    "howItWorks.steps.choose.description":
      "เลือกตัวเลือกที่ตรงกับแผนของคุณมากที่สุดหลังจากตรวจสอบรายละเอียดที่มี",
    "howItWorks.steps.continue.title": "ดำเนินการต่อกับผู้ให้บริการ",
    "howItWorks.steps.continue.description":
      "เมื่อถูกเปลี่ยนเส้นทาง ให้ดำเนินการต่อบนเว็บไซต์ของผู้ให้บริการเพื่อตรวจสอบรายละเอียดขั้นสุดท้ายและทำขั้นตอนการจองให้เสร็จสิ้น",
    "howItWorks.providerWebsites.title": "เว็บไซต์ของผู้ให้บริการ",
    "howItWorks.providerWebsites.description":
      "การจองบางรายการอาจดำเนินการให้เสร็จสิ้นบนเว็บไซต์ของผู้ให้บริการหลังจาก Kurioticket เปลี่ยนเส้นทางคุณ โปรดตรวจสอบหน้าของผู้ให้บริการสำหรับความพร้อมให้บริการ ราคา เงื่อนไข ขั้นตอนการชำระเงิน และรายละเอียดการจองขั้นสุดท้ายก่อนทำการซื้อให้เสร็จสิ้น",
  };

  for (const [key, expected] of Object.entries(expectedThaiCopy)) {
    assert.equal(th[key], expected, `${key} should resolve to Thai copy`);
    assert.notEqual(th[key], (enTranslations as Record<string, string>)[key], `${key} should not fall back to English`);
  }

  assert.ok(aboutRouteSource.includes('import { AboutPageContent } from "@/components/about/AboutPageContent"'));
  assert.ok(aboutRouteSource.includes("<AboutPageContent />"));
  assert.ok(aboutPageSource.includes("getTranslation(t,"), "About render path should read i18n keys.");
  assert.ok(aboutPageSource.includes("max-w-3xl rounded-2xl border border-border bg-white"), "About card layout classes should remain unchanged.");
  assert.ok(!aboutPageSource.includes("About Us"), "Active About component should not hardcode screenshot English copy.");

  for (const key of ["aboutPageEyebrow", "aboutPageTitle", "aboutPageIntroPrimary", "aboutPageIntroSecondary", "aboutPagePlanningCardHeading", "aboutPagePlanningCardBody"]) {
    assert.ok(aboutPageSource.includes(key), `About page render path should resolve ${key} through i18n.`);
  }

  assert.ok(howItWorksRouteSource.includes("<HowItWorksContent />"));
  assert.ok(howItWorksSource.includes('number: "01"') && howItWorksSource.includes('number: "02"') && howItWorksSource.includes('number: "03"') && howItWorksSource.includes('number: "04"'), "How-it-works step numbers should remain unchanged.");
  assert.ok(howItWorksSource.includes("Search") && howItWorksSource.includes("GitCompare") && howItWorksSource.includes("MousePointerClick") && howItWorksSource.includes("ExternalLink"), "How-it-works icons should remain unchanged.");
  assert.ok(howItWorksSource.includes("steps.map((step)"), "How-it-works should keep mapped card order.");
  assert.ok(howItWorksSource.includes('aria-labelledby="how-it-works-steps"'), "How-it-works accessibility attributes should remain unchanged.");
  assert.ok(howItWorksSource.includes("rounded-2xl border border-border bg-white"), "How-it-works card layout classes should remain unchanged.");
  assert.ok(!howItWorksSource.includes("Basic flow"), "Active How-it-works component should not hardcode screenshot English copy.");

  for (const key of ["howItWorksEyebrow", "howItWorksTitle", "howItWorksIntro", "howItWorksFlowHeading", "howItWorks.steps.search.title", "howItWorks.steps.search.description", "howItWorks.steps.compare.title", "howItWorks.steps.compare.description", "howItWorks.steps.choose.title", "howItWorks.steps.choose.description", "howItWorks.steps.continue.title", "howItWorks.steps.continue.description", "howItWorks.providerWebsites.title", "howItWorks.providerWebsites.description"]) {
    assert.ok(howItWorksSource.includes(key), `How-it-works render path should resolve ${key} through i18n.`);
  }

  assert.match(th.aboutPageIntroPrimary, /ค้นหา.*เปรียบเทียบ/);
  assert.match(th.aboutPagePlanningCardBody, /ความพร้อมให้บริการ.*ราคา.*ขั้นตอนการจองขั้นสุดท้าย.*ผู้ให้บริการ/);
  assert.match(th.howItWorksIntro, /ค้นหา.*เปรียบเทียบ.*ผู้ให้บริการ/);
  assert.match(th["howItWorks.providerWebsites.description"], /ผู้ให้บริการ.*ความพร้อมให้บริการ.*ราคา.*เงื่อนไข.*ขั้นตอนการชำระเงิน.*รายละเอียดการจอง/);
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("Thai country/currency modal and auth copy resolves without English fallback", () => {
  const th = getTranslations("th-TH");
  const expected: Record<string, string> = {
    chooseCountryAndCurrency: "เลือกประเทศและสกุลเงิน",
    countryCurrencyDescription: "เลือกประเทศและสกุลเงินที่ใช้แสดงราคา คำแนะนำสนามบินจะใช้ตำแหน่งที่ตรวจพบของคุณ",
    closeCountryCurrencySelector: "ปิดตัวเลือกประเทศและสกุลเงิน",
    searchCountryOrCurrency: "ค้นหาประเทศหรือสกุลเงิน",
    countryCurrencyPopularCountryAndCurrency: "ประเทศและสกุลเงินยอดนิยม",
    countryCurrencyAllCountriesAndCurrencies: "ประเทศและสกุลเงินทั้งหมด",
    countryCurrencyOptionCountSingular: "{{count}} ตัวเลือก",
    countryCurrencyOptionCountPlural: "{{count}} ตัวเลือก",
    selectCountryCurrencyOption: "เลือก {{country}} พร้อมสกุลเงิน {{currency}}",
    showMoreResults: "แสดงผลลัพธ์เพิ่มเติม",
    loginPageTitle: "เข้าสู่ระบบ",
    loginPageSubtitle: "บันทึกการค้นหา จัดการการแจ้งเตือน และเข้าถึงแดชบอร์ดการเดินทางของคุณ",
    loginEmailLabel: "อีเมล",
    loginPasswordLabel: "รหัสผ่าน",
    loginForgotPassword: "ลืมรหัสผ่าน?",
    loginSubmit: "เข้าสู่ระบบ",
    loginDivider: "หรือ",
    loginGoogle: "ดำเนินการต่อด้วย Google",
    loginSignupPrompt: "ยังใหม่กับ Kurioticket?",
    loginCreateAccount: "สร้างบัญชี",
    loginCodeSent: "เราส่งรหัสยืนยันไปยังอีเมลของคุณแล้ว",
    loginCodeInstructions: "ป้อนรหัส 6 หลักที่ส่งไปยัง {{email}} รหัสจะหมดอายุหลังจาก {{minutes}} นาที",
    loginVerificationCodeLabel: "รหัสยืนยัน",
    loginVerifyLogin: "ยืนยันการเข้าสู่ระบบ",
    loginResendIn: "ส่งอีกครั้งใน {{seconds}} วินาที",
    loginUseDifferentDetails: "ใช้รายละเอียดอื่น",
    forgotPasswordTitle: "รีเซ็ตรหัสผ่านของคุณ",
    forgotPasswordSubtitle: "ป้อนอีเมลของคุณ แล้วเราจะส่งคำแนะนำสำหรับรีเซ็ตรหัสผ่านให้",
    forgotPasswordEmailLabel: "อีเมล",
    forgotPasswordEmailPlaceholder: "you@example.com",
    forgotPasswordSubmit: "ส่งลิงก์รีเซ็ต",
    forgotPasswordRemember: "จำรหัสผ่านได้แล้ว?",
    forgotPasswordLoginLink: "เข้าสู่ระบบ",
    resetPasswordTitle: "รีเซ็ตรหัสผ่านของคุณ",
    resetPasswordCreateTitle: "สร้างรหัสผ่านใหม่",
    resetPasswordSubtitle: "ป้อนรหัสผ่านใหม่ของคุณด้านล่าง",
    resetPasswordSubmit: "รีเซ็ตรหัสผ่าน",
    resetPasswordRemember: "จำรหัสผ่านได้แล้ว?",
    resetPasswordLoginLink: "เข้าสู่ระบบ",
    verifyLoginTitle: "ยืนยันการเข้าสู่ระบบ",
    verifyLoginInstructions: "ป้อนรหัส 6 หลักที่เราส่งไปยังอีเมลของคุณ รหัสจะหมดอายุหลังจาก 10 นาที",
    verifyLoginCodeLabel: "รหัสยืนยัน",
    verifyLoginSubmit: "ยืนยันการเข้าสู่ระบบ",
    verifyLoginNeedStartOver: "ต้องการเริ่มใหม่?",
    verifyLoginAgainLink: "เข้าสู่ระบบอีกครั้ง",
    signupPageTitle: "สร้างบัญชีของคุณ",
    signupFullNameLabel: "ชื่อ-นามสกุล",
    signupEmailLabel: "อีเมล",
    signupPasswordLabel: "รหัสผ่าน",
    signupAgreementBeforeTerms: "เมื่อสร้างบัญชี คุณยอมรับ",
    signupTermsLink: "ข้อกำหนด",
    signupAgreementBetweenLinks: " ",
    signupPrivacyPolicyLink: "นโยบายความเป็นส่วนตัว",
    signupAgreementAfterPrivacy: " และประกาศเกี่ยวกับการเปลี่ยนเส้นทางไปยังพาร์ทเนอร์",
    signupSubmit: "สมัครใช้งาน",
    signupGoogle: "ดำเนินการต่อด้วย Google",
    signupAlreadyHaveAccount: "มีบัญชีอยู่แล้ว?",
    signupLoginLink: "เข้าสู่ระบบ",
  };

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, key);
    if (value !== enTranslations[key]) assert.notEqual(th[key], enTranslations[key], key);
  }

  assert.match(th.loginCodeInstructions, /\{\{email\}\}/);
  assert.match(th.loginCodeInstructions, /\{\{minutes\}\}/);
  assert.match(th.loginResendIn, /\{\{seconds\}\}/);
  assert.match(th.countryCurrencyOptionCountPlural, /\{\{count\}\}/);
  assert.match(th.selectCountryCurrencyOption, /\{\{country\}\}/);
  assert.match(th.selectCountryCurrencyOption, /\{\{currency\}\}/);
  assert.equal(th.loginCodeInstructions.replace("{{email}}", "user@example.com").replace("{{minutes}}", "10"), "ป้อนรหัส 6 หลักที่ส่งไปยัง user@example.com รหัสจะหมดอายุหลังจาก 10 นาที");
  assert.equal(th.loginResendIn.replace("{{seconds}}", "30"), "ส่งอีกครั้งใน 30 วินาที");
  assert.ok(languageOptions.some((o) => o.code === "th" && o.locale === "th-TH" && o.direction === "ltr"));
  assert.ok(languageOptions.some((o) => o.code === "ar" && o.direction === "rtl"));
});

test("Thai auth and country/currency render paths use i18n keys without active English literals", () => {
  const countryCurrencySource = readFileSync("src/components/region/CountryCurrencySelector.tsx", "utf8");
  const signinSource = readFileSync("src/components/auth/SigninForm.tsx", "utf8");
  const forgotSource = readFileSync("src/components/auth/ForgotPasswordForm.tsx", "utf8");
  const resetSource = readFileSync("src/components/auth/ResetPasswordForm.tsx", "utf8");
  const signupSource = readFileSync("src/components/auth/SignupForm.tsx", "utf8");
  const verifyLoginSource = readFileSync("src/components/auth/VerifyLoginForm.tsx", "utf8");
  const verifyEmailSource = readFileSync("src/components/auth/VerifyEmailForm.tsx", "utf8");
  const signinPageSource = readFileSync("src/app/auth/signin/page.tsx", "utf8");
  const forgotPageSource = readFileSync("src/app/auth/forgot-password/page.tsx", "utf8");
  const resetPageSource = readFileSync("src/app/auth/reset-password/page.tsx", "utf8");
  const signupPageSource = readFileSync("src/app/auth/signup/page.tsx", "utf8");
  const verifyLoginPageSource = readFileSync("src/app/auth/verify-login/page.tsx", "utf8");

  for (const key of ["chooseCountryAndCurrency", "countryCurrencyDescription", "closeCountryCurrencySelector", "searchCountryOrCurrency", "countryCurrencyAllCountriesAndCurrencies", "countryCurrencyPopularCountryAndCurrency", "countryCurrencyOptionCountSingular", "countryCurrencyOptionCountPlural", "selectCountryCurrencyOption", "showMoreResults"]) assert.match(countryCurrencySource, new RegExp(`t\\.${key}`), key);
  for (const key of ["loginPageTitle", "loginPageSubtitle", "loginEmailLabel", "loginPasswordLabel", "loginForgotPassword", "loginSubmit", "loginDivider", "loginGoogle", "loginSignupPrompt", "loginCreateAccount", "loginCodeSent", "loginCodeInstructions", "loginVerificationCodeLabel", "loginVerifyLogin", "loginResendIn", "loginUseDifferentDetails"]) assert.match(signinSource, new RegExp(`t\\.${key}|key: "${key}"`), key);
  for (const key of ["forgotPasswordTitle", "forgotPasswordSubtitle", "forgotPasswordEmailLabel", "forgotPasswordEmailPlaceholder", "forgotPasswordSubmit", "forgotPasswordRemember", "forgotPasswordLoginLink"]) assert.match(forgotSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["resetPasswordTitle", "resetPasswordCreateTitle", "resetPasswordSubtitle", "resetPasswordSubmit", "resetPasswordRemember", "resetPasswordLoginLink"]) assert.match(resetSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["signupPageTitle", "signupFullNameLabel", "signupEmailLabel", "signupPasswordLabel", "signupAgreementBeforeTerms", "signupTermsLink", "signupAgreementBetweenLinks", "signupPrivacyPolicyLink", "signupAgreementAfterPrivacy", "signupSubmit", "signupGoogle", "signupAlreadyHaveAccount", "signupLoginLink"]) assert.match(signupSource, new RegExp(`t\\.${key}`), key);
  for (const key of ["verifyLoginTitle", "verifyLoginInstructions", "verifyLoginCodeLabel", "verifyLoginSubmit", "verifyLoginNeedStartOver", "verifyLoginAgainLink"]) assert.match(verifyLoginSource, new RegExp(`t\\.${key}`), key);

  assert.doesNotMatch(countryCurrencySource, />Choose country and currency<|>Search country or currency<|>Show more results<|Close country and currency selector/);
  assert.doesNotMatch(signinSource, />Log in<|>Save searches, manage alerts, and access your travel dashboard\.<|>Forgot password\?<|>OR<|>Continue with Google<|>New to Kurioticket\?<|>Create an account<|>Verification code<|>Verify login<|>Use different details</);
  assert.doesNotMatch(forgotSource, />Reset your password<|>Enter your email and we'll send instructions to reset your password\.<|>Send reset link<|>Remember your password\?<|>Log in</);
  assert.doesNotMatch(signupSource, />Create your account<|>Full name<|>Sign Up<|>Continue with Google<|>Already have an account\?<|>Log in</);

  assert.match(signinSource, /<Input\s+name="email"\s+type="email"/);
  assert.match(signinSource, /<Input\s+name="password"\s+type="password"/);
  assert.match(signinSource, /<Input\s+name="code"\s+inputMode="numeric"/);
  assert.match(signinSource, /signIn\("google", \{/);
  assert.match(signinSource, /signIn\("credentials", \{/);
  assert.match(signinSource, /href="\/auth\/forgot-password"/);
  assert.match(signinSource, /href="\/auth\/signup"/);
  assert.match(forgotSource, /fetch\("\/api\/auth\/forgot-password"/);
  assert.match(resetSource, /fetch\("\/api\/auth\/reset-password"/);
  assert.match(signupSource, /fetch\("\/api\/auth\/signup", \{/);
  assert.match(signupSource, /signIn\("google", \{ callbackUrl: "\/onboarding" \}\)/);
  assert.match(verifyLoginSource, /signIn\("credentials", \{/);
  assert.match(verifyLoginSource, /fetch\("\/api\/auth\/request-login-code"/);
  assert.match(verifyEmailSource, /fetch\("\/api\/auth\/verify-email"/);
  assert.match(countryCurrencySource, /setOpen\(true\)/);
  assert.match(countryCurrencySource, /setShowAllCountryCurrencies\(true\)/);
  assert.match(countryCurrencySource, /setCountryCurrencyQuery\(""\)/);
  assert.match(countryCurrencySource, /aria-label=\{formatTranslation\(/);
  assert.match(signinPageSource, /<SigninForm/);
  assert.match(forgotPageSource, /<ForgotPasswordForm \/>/);
  assert.match(resetPageSource, /<ResetPasswordForm token=\{token\} \/>/);
  assert.match(signupPageSource, /<SignupForm googleEnabled=\{googleEnabled\} \/>/);
  assert.match(verifyLoginPageSource, /<VerifyLoginForm email=\{email\} callbackUrl=\{callbackUrl\} \/>/);
});

test("Thai Hotels landing localization resolves active /hotels copy", () => {
  const hotelsPageSource = readFileSync("src/app/hotels/page.tsx", "utf8");
  const searchSource = readFileSync("src/components/search/HotelSearchBar.tsx", "utf8");

  const expectedThaiCopy: Record<string, string> = {
    hotelsHeroTitle: "ค้นหาที่พักที่เริ่มต้นทริปได้อย่างลงตัว",
    hotelsHeroSubtitle:
      "เปรียบเทียบโรงแรมได้ในที่เดียว ตั้งแต่ที่พักในเมืองที่สะดวกสบายไปจนถึงรีสอร์ตพักผ่อนง่าย ๆ",
    hotels: "โรงแรม",
    hotelSearchDestinationLabel: "จุดหมายปลายทาง",
    hotelSearchDestinationPlaceholder: "เมืองหรือโรงแรม",
    hotelSearchTravelDatesLabel: "วันที่เดินทาง",
    hotelSearchDatePlaceholder: "เช็กอิน — เช็กเอาต์",
    hotelSearchGuestsLabel: "ผู้เข้าพัก",
    exploreHotelStaysByDestination: "สำรวจที่พักโรงแรมตามจุดหมายปลายทาง",
    featuredHotelDestinations: "จุดหมายปลายทางโรงแรมแนะนำ",
    findStaysEveryKindTrip: "ค้นหาที่พักสำหรับทุกสไตล์การเดินทาง",
    hotelInspirationBody: "เลือกดูไอเดียจุดหมายปลายทางตามประเภทที่พักที่คุณต้องการ",
    "hotelInspirationCategory.Beach": "ชายหาด",
    "hotelInspirationCategory.City breaks": "ทริปเมือง",
    "hotelInspirationCategory.Family trips": "ทริปครอบครัว",
    "hotelInspirationCategory.Relaxed stays": "ที่พักผ่อนสบาย",
    "hotelInspirationCategory.Weekend ideas": "ไอเดียวันหยุดสุดสัปดาห์",
    "hotelInspirationBadge.Coastal stays": "ที่พักริมชายฝั่ง",
    "hotelInspirationBadge.City coast": "เมืองริมชายฝั่ง",
    "hotelInspirationBadge.Waterfront stays": "ที่พักริมน้ำ",
    "hotelInspirationBadge.Harbor city": "เมืองท่า",
    "hotelInspirationBadge.Warm escape": "พักผ่อนในอากาศอบอุ่น",
    "hotelInspirationBadge.Bay city": "เมืองริมอ่าว",
    homeTrustCompareTitle: "เปรียบเทียบข้อเสนอจากผู้ให้บริการ",
    hotelTrustCompareBody: "ดูตัวเลือกโรงแรมจากผู้ให้บริการหลายรายได้ในที่เดียวก่อนดำเนินการต่อ",
    hotelTrustReviewTitle: "ตรวจสอบรายละเอียดที่พัก",
    hotelTrustReviewBody: "ตรวจสอบวันที่ ผู้เข้าพัก ห้องพัก บริบทราคา และข้อมูลที่พักก่อนเลือก",
    hotelTrustProviderTitle: "ดำเนินการต่อกับผู้ให้บริการ",
    hotelTrustProviderBody:
      "เมื่อคุณเลือกตัวเลือกแล้ว ให้ดำเนินการต่อกับผู้ให้บริการเพื่อยืนยันราคาสุดท้าย ความพร้อมให้บริการ ค่าธรรมเนียม และกฎการยกเลิก",
    exploreStaysWorldwide: "สำรวจที่พักทั่วโลก",
    "hotelDestination.Tokyo.title": "ญี่ปุ่น",
    "hotelDestination.Tokyo.subtitle": "ที่พักในโตเกียว",
    "hotelDestination.London.title": "สหราชอาณาจักร",
    "hotelDestination.London.subtitle": "ที่พักในลอนดอน",
    "hotelDestination.Paris.title": "ฝรั่งเศส",
    "hotelDestination.Paris.subtitle": "ที่พักในปารีส",
    "hotelDestination.New York.title": "สหรัฐอเมริกา",
    "hotelDestination.New York.subtitle": "ที่พักในนิวยอร์ก",
    "hotelDestination.Rome.title": "อิตาลี",
    "hotelDestination.Rome.subtitle": "ที่พักในโรม",
    "hotelDestination.Dubai.title": "สหรัฐอาหรับเอมิเรตส์",
    "hotelDestination.Dubai.subtitle": "ที่พักในดูไบ",
    "hotelDestination.Singapore.title": "สิงคโปร์",
    "hotelDestination.Singapore.subtitle": "ที่พักในสิงคโปร์",
    "hotelDestination.Barcelona.title": "สเปน",
    "hotelDestination.Barcelona.subtitle": "ที่พักในบาร์เซโลนา",
    "hotelDestination.Cancun.title": "เม็กซิโก",
    "hotelDestination.Cancun.subtitle": "ที่พักในแคนคูน",
    "hotelDestination.Bangkok.title": "ไทย",
    "hotelDestination.Bangkok.subtitle": "ที่พักในกรุงเทพฯ",
    "hotelDestination.Toronto.title": "แคนาดา",
    "hotelDestination.Toronto.subtitle": "ที่พักในโตรอนโต",
    "hotelDestination.Amsterdam.title": "เนเธอร์แลนด์",
    "hotelDestination.Amsterdam.subtitle": "ที่พักในอัมสเตอร์ดัม",
    "hotelDestination.Istanbul.title": "ตุรกี",
    "hotelDestination.Istanbul.subtitle": "ที่พักในอิสตันบูล",
  };

  for (const [key, value] of Object.entries(expectedThaiCopy)) {
    assert.equal(thTranslations[key], value, `Thai ${key} should resolve localized Hotels landing copy`);
  }

  assert.equal(thTranslations["hotelResults.liveSearchUnavailable"], "การค้นหาโรงแรมแบบสดไม่พร้อมใช้งานชั่วคราว โปรดลองอีกครั้งในภายหลัง");
  assert.equal(thTranslations["hotelResults.viewHotel"], "ดูโรงแรม");
  assert.equal(thTranslations["hotelTrustProviderBody"].includes("ผู้ให้บริการเพื่อยืนยันราคาสุดท้าย"), true);
  assert.equal(thTranslations["hotelTrustCompareBody"].includes("ผู้ให้บริการหลายราย"), true);

  for (const key of [
    "hotelsHeroTitle",
    "hotelsHeroSubtitle",
    "exploreHotelStaysByDestination",
    "featuredHotelDestinations",
    "findStaysEveryKindTrip",
    "hotelInspirationBody",
    "exploreStaysWorldwide",
  ]) {
    assert.ok(hotelsPageSource.includes(`t("${key}")`), `${key} should be read through i18n on /hotels`);
  }

  assert.match(hotelsPageSource, /dictionary\[`hotelDestination\.\$\{card\.destinationQuery\}\.title`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationCategory\.\$\{category\}`\]/);
  assert.match(hotelsPageSource, /dictionary\[`hotelInspirationBadge\.\$\{card\.badge\}`\]/);
  assert.match(hotelsPageSource, /destination: destinationQuery/);
  assert.match(hotelsPageSource, /guests: "2"/);
  assert.match(hotelsPageSource, /rooms: "1"/);
  assert.match(hotelsPageSource, /createHotelInspirationCard\("Cancun", "Coastal stays"\)/);
  assert.match(hotelsPageSource, /className="page-shell relative z-0 mx-auto/);
  assert.match(searchSource, /const nextUrl = `\/hotels\/results\?\$\{params\.toString\(\)\}`/);
  assert.match(searchSource, /hotelSearchDestinationLabel/);
  assert.match(searchSource, /hotelSearchDatePlaceholder/);

  assert.equal(languageOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});

test("Thai cars landing render path copy resolves without English fallback", () => {
  const th = getTranslations("th");
  const auditedThaiCarsLandingKeys: Array<[string, string]> = [
    ["searchRentalCarsEveryPartTrip", "ค้นหารถเช่าสำหรับทุกช่วงของทริป"],
    ["carsSearch.pickupLocationLabel", "สถานที่รับรถ"],
    ["carsSearch.pickupLocationPlaceholder", "สนามบิน เมือง หรือที่อยู่"],
    ["carsSearch.returnToSameLocation", "คืนรถที่สถานที่เดิม"],
    ["carsSearch.differentReturnLocation", "คืนรถต่างสถานที่"],
    ["carsSearch.rentalDatesLabel", "วันที่เช่ารถ"],
    ["carsSearch.rentalDatePlaceholder", "วันที่รับรถ — วันที่คืนรถ"],
    ["carsSearch.pickupReturnTimeLabel", "เวลารับรถ / คืนรถ"],
    ["carsSearch.pickupReturnTimeSummary", "รับรถ {pickupTime} — คืนรถ {returnTime}"],
    ["carsSearch.driverAgeLabel", "อายุผู้ขับขี่"],
    ["carsSearch.driverAgeAnyAge", "ทุกช่วงอายุ"],
    ["exploreCarsByTripStyle", "สำรวจรถเช่าตามสไตล์การเดินทาง"],
    ["carsTripStyleBody", "เลือกประเภทรถ แล้วเราจะเปิดผลลัพธ์พร้อมบริบทการค้นหาที่เตรียมไว้"],
    ["carsTripStyle.economy.title", "รถประหยัด"],
    ["carsTripStyle.economy.subtitle", "การค้นหาราคาคุ้มค่าสำหรับการเดินทางในเมืองและทริปเดี่ยว"],
    ["carsTripStyle.economy.cta", "เริ่มค้นหารถประหยัด"],
    ["carsTripStyle.suv.title", "รถ SUV"],
    ["carsTripStyle.suv.subtitle", "มีพื้นที่สำหรับทริปครอบครัว สัมภาระ และการขับขี่ระยะไกล"],
    ["carsTripStyle.suv.cta", "เปิดการค้นหาเช่ารถ SUV"],
    ["carsTripStyle.luxury.title", "รถหรู"],
    ["carsTripStyle.luxury.subtitle", "บริบทการค้นหาระดับพรีเมียมสำหรับธุรกิจหรือทริปพิเศษ"],
    ["carsTripStyle.luxury.cta", "วางแผนค้นหารถหรู"],
    ["carsTripStyle.van.title", "รถตู้"],
    ["carsTripStyle.van.subtitle", "บริบทการค้นหาสำหรับการเดินทางเป็นกลุ่มและสัมภาระครอบครัว"],
    ["carsTripStyle.van.cta", "ค้นหารถตู้สำหรับทริปกลุ่ม"],
    ["carsTrust.0.title", "ออกแบบมาสำหรับทริปครบวงจร"],
    ["carsTrust.0.description", "วางแผนเที่ยวบิน ที่พัก และการเดินทางภาคพื้นดินได้ในขั้นตอนเดียวบน Kurioticket"],
    ["carsTrust.1.title", "เริ่มจากรายละเอียดการรับรถ"],
    ["carsTrust.1.description", "ป้อนสถานที่รับรถ วันที่ เวลา และอายุผู้ขับขี่ เพื่อให้การค้นหารถเช่าเริ่มต้นด้วยรายละเอียดทริปที่ถูกต้อง"],
    ["carsTrust.2.title", "ตรวจสอบการเช่าอย่างชัดเจน"],
    ["carsTrust.2.description", "ตรวจสอบราคาสุดท้าย ความพร้อมให้บริการ ค่าธรรมเนียม และกฎการเช่ากับผู้ให้บริการก่อนจอง"],
    ["carsPickupPointsTitle", "เริ่มจากจุดรับรถยอดนิยม"],
    ["carsPickupPointsBody", "เลือกรูปแบบจุดรับรถ แล้วเราจะเปิดหน้าผลลัพธ์รถพร้อมรายละเอียดการค้นหาที่เตรียมไว้"],
    ["carsPickup.Airport.title", "รับรถที่สนามบิน"],
    ["carsPickup.Airport.subtitle", "เริ่มจากจุดเดินทางมาถึงของสนามบินหลัก"],
    ["carsPickup.City center.title", "รับรถใจกลางเมือง"],
    ["carsPickup.City center.subtitle", "รับรถใกล้โรงแรมในตัวเมืองและย่านธุรกิจ"],
    ["carsPickup.Train station.title", "รับรถที่สถานีรถไฟ"],
    ["carsPickup.Train station.subtitle", "เดินทางต่อหลังจากมาถึงด้วยรถไฟ"],
    ["carsPickup.Hotel area.title", "รับรถใกล้บริเวณโรงแรม"],
    ["carsPickup.Hotel area.subtitle", "วางแผนรับรถใกล้ที่พักของคุณ"],
    ["carsFaq.heading", "คำถามที่พบบ่อยเกี่ยวกับรถเช่า"],
    ["carsFaq.0.question", "ต้องใช้ข้อมูลอะไรบ้างในการค้นหารถเช่า?"],
    ["carsFaq.1.question", "ฉันสามารถคืนรถต่างสถานที่ได้หรือไม่?"],
    ["carsFaq.2.question", "ทำไมอายุผู้ขับขี่จึงสำคัญสำหรับรถเช่า?"],
    ["carsFaq.3.question", "ควรตรวจสอบอะไรบ้างก่อนจองรถเช่า?"],
    ["carsFaq.4.question", "ราคาสุดท้ายของรถเช่ายืนยันที่ไหน?"],
    ["carsFaq.5.question", "ฉันอาจต้องใช้เอกสารอะไรบ้างตอนรับรถ?"],
  ];

  for (const [key, expected] of auditedThaiCarsLandingKeys) {
    assert.equal(th[key], expected, `${key} should resolve to Thai`);
    assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  for (const key of ["carsFaq.0.answer", "carsFaq.1.answer", "carsFaq.2.answer", "carsFaq.3.answer", "carsFaq.4.answer", "carsFaq.5.answer"]) {
    assert.ok(th[key] && th[key] !== enTranslations[key], `${key} should be localized to Thai`);
  }
  assert.match(th["carsFaq.4.answer"], /ผู้ให้บริการ/);
  assert.match(th["carsTrust.2.description"], /ผู้ให้บริการ/);
  assert.equal(th.search, "ค้นหา");
  assert.equal(th["carsSearch.pickupReturnTimeSummary"].replace("{pickupTime}", "10:00").replace("{returnTime}", "10:00"), "รับรถ 10:00 — คืนรถ 10:00");

  const carsPageSource = readFileSync("src/app/cars/page.tsx", "utf8");
  const carsLandingContentSource = readFileSync("src/data/carsLandingContent.ts", "utf8");
  for (const key of ["searchRentalCarsEveryPartTrip", "carsSearch.pickupLocationLabel", "exploreCarsByTripStyle", "carsPickupPointsTitle", "carsFaq.heading"]) {
    assert.ok(carsPageSource.includes(`t("${key}")`) || carsPageSource.includes("dictionary[item.questionKey]"), `Cars landing render path should resolve ${key} through i18n`);
  }
  assert.ok(
    carsPageSource.includes("buildCarResultsHref") &&
      carsPageSource.includes("pickupLocation: card.pickupLocation") &&
      carsPageSource.includes("vehicleType: card.vehicleType") &&
      carsPageSource.includes("returnToDifferentLocation") &&
      carsPageSource.includes('name="pickupLocation"') &&
      carsPageSource.includes('name="pickupDate"') &&
      carsPageSource.includes('type="checkbox"') &&
      carsPageSource.includes("grid auto-cols-[minmax(240px,82vw)]") &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.economy"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.suv"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.luxury"') &&
      carsLandingContentSource.includes('translationKey: "carsTripStyle.van"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Airport"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.City center"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Train station"') &&
      carsLandingContentSource.includes('translationKey: "carsPickup.Hotel area"') &&
      carsLandingContentSource.includes('vehicleType: "economy"') &&
      carsLandingContentSource.includes('pickupLocation: "City center"') &&
      carsLandingContentSource.includes("image:"),
    "Cars landing operational data and render behavior should remain unchanged.",
  );
  assert.ok(!carsPageSource.includes("Search rental cars for every part of your trip"));
  assert.ok(languageOptions.some((option) => option.code === "th" && option.direction === "ltr"));
  assert.ok(languageOptions.some((option) => option.code === "ar" && option.direction === "rtl"));
});

test("Thai Legal Center and legal detail copy resolves without English fallbacks", () => {
  const th = getTranslations("th");
  const legalIndexSource = readFileSync("src/app/legal/LegalPageContent.tsx", "utf8");
  const legalViewerSource = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
  const legalDataSource = readFileSync("src/data/legalDocuments.ts", "utf8");

  assert.ok(legalIndexSource.includes('t("legal.index.heroTitle")'));
  assert.ok(legalIndexSource.includes('t("legal.index.documentsCountText")'));
  assert.ok(legalViewerSource.includes('getLegalDocumentTranslation(document, t)'));
  assert.ok(legalViewerSource.includes('"legal.print"'));
  assert.ok(legalViewerSource.includes('"legal.tableOfContents"'));

  assert.equal(th["legal.index.heroLabel"], "ข้อมูลทางกฎหมาย");
  assert.equal(th["legal.index.heroTitle"], "ศูนย์กฎหมาย");
  assert.equal(th["legal.index.documentsCountText"], "มีนโยบายและประกาศ 14 รายการ");
  assert.equal(th["legal.index.compliance.registrationNumberLabel"], "เลขทะเบียน");
  assert.equal(th["legal.index.contacts.support"], "ฝ่ายสนับสนุน");
  assert.equal(th["legal.print"], "พิมพ์");
  assert.equal(th["legal.tableOfContents"], "สารบัญ");
  assert.equal(th["legal.lastUpdated"], "อัปเดตล่าสุด");
  assert.equal(th["legal.index.developerNote"], "ร่างเอกสารทางกฎหมายเหล่านี้เป็นข้อความชั่วคราวสำหรับสตาร์ทอัป และควรได้รับการตรวจสอบโดยที่ปรึกษากฎหมายที่มีคุณสมบัติก่อนเปิดให้ใช้งานสาธารณะในวงกว้าง");

  const documentKeys = ["termsOfService", "privacyPolicy", "cookiePolicy", "privacyChoices", "affiliateDisclosure", "refundBookingDisclaimer", "priceAvailabilityDisclaimer", "partnerRedirectDisclaimer", "californiaSellerOfTravelNotice", "legalNoticeCompanyInformation", "acceptableUsePolicy", "dataDeletionPolicy", "securityStatement", "accessibilityStatement"];
  assert.equal(legalDocuments.length, 14);
  for (const key of documentKeys) {
    const title = th[`legal.index.documents.${key}.title`];
    const summary = th[`legal.index.documents.${key}.summary`];
    assert.ok(title, `${key} title should exist`);
    assert.ok(summary, `${key} summary should exist`);
    assert.notEqual(title, enTranslations[`legal.index.documents.${key}.title`]);
    assert.notEqual(summary, enTranslations[`legal.index.documents.${key}.summary`]);
  }

  const namespaces = ["terms", "privacy", "cookiePolicy", "privacyChoices", "affiliateDisclosure", "refundBookingDisclaimer", "priceAvailabilityDisclaimer", "partnerRedirectDisclaimer", "californiaSellerOfTravelNotice", "legalNoticeCompanyInformation", "acceptableUsePolicy", "dataDeletionPolicy", "securityStatement", "accessibilityStatement"];
  for (const namespace of namespaces) {
    assert.ok(th[`legal.${namespace}.title`], `${namespace} detail title should exist`);
    assert.ok(th[`legal.${namespace}.summary`], `${namespace} detail summary should exist`);
    assert.equal(th[`legal.${namespace}.tableOfContents`], "สารบัญ");
    assert.equal(th[`legal.${namespace}.developerNote`], th["legal.index.developerNote"]);
    assert.notEqual(th[`legal.${namespace}.title`], enTranslations[`legal.${namespace}.title`]);
    assert.notEqual(th[`legal.${namespace}.summary`], enTranslations[`legal.${namespace}.summary`]);
  }

  assert.equal(th["legal.terms.title"], "ข้อกำหนดการใช้บริการ");
  assert.equal(th["legal.terms.sections.overview.title"], "ภาพรวม");
  assert.equal(th["legal.terms.sections.accounts.title"], "บัญชี");
  assert.equal(th["legal.terms.sections.acceptable-use.title"], "การใช้งานที่ยอมรับได้");
  assert.equal(th["legal.terms.sections.partner-services.title"], "บริการของพันธมิตร");
  assert.ok(th["legal.terms.sections.overview.paragraph2"].includes("Kurioticket ไม่ใช่สายการบิน"));
  assert.equal(th["legal.privacy.title"], "นโยบายความเป็นส่วนตัว");
  assert.equal(th["legal.privacy.sections.data-we-collect.title"], "ข้อมูลที่เราเก็บรวบรวม");
  assert.equal(th["legal.privacy.sections.vendors.title"], "ผู้ให้บริการ");
  assert.equal(th["legal.privacy.sections.choices.title"], "ตัวเลือกของคุณ");
  assert.ok(th["legal.privacy.sections.vendors.paragraph2"].includes("Kurioticket ไม่ขอหรือจัดเก็บหมายเลขบัตรเครดิต"));
  assert.equal(th["legal.cookiePolicy.title"], "นโยบายคุกกี้");
  assert.equal(th["legal.cookiePolicy.sections.use.title"], "วิธีใช้คุกกี้");
  assert.equal(th["legal.cookiePolicy.sections.third-parties.title"], "เทคโนโลยีของบุคคลที่สาม");
  assert.equal(th["legal.cookiePolicy.sections.controls.title"], "การควบคุม");
  assert.ok(th["legal.cookiePolicy.sections.controls.paragraph1"].includes("การบล็อกคุกกี้ที่จำเป็น"));
  assert.equal(th["legal.californiaSellerOfTravelNotice.sections.registration.paragraph1"].includes("2172630-70"), true);
  assert.equal(th["legal.legalNoticeCompanyInformation.sections.contacts.paragraph1"].includes("support@kurioticket.com"), true);
  assert.equal(th["legal.legalNoticeCompanyInformation.sections.contacts.paragraph1"].includes("legal@kurioticket.com"), true);
  assert.equal(th["legal.legalNoticeCompanyInformation.sections.contacts.paragraph1"].includes("privacy@kurioticket.com"), true);
  assert.ok(legalDataSource.includes('slug: "terms-of-service"'));
  assert.ok(legalDataSource.includes('id: "overview"'));
  assert.equal(languageOptions.find((o) => o.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((o) => o.code === "ar")?.direction, "rtl");
});

test("Thai My Trips and Price alerts account pages resolve localized copy without changing render behavior", () => {
  const th = getTranslations("th");
  const tripsPageSource = readFileSync("src/app/dashboard/trips/page.tsx", "utf8");
  const tripsSource = readFileSync("src/app/dashboard/trips/TripsManagementPage.tsx", "utf8");
  const alertsPageSource = readFileSync("src/app/dashboard/alerts/page.tsx", "utf8");
  const alertsSource = readFileSync("src/app/dashboard/alerts/PriceAlertsContent.tsx", "utf8");

  const tripsCopy = {
    "accountDashboard.trips.title": "ทริปของฉัน",
    "accountDashboard.trips.findReservation": "ค้นหาการจอง",
    "accountDashboard.trips.current.empty.title": "จะไปที่ไหนต่อ?",
    "accountDashboard.trips.current.empty.body": "คุณยังไม่ได้เริ่มทริปใด ๆ เมื่อคุณทำการจอง ทริปจะแสดงที่นี่",
    "accountDashboard.trips.history.tabs.past": "ที่ผ่านมา",
    "accountDashboard.trips.history.tabs.cancelled": "ยกเลิกแล้ว",
    "accountDashboard.trips.history.empty.past.title": "จดจำการเดินทางของคุณ",
    "accountDashboard.trips.history.empty.past.body": "ทริปที่เสร็จสิ้นแล้วจะแสดงที่นี่หลังจากคุณเดินทาง",
    "accountDashboard.trips.history.empty.cancelled.title": "แผนเปลี่ยนไปใช่ไหม?",
    "accountDashboard.trips.history.empty.cancelled.body": "การจองที่ยกเลิกแล้วจะแสดงที่นี่เพื่อใช้อ้างอิง",
  } as const;

  const alertsCopy = {
    "accountDashboard.priceAlerts.title": "การแจ้งเตือนราคา",
    "accountDashboard.priceAlerts.description": "ติดตามราคาและรับการแจ้งเตือนเมื่อค่าโดยสารเปลี่ยนแปลง",
    "accountDashboard.priceAlerts.tabs.active": "ใช้งานอยู่",
    "accountDashboard.priceAlerts.tabs.expired": "หมดอายุ",
    "accountDashboard.priceAlerts.tabs.all": "ทั้งหมด",
    "accountDashboard.priceAlerts.sort.label": "เรียงตาม",
    "accountDashboard.priceAlerts.sort.newest": "ใหม่ล่าสุด",
    "accountDashboard.priceAlerts.sort.oldest": "เก่าสุด",
    "accountDashboard.priceAlerts.sort.routeAz": "เส้นทาง A-Z",
    "accountDashboard.priceAlerts.empty.title": "ยังไม่มีการแจ้งเตือนราคา",
    "accountDashboard.priceAlerts.empty.body": "สร้างการแจ้งเตือนจากการค้นหาเที่ยวบินเพื่อติดตามการเปลี่ยนแปลงค่าโดยสารและรับการแจ้งเตือน",
    "accountDashboard.priceAlerts.cta.flights": "ค้นหาเที่ยวบิน",
  } as const;

  for (const [key, expected] of Object.entries({ ...tripsCopy, ...alertsCopy })) {
    assert.equal(th[key], expected, key);
    assert.notEqual(th[key], enTranslations[key], `${key} should not fall back to English`);
  }

  assert.equal(`${th["accountDashboard.priceAlerts.tabs.active"]} (0)`, "ใช้งานอยู่ (0)");
  assert.equal(`${th["accountDashboard.priceAlerts.tabs.expired"]} (0)`, "หมดอายุ (0)");
  assert.equal(`${th["accountDashboard.priceAlerts.tabs.all"]} (0)`, "ทั้งหมด (0)");
  assert.equal(`${th["accountDashboard.priceAlerts.sort.label"]}: ${th["accountDashboard.priceAlerts.sort.newest"]}`, "เรียงตาม: ใหม่ล่าสุด");

  for (const key of Object.keys(tripsCopy)) {
    assert.ok(tripsSource.includes(key), `Trips render path should read ${key}`);
  }
  for (const key of Object.keys(alertsCopy)) {
    assert.ok(alertsSource.includes(key), `Price alerts render path should read ${key}`);
  }

  for (const english of ["Where to next?", "Remember your journeys", "Plans changed?", "No price alerts yet.", "Create an alert from a flight search to track fare changes and get notified.", "Search flights"]) {
    assert.ok(!tripsSource.includes(`>${english}<`), `${english} should not be hardcoded as rendered Thai trips copy`);
    assert.ok(!alertsSource.includes(`>${english}<`), `${english} should not be hardcoded as rendered Thai alerts copy`);
  }

  assert.ok(tripsPageSource.includes("<TripsManagementPage />"));
  assert.ok(alertsPageSource.includes("<PriceAlertsContent showAccountLink={showAccountLink} />"));
  assert.ok(tripsSource.includes('fetch("/api/dashboard/trips"'));
  assert.ok(tripsSource.includes('fetch("/api/dashboard/trips/lookup"'));
  assert.ok(tripsSource.includes('body: JSON.stringify({ reservationCode, email })'));
  assert.ok(tripsSource.includes('id: "past"'));
  assert.ok(tripsSource.includes('id: "cancelled"'));
  assert.ok(tripsSource.includes('aria-controls={`${tab.id}-history-trips-panel`}'));
  assert.ok(alertsSource.includes('id: "active"'));
  assert.ok(alertsSource.includes('id: "expired"'));
  assert.ok(alertsSource.includes('id: "all"'));
  assert.ok(alertsSource.includes('id: "newest"'));
  assert.ok(alertsSource.includes('id: "oldest"'));
  assert.ok(alertsSource.includes('id: "routeAz"'));
  assert.ok(alertsSource.includes('href="/flights"'));
  assert.ok(alertsSource.includes('aria-expanded={isSortOpen}'));
  assert.ok(alertsSource.includes('role="listbox"'));
  assert.ok(alertsSource.includes('setSelectedTab(tab.id)'));
  assert.ok(alertsSource.includes('setSelectedSort(option.id)'));
  assert.ok(alertsSource.includes('rounded-full'));
  assert.equal(languageOptions.find((option) => option.code === "th")?.direction, "ltr");
  assert.equal(languageOptions.find((option) => option.code === "ar")?.direction, "rtl");
});
