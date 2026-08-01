import { SHARED_AIRPORTS } from "../../shared/travel/airports";
import { countryCodeToCountryName, countryMatchesCode, normalizeCountryCode } from "../lib/geo/context";
import { getCountryDisplayNameForLocale } from "../lib/region/countryDisplayNames";
import { distanceKm } from "../lib/geo/distance";

export type AirportOption = {
  code: string;
  name?: string;
  city: string;
  airport: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  priority?: number;
};

export const airports: AirportOption[] = SHARED_AIRPORTS.map((airport) => ({
  ...airport,
  name: airport.airport,
  lat: airport.latitude,
  lon: airport.longitude,
}));

export const destinationDefaults = ["LHR", "CDG", "DXB", "JFK", "LAX", "AMS", "MAD", "FCO", "SIN", "HND", "DOH"];

export function getAirportByCode(code: string | null | undefined) {
  const normalizedCode = code?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(normalizedCode)) return null;

  return airports.find((airport) => airport.code === normalizedCode) ?? null;
}

const airportCountryMatches = (airport: AirportOption, countryCode?: string) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) return false;
  return airport.countryCode === normalizedCountryCode || countryMatchesCode(airport.country, normalizedCountryCode);
};

export const getDefaultAirports = (params: { context: "origin" | "destination"; countryCode?: string; lat?: number; lon?: number; limit?: number; }) => {
  const limit = params.limit ?? 8;
  const destinationOrder = new Map(destinationDefaults.map((code, index) => [code, index]));
  const sameCountryAirports = params.countryCode
    ? airports.filter((airport) => airportCountryMatches(airport, params.countryCode))
    : [];
  const sourceAirports = params.context === "origin" && sameCountryAirports.length > 0 ? sameCountryAirports : airports;

  return [...sourceAirports]
    .sort((a, b) => {
      if (params.context === "destination" && params.countryCode) {
        const aMatch = airportCountryMatches(a, params.countryCode) ? 1 : 0;
        const bMatch = airportCountryMatches(b, params.countryCode) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      if (typeof params.lat === "number" && typeof params.lon === "number") {
        const ad = typeof a.lat === "number" && typeof a.lon === "number" ? distanceKm(params.lat, params.lon, a.lat, a.lon) : Number.POSITIVE_INFINITY;
        const bd = typeof b.lat === "number" && typeof b.lon === "number" ? distanceKm(params.lat, params.lon, b.lat, b.lon) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
      }
      if (params.context === "destination") {
        const ad = destinationOrder.get(a.code) ?? 999;
        const bd = destinationOrder.get(b.code) ?? 999;
        if (ad !== bd) return ad - bd;
      }
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return a.city.localeCompare(b.city);
    })
    .slice(0, limit);
};

type AirportDisplayLocale =
  | "en-us"
  | "ar"
  | "nl"
  | "es-es"
  | "fr"
  | "de-de"
  | "it-it"
  | "pt-br"
  | "zh-cn"
  | "ja"
  | "ko"
  | "hi"
  | "tr";

const activeAirportDisplayLocales = new Set<AirportDisplayLocale>([
  "en-us",
  "ar",
  "nl",
  "es-es",
  "fr",
  "de-de",
  "it-it",
  "pt-br",
  "zh-cn",
  "ja",
  "ko",
  "hi",
  "tr",
]);

const normalizeAirportDisplayLocale = (locale: string | null | undefined): AirportDisplayLocale => {
  const normalized = locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (activeAirportDisplayLocales.has(normalized as AirportDisplayLocale)) {
    return normalized as AirportDisplayLocale;
  }

  if (normalized.startsWith("es-")) return "es-es";
  if (normalized.startsWith("de-")) return "de-de";
  if (normalized.startsWith("it-")) return "it-it";
  if (normalized.startsWith("pt-")) return "pt-br";
  if (normalized === "zh" || normalized.startsWith("zh-hans") || normalized.startsWith("zh-cn")) return "zh-cn";
  if (normalized.startsWith("ar-")) return "ar";
  if (normalized.startsWith("fr-")) return "fr";
  if (normalized.startsWith("nl-")) return "nl";
  if (normalized.startsWith("ja-")) return "ja";
  if (normalized.startsWith("ko-")) return "ko";
  if (normalized.startsWith("hi-")) return "hi";
  if (normalized.startsWith("tr-")) return "tr";

  return "en-us";
};

type LocalizedCityNames = Record<AirportDisplayLocale, string>;
type LocalizedCityNameOverrides = Partial<LocalizedCityNames>;

const cityDisplayNameOverrides: Record<string, LocalizedCityNameOverrides> = {
  "Abuja": { "en-us": "Abuja", ar: "أبوجا", nl: "Abuja", "es-es": "Abuya", fr: "Abuja", "de-de": "Abuja", "it-it": "Abuja", "pt-br": "Abuja", "zh-cn": "阿布贾", ja: "アブジャ", ko: "아부자", hi: "अबुजा" },
  "Accra": { "en-us": "Accra", ar: "أكرا", nl: "Accra", "es-es": "Acra", fr: "Accra", "de-de": "Accra", "it-it": "Accra", "pt-br": "Acra", "zh-cn": "阿克拉", ja: "アクラ", ko: "아크라", hi: "अक्रा", tr: "Akra" },
  "Addis Ababa": { "en-us": "Addis Ababa", ar: "أديس أبابا", nl: "Addis Abeba", "es-es": "Adís Abeba", fr: "Addis-Abeba", "de-de": "Addis Abeba", "it-it": "Addis Abeba", "pt-br": "Adis Abeba", "zh-cn": "亚的斯亚贝巴", ja: "アディスアベバ", ko: "아디스아바바", hi: "अदीस अबाबा", tr: "Addis Ababa" },
  "Amsterdam": { "en-us": "Amsterdam", ar: "أمستردام", nl: "Amsterdam", "es-es": "Ámsterdam", fr: "Amsterdam", "de-de": "Amsterdam", "it-it": "Amsterdam", "pt-br": "Amsterdã", "zh-cn": "阿姆斯特丹", ja: "アムステルダム", ko: "암스테르담", tr: "Amsterdam" },
  "Barcelona": { "en-us": "Barcelona", ar: "برشلونة", nl: "Barcelona", "es-es": "Barcelona", fr: "Barcelone", "de-de": "Barcelona", "it-it": "Barcellona", "pt-br": "Barcelona", "zh-cn": "巴塞罗那", ja: "バルセロナ", ko: "바르셀로나", hi: "बार्सिलोना", tr: "Barselona" },
  "Berlin": { "en-us": "Berlin", ar: "برلين", nl: "Berlijn", "es-es": "Berlín", fr: "Berlin", "de-de": "Berlin", "it-it": "Berlino", "pt-br": "Berlim", "zh-cn": "柏林", ja: "ベルリン", ko: "베를린", tr: "Berlin" },
  "Brussels": { "en-us": "Brussels", ar: "بروكسل", nl: "Brussel", "es-es": "Bruselas", fr: "Bruxelles", "de-de": "Brüssel", "it-it": "Bruxelles", "pt-br": "Bruxelas", "zh-cn": "布鲁塞尔", ja: "ブリュッセル", ko: "브뤼셀", tr: "Brüksel" },
  "Cairo": { "en-us": "Cairo", ar: "القاهرة", nl: "Caïro", "es-es": "El Cairo", fr: "Le Caire", "de-de": "Kairo", "it-it": "Il Cairo", "pt-br": "Cairo", "zh-cn": "开罗", ja: "カイロ", ko: "카이로", hi: "काहिरा", tr: "Kahire" },
  "Cancún": { "en-us": "Cancun", ar: "كانكون", nl: "Cancun", "es-es": "Cancún", fr: "Cancún", "de-de": "Cancún", "it-it": "Cancún", "pt-br": "Cancún", "zh-cn": "坎昆", ja: "カンクン", ko: "칸쿤", hi: "कैनकन", tr: "Cancun" },
  "Cape Town": { "en-us": "Cape Town", ar: "كيب تاون", nl: "Kaapstad", "es-es": "Ciudad del Cabo", fr: "Le Cap", "de-de": "Kapstadt", "it-it": "Città del Capo", "pt-br": "Cidade do Cabo", "zh-cn": "开普敦", ja: "ケープタウン", ko: "케이프타운", hi: "केप टाउन", tr: "Cape Town" },
  "Doha": { "en-us": "Doha", ar: "الدوحة", nl: "Doha", "es-es": "Doha", fr: "Doha", "de-de": "Doha", "it-it": "Doha", "pt-br": "Doha", "zh-cn": "多哈", ja: "ドーハ", ko: "도하", hi: "दोहा", tr: "Doha" },
  "Dubai": { "en-us": "Dubai", ar: "دبي", nl: "Dubai", "es-es": "Dubái", fr: "Dubaï", "de-de": "Dubai", "it-it": "Dubai", "pt-br": "Dubai", "zh-cn": "迪拜", ja: "ドバイ", ko: "두바이", hi: "दुबई", tr: "Dubai" },
  "Edmonton": { "en-us": "Edmonton", ar: "إدمونتون", nl: "Edmonton", "es-es": "Edmonton", fr: "Edmonton", "de-de": "Edmonton", "it-it": "Edmonton", "pt-br": "Edmonton", "zh-cn": "埃德蒙顿", ja: "エドモントン", ko: "에드먼턴", hi: "एडमंटन" },
  "Frankfurt": { "en-us": "Frankfurt", ar: "فرانكفورت", nl: "Frankfurt", "es-es": "Fráncfort", fr: "Francfort", "de-de": "Frankfurt", "it-it": "Francoforte", "pt-br": "Frankfurt", "zh-cn": "法兰克福", ja: "フランクフルト", ko: "프랑크푸르트", tr: "Frankfurt" },
  "Honolulu": { "en-us": "Honolulu", ar: "هونولولو", nl: "Honolulu", "es-es": "Honolulu", fr: "Honolulu", "de-de": "Honolulu", "it-it": "Honolulu", "pt-br": "Honolulu", "zh-cn": "檀香山", ja: "ホノルル", ko: "호놀룰루" },
  "Istanbul": { "en-us": "Istanbul", ar: "إسطنبول", nl: "Istanboel", "es-es": "Estambul", fr: "Istanbul", "de-de": "Istanbul", "it-it": "Istanbul", "pt-br": "Istambul", "zh-cn": "伊斯坦布尔", ja: "イスタンブール", ko: "이스탄불", hi: "इस्तांबुल", tr: "İstanbul" },
  "Kano": { "en-us": "Kano", ar: "كانو", nl: "Kano", "es-es": "Kano", fr: "Kano", "de-de": "Kano", "it-it": "Kano", "pt-br": "Kano", "zh-cn": "卡诺", ja: "カノ", ko: "카노", hi: "कानो" },
  "Johannesburg": { "en-us": "Johannesburg", ar: "جوهانسبرغ", nl: "Johannesburg", "es-es": "Johannesburgo", fr: "Johannesburg", "de-de": "Johannesburg", "it-it": "Johannesburg", "pt-br": "Joanesburgo", "zh-cn": "约翰内斯堡", ja: "ヨハネスブルグ", ko: "요하네스버그", hi: "जोहान्सबर्ग", tr: "Johannesburg" },
  "Kigali": { "en-us": "Kigali", ar: "كيغالي", nl: "Kigali", "es-es": "Kigali", fr: "Kigali", "de-de": "Kigali", "it-it": "Kigali", "pt-br": "Kigali", "zh-cn": "基加利", ja: "キガリ", ko: "키갈리", hi: "किगाली", tr: "Kigali" },
  "La Paz": { "en-us": "La Paz", ar: "لاباز", nl: "La Paz", "es-es": "La Paz", fr: "La Paz", "de-de": "La Paz", "it-it": "La Paz", "pt-br": "La Paz", "zh-cn": "拉巴斯", ja: "ラパス", ko: "라파스", hi: "ला पाज़" },
  "Lae": { "en-us": "Lae", ar: "لاي", nl: "Lae", "es-es": "Lae", fr: "Lae", "de-de": "Lae", "it-it": "Lae", "pt-br": "Lae", "zh-cn": "莱城", ja: "ラエ", ko: "라에" },
  "Lansing": { "en-us": "Lansing", ar: "لانسنغ", nl: "Lansing", "es-es": "Lansing", fr: "Lansing", "de-de": "Lansing", "it-it": "Lansing", "pt-br": "Lansing", "zh-cn": "兰辛", ja: "ランシング", ko: "랜싱" },
  "Lawton": { "en-us": "Lawton", ar: "لوتون", nl: "Lawton", "es-es": "Lawton", fr: "Lawton", "de-de": "Lawton", "it-it": "Lawton", "pt-br": "Lawton", "zh-cn": "劳顿", ja: "ロートン", ko: "로턴" },
  "Lagos": { "en-us": "Lagos", ar: "لاغوس", nl: "Lagos", "es-es": "Lagos", fr: "Lagos", "de-de": "Lagos", "it-it": "Lagos", "pt-br": "Lagos", "zh-cn": "拉各斯", ja: "ラゴス", ko: "라고스", hi: "लागोस", tr: "Lagos" },
  "Luanda": { "en-us": "Luanda", ar: "لواندا", nl: "Luanda", "es-es": "Luanda", fr: "Luanda", "de-de": "Luanda", "it-it": "Luanda", "pt-br": "Luanda", "zh-cn": "罗安达", ja: "ルアンダ", ko: "루안다", hi: "लुआंडा" },
  "Las Vegas": { "en-us": "Las Vegas", ar: "لاس فيغاس", nl: "Las Vegas", "es-es": "Las Vegas", fr: "Las Vegas", "de-de": "Las Vegas", "it-it": "Las Vegas", "pt-br": "Las Vegas", "zh-cn": "拉斯维加斯", ja: "ラスベガス", ko: "라스베이거스", hi: "लास वेगास" },
  "Lisbon": { "en-us": "Lisbon", ar: "لشبونة", nl: "Lissabon", "es-es": "Lisboa", fr: "Lisbonne", "de-de": "Lissabon", "it-it": "Lisbona", "pt-br": "Lisboa", "zh-cn": "里斯本", ja: "リスボン", ko: "리스본", tr: "Lizbon" },
  "London": { "en-us": "London", ar: "لندن", nl: "Londen", "es-es": "Londres", fr: "Londres", "de-de": "London", "it-it": "Londra", "pt-br": "Londres", "zh-cn": "伦敦", ja: "ロンドン", ko: "런던", hi: "लंदन", tr: "Londra" },
  "Los Angeles": { "en-us": "Los Angeles", ar: "لوس أنجلوس", nl: "Los Angeles", "es-es": "Los Ángeles", fr: "Los Angeles", "de-de": "Los Angeles", "it-it": "Los Angeles", "pt-br": "Los Angeles", "zh-cn": "洛杉矶", ja: "ロサンゼルス", ko: "로스앤젤레스", hi: "लॉस एंजेलिस", tr: "Los Angeles" },
  "Madrid": { "en-us": "Madrid", ar: "مدريد", nl: "Madrid", "es-es": "Madrid", fr: "Madrid", "de-de": "Madrid", "it-it": "Madrid", "pt-br": "Madri", "zh-cn": "马德里", ja: "マドリード", ko: "마드리드", tr: "Madrid" },
  "Milan": { "en-us": "Milan", ar: "ميلانو", nl: "Milaan", "es-es": "Milán", fr: "Milan", "de-de": "Mailand", "it-it": "Milano", "pt-br": "Milão", "zh-cn": "米兰", ja: "ミラノ", ko: "밀라노", tr: "Milano" },
  "Montreal": { "en-us": "Montreal", ar: "مونتريال", nl: "Montreal", "es-es": "Montreal", fr: "Montréal", "de-de": "Montreal", "it-it": "Montréal", "pt-br": "Montreal", "zh-cn": "蒙特利尔", ja: "モントリオール", ko: "몬트리올" },
  "Munich": { "en-us": "Munich", ar: "ميونخ", nl: "München", "es-es": "Múnich", fr: "Munich", "de-de": "München", "it-it": "Monaco di Baviera", "pt-br": "Munique", "zh-cn": "慕尼黑", ja: "ミュンヘン", ko: "뮌헨", tr: "Münih" },
  "Nairobi": { "en-us": "Nairobi", ar: "نيروبي", nl: "Nairobi", "es-es": "Nairobi", fr: "Nairobi", "de-de": "Nairobi", "it-it": "Nairobi", "pt-br": "Nairóbi", "zh-cn": "内罗毕", ja: "ナイロビ", ko: "나이로비", hi: "नैरोबी", tr: "Nairobi" },
  "New York": { "en-us": "New York", ar: "نيويورك", nl: "New York", "es-es": "Nueva York", fr: "New York", "de-de": "New York", "it-it": "New York", "pt-br": "Nova York", "zh-cn": "纽约", ja: "ニューヨーク", ko: "뉴욕", hi: "न्यूयॉर्क", tr: "New York" },
  "Paris": { "en-us": "Paris", ar: "باريس", nl: "Parijs", "es-es": "París", fr: "Paris", "de-de": "Paris", "it-it": "Parigi", "pt-br": "Paris", "zh-cn": "巴黎", ja: "パリ", ko: "파리", hi: "पेरिस", tr: "Paris" },
  "Puerto Vallarta": { "en-us": "Puerto Vallarta", ar: "بويرتو فالارتا", nl: "Puerto Vallarta", "es-es": "Puerto Vallarta", fr: "Puerto Vallarta", "de-de": "Puerto Vallarta", "it-it": "Puerto Vallarta", "pt-br": "Puerto Vallarta", "zh-cn": "巴亚尔塔港", ja: "プエルトバジャルタ", ko: "푸에르토바야르타", hi: "पुएर्तो वाल्यार्ता" },
  "Rome": { "en-us": "Rome", ar: "روما", nl: "Rome", "es-es": "Roma", fr: "Rome", "de-de": "Rom", "it-it": "Roma", "pt-br": "Roma", "zh-cn": "罗马", ja: "ローマ", ko: "로마", hi: "रोम", tr: "Roma" },
  "San Diego": { "en-us": "San Diego", ar: "سان دييغو", nl: "San Diego", "es-es": "San Diego", fr: "San Diego", "de-de": "San Diego", "it-it": "San Diego", "pt-br": "San Diego", "zh-cn": "圣迭戈", ja: "サンディエゴ", ko: "샌디에이고" },
  "Singapore": { "en-us": "Singapore", ar: "سنغافورة", nl: "Singapore", "es-es": "Singapur", fr: "Singapour", "de-de": "Singapur", "it-it": "Singapore", "pt-br": "Singapura", "zh-cn": "新加坡", ja: "シンガポール", ko: "싱가포르", hi: "सिंगापुर", tr: "Singapur" },
  "Sydney": { "en-us": "Sydney", ar: "سيدني", nl: "Sydney", "es-es": "Sídney", fr: "Sydney", "de-de": "Sydney", "it-it": "Sydney", "pt-br": "Sydney", "zh-cn": "悉尼", ja: "シドニー", ko: "시드니", tr: "Sidney" },
  "Tokyo": { "en-us": "Tokyo", ar: "طوكيو", nl: "Tokio", "es-es": "Tokio", fr: "Tokyo", "de-de": "Tokio", "it-it": "Tokyo", "pt-br": "Tóquio", "zh-cn": "东京", ja: "東京", ko: "도쿄", hi: "टोक्यो", tr: "Tokyo" },
  "Toronto": { "en-us": "Toronto", ar: "تورونتو", nl: "Toronto", "es-es": "Toronto", fr: "Toronto", "de-de": "Toronto", "it-it": "Toronto", "pt-br": "Toronto", "zh-cn": "多伦多", ja: "トロント", ko: "토론토", hi: "टोरंटो", tr: "Toronto" },
  "Vancouver": { "en-us": "Vancouver", ar: "فانكوفر", nl: "Vancouver", "es-es": "Vancouver", fr: "Vancouver", "de-de": "Vancouver", "it-it": "Vancouver", "pt-br": "Vancouver", "zh-cn": "温哥华", ja: "バンクーバー", ko: "밴쿠버", tr: "Vancouver" },
  "Venice": { "en-us": "Venice", ar: "البندقية", nl: "Venetië", "es-es": "Venecia", fr: "Venise", "de-de": "Venedig", "it-it": "Venezia", "pt-br": "Veneza", "zh-cn": "威尼斯", ja: "ヴェネツィア", ko: "베네치아", tr: "Venedik" },
  "Zurich": { "en-us": "Zurich", ar: "زيورخ", nl: "Zürich", "es-es": "Zúrich", fr: "Zurich", "de-de": "Zürich", "it-it": "Zurigo", "pt-br": "Zurique", "zh-cn": "苏黎世", ja: "チューリッヒ", ko: "취리히", tr: "Zürih" },
};

const createIdentityLocalizedCityNames = (city: string): LocalizedCityNames => ({
  "en-us": city,
  ar: city,
  nl: city,
  "es-es": city,
  fr: city,
  "de-de": city,
  "it-it": city,
  "pt-br": city,
  "zh-cn": city,
  ja: city,
  ko: city,
  hi: city,
  tr: city,
});

export const cityDisplayNames: Record<string, LocalizedCityNames> = Object.fromEntries(
  [...new Set([...airports.map((airport) => airport.city), ...Object.keys(cityDisplayNameOverrides)])].map((city) => [
    city,
    { ...createIdentityLocalizedCityNames(city), ...cityDisplayNameOverrides[city] },
  ]),
) as Record<string, LocalizedCityNames>;

export function getAirportCityLocalizationCoverage() {
  const uniqueCities = new Set(airports.map((airport) => airport.city));
  return [...activeAirportDisplayLocales].map((locale) => {
    const missing = [...uniqueCities].filter((city) => !cityDisplayNames[city]?.[locale]);
    return {
      locale,
      total: uniqueCities.size,
      localized: uniqueCities.size - missing.length,
      fallback: missing.length,
      missing: missing.slice(0, 50),
    };
  });
}

export function getLocalizedAirportCountryName(airport: Pick<AirportOption, "country" | "countryCode">, locale?: string | null) {
  if (!airport.countryCode) return airport.country;
  return getCountryDisplayNameForLocale(airport.countryCode, locale, airport.country);
}

export function getAirportCountryLocalizationCoverage() {
  const uniqueCountries = new Map<string, string | undefined>();
  for (const airport of airports) {
    if (airport.countryCode) uniqueCountries.set(airport.countryCode, airport.country);
  }

  return [...activeAirportDisplayLocales].map((locale) => {
    const missing = [...uniqueCountries.entries()]
      .filter(([countryCode, fallbackName]) => !getCountryDisplayNameForLocale(countryCode, locale, fallbackName))
      .map(([countryCode]) => countryCode);

    return {
      locale,
      total: uniqueCountries.size,
      localized: uniqueCountries.size - missing.length,
      fallback: missing.length,
      missing,
    };
  });
}

export function getLocalizedCityName(city: string, locale?: string | null) {
  const displayLocale = normalizeAirportDisplayLocale(locale);
  return cityDisplayNames[city]?.[displayLocale] ?? city;
}

export function formatLocalizedAirportLabel({ city, code, locale }: { city: string; code: string; locale?: string | null }) {
  return `${getLocalizedCityName(city, locale)} (${code})`;
}

export function formatAirportLabel(airport: AirportOption, locale?: string | null) {
  return formatLocalizedAirportLabel({ city: airport.city, code: airport.code, locale });
}
