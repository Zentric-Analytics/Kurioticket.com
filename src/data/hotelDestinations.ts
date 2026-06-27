import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";

export type HotelDestinationKind = "city" | "district" | "landmark" | "airport-area";

export type HotelDestinationSuggestion = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  kind: HotelDestinationKind;
  searchValue: string;
  aliases?: string[];
};

export const activeHotelDestinationDisplayLocales = [
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
] as const;

export type HotelDestinationDisplayLocale =
  (typeof activeHotelDestinationDisplayLocales)[number];

type LocalizedHotelDestinationLabels = Record<
  HotelDestinationDisplayLocale,
  string
>;

type LocalizedHotelDestinationLabelOverrides = Partial<
  LocalizedHotelDestinationLabels
>;

export const normalizeHotelDestinationDisplayLocale = (
  locale?: string | null,
): HotelDestinationDisplayLocale => {
  const normalized = locale?.trim().toLowerCase().replace("_", "-") ?? "";

  if (normalized === "en" || normalized.startsWith("en-")) return "en-us";
  if (normalized === "es" || normalized.startsWith("es-")) return "es-es";
  if (normalized === "de" || normalized.startsWith("de-")) return "de-de";
  if (normalized === "it" || normalized.startsWith("it-")) return "it-it";
  if (normalized === "pt" || normalized.startsWith("pt-")) return "pt-br";
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-cn";
  if (normalized === "hi" || normalized.startsWith("hi-")) return "hi";
  if (normalized === "tr" || normalized.startsWith("tr-")) return "tr";
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("nl")) return "nl";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";

  return "en-us";
};

const createIdentityHotelLabels = (
  label: string,
): LocalizedHotelDestinationLabels =>
  Object.fromEntries(
    activeHotelDestinationDisplayLocales.map((locale) => [locale, label]),
  ) as LocalizedHotelDestinationLabels;

const hotelCityDisplayNameOverrides: Record<
  string,
  LocalizedHotelDestinationLabelOverrides
> = {
  "Abu Dhabi": { ar: "أبوظبي", "zh-cn": "阿布扎比", ja: "アブダビ", ko: "아부다비", hi: "अबू धाबी" },
  Abuja: { ar: "أبوجا", "es-es": "Abuya", "zh-cn": "阿布贾", ja: "アブジャ", ko: "아부자", hi: "अबुजा", tr: "Abuja" },
  Accra: { ar: "أكرا", "es-es": "Acra", "pt-br": "Acra", "zh-cn": "阿克拉", ja: "アクラ", ko: "아크라", hi: "अक्रा", tr: "Akra" },
  Amsterdam: { nl: "Amsterdam", "es-es": "Ámsterdam", "pt-br": "Amsterdã", "zh-cn": "阿姆斯特丹", ja: "アムステルダム", ko: "암스테르담" },
  Bangkok: { ar: "بانكوك", "zh-cn": "曼谷", ja: "バンコク", ko: "방콕", hi: "बैंकॉक", tr: "Bangkok" },
  Barcelona: { ar: "برشلونة", fr: "Barcelone", "it-it": "Barcellona", "zh-cn": "巴塞罗那", ja: "バルセロナ", ko: "바르셀로나", hi: "बार्सिलोना", tr: "Barselona" },
  Berlin: { ar: "برلين", nl: "Berlijn", "es-es": "Berlín", "it-it": "Berlino", "pt-br": "Berlim", "zh-cn": "柏林", ja: "ベルリン", ko: "베를린", hi: "बर्लिन" },
  Cairo: { ar: "القاهرة", nl: "Caïro", "es-es": "El Cairo", fr: "Le Caire", "de-de": "Kairo", "it-it": "Il Cairo", "zh-cn": "开罗", ja: "カイロ", ko: "카이로", hi: "काहिरा", tr: "Kahire" },
  Cancún: { ar: "كانكون", "zh-cn": "坎昆", ja: "カンクン", ko: "칸쿤", hi: "कैनकन", tr: "Cancun" },
  "Cape Town": { ar: "كيب تاون", nl: "Kaapstad", "es-es": "Ciudad del Cabo", fr: "Le Cap", "de-de": "Kapstadt", "it-it": "Città del Capo", "pt-br": "Cidade do Cabo", "zh-cn": "开普敦", ja: "ケープタウン", ko: "케이프타운", hi: "केप टाउन" },
  Cologne: { nl: "Keulen", "es-es": "Colonia", fr: "Cologne", "de-de": "Köln", "it-it": "Colonia", "pt-br": "Colônia", "zh-cn": "科隆", ja: "ケルン", ko: "쾰른", hi: "कोलोन", tr: "Köln" },
  Dubai: { ar: "دبي", "es-es": "Dubái", fr: "Dubaï", "zh-cn": "迪拜", ja: "ドバイ", ko: "두바이", hi: "दुबई" },
  Edinburgh: { ar: "إدنبرة", nl: "Edinburgh", "es-es": "Edimburgo", fr: "Édimbourg", "de-de": "Edinburgh", "it-it": "Edimburgo", "pt-br": "Edimburgo", "zh-cn": "爱丁堡", ja: "エディンバラ", ko: "에든버러", hi: "एडिनबरा" },
  Florence: { nl: "Florence", "es-es": "Florencia", fr: "Florence", "de-de": "Florenz", "it-it": "Firenze", "pt-br": "Florença", "zh-cn": "佛罗伦萨", ja: "フィレンツェ", ko: "피렌체", hi: "फ्लोरेंस", tr: "Floransa" },
  Frankfurt: { ar: "فرانكفورت", "es-es": "Fráncfort", fr: "Francfort", "it-it": "Francoforte", "zh-cn": "法兰克福", ja: "フランクフルト", ko: "프랑크푸르트", hi: "फ्रैंकफर्ट" },
  Istanbul: { ar: "إسطنبول", nl: "Istanboel", "es-es": "Estambul", "pt-br": "Istambul", "zh-cn": "伊斯坦布尔", ja: "イスタンブール", ko: "이스탄불", hi: "इस्तांबुल", tr: "İstanbul" },
  London: { ar: "لندن", nl: "Londen", "es-es": "Londres", fr: "Londres", "it-it": "Londra", "pt-br": "Londres", "zh-cn": "伦敦", ja: "ロンドン", ko: "런던", hi: "लंदन", tr: "Londra" },
  Lyon: { ar: "ليون", "zh-cn": "里昂", ja: "リヨン", ko: "리옹", hi: "ल्यों" },
  Marrakesh: { ar: "مراكش", "es-es": "Marrakech", fr: "Marrakech", "pt-br": "Marrakesh", "zh-cn": "马拉喀什", ja: "マラケシュ", ko: "마라케시", hi: "मराकेश" },
  Marseille: { ar: "مارسيليا", nl: "Marseille", "es-es": "Marsella", "it-it": "Marsiglia", "pt-br": "Marselha", "zh-cn": "马赛", ja: "マルセイユ", ko: "마르세유", hi: "मार्सेय" },
  "Mexico City": { ar: "مكسيكو سيتي", nl: "Mexico-Stad", "es-es": "Ciudad de México", fr: "Mexico", "de-de": "Mexiko-Stadt", "it-it": "Città del Messico", "pt-br": "Cidade do México", "zh-cn": "墨西哥城", ja: "メキシコシティ", ko: "멕시코시티", hi: "मेक्सिको सिटी", tr: "Meksiko Şehri" },
  Milan: { ar: "ميلانو", nl: "Milaan", "es-es": "Milán", "de-de": "Mailand", "it-it": "Milano", "pt-br": "Milão", "zh-cn": "米兰", ja: "ミラノ", ko: "밀라노", hi: "मिलान", tr: "Milano" },
  Munich: { ar: "ميونخ", nl: "München", "es-es": "Múnich", "de-de": "München", "it-it": "Monaco di Baviera", "pt-br": "Munique", "zh-cn": "慕尼黑", ja: "ミュンヘン", ko: "뮌헨", hi: "म्यूनिख", tr: "Münih" },
  Nairobi: { ar: "نيروبي", "pt-br": "Nairóbi", "zh-cn": "内罗毕", ja: "ナイロビ", ko: "나이로비", hi: "नैरोबी" },
  "New York": { ar: "نيويورك", "es-es": "Nueva York", "pt-br": "Nova York", "zh-cn": "纽约", ja: "ニューヨーク", ko: "뉴욕", hi: "न्यूयॉर्क" },
  Paris: { ar: "باريس", nl: "Parijs", "es-es": "París", "it-it": "Parigi", "zh-cn": "巴黎", ja: "パリ", ko: "파리", hi: "पेरिस", tr: "Paris" },
  Rome: { ar: "روما", "es-es": "Roma", "de-de": "Rom", "it-it": "Roma", "pt-br": "Roma", "zh-cn": "罗马", ja: "ローマ", ko: "로마", hi: "रोम", tr: "Roma" },
  Seville: { nl: "Sevilla", "es-es": "Sevilla", fr: "Séville", "de-de": "Sevilla", "it-it": "Siviglia", "pt-br": "Sevilha", "zh-cn": "塞维利亚", ja: "セビリア", ko: "세비야", hi: "सेविल", tr: "Sevilla" },
  Singapore: { ar: "سنغافورة", "es-es": "Singapur", fr: "Singapour", "de-de": "Singapur", "pt-br": "Singapura", "zh-cn": "新加坡", ja: "シンガポール", ko: "싱가포르", hi: "सिंगापुर", tr: "Singapur" },
  Tokyo: { ar: "طوكيو", nl: "Tokio", "es-es": "Tokio", "de-de": "Tokio", "pt-br": "Tóquio", "zh-cn": "东京", ja: "東京", ko: "도쿄", hi: "टोक्यो" },
  Venice: { ar: "البندقية", nl: "Venetië", "es-es": "Venecia", fr: "Venise", "de-de": "Venedig", "it-it": "Venezia", "pt-br": "Veneza", "zh-cn": "威尼斯", ja: "ヴェネツィア", ko: "베네치아", hi: "वेनिस", tr: "Venedik" },
  Zurich: { ar: "زيورخ", nl: "Zürich", "es-es": "Zúrich", "de-de": "Zürich", "it-it": "Zurigo", "pt-br": "Zurique", "zh-cn": "苏黎世", ja: "チューリッヒ", ko: "취리히", hi: "ज्यूरिख", tr: "Zürih" },
};

const hotelRegionDisplayNameOverrides: Record<
  string,
  LocalizedHotelDestinationLabelOverrides
> = {
  England: { ar: "إنجلترا", nl: "Engeland", "es-es": "Inglaterra", fr: "Angleterre", "de-de": "England", "it-it": "Inghilterra", "pt-br": "Inglaterra", "zh-cn": "英格兰", ja: "イングランド", ko: "잉글랜드", hi: "इंग्लैंड", tr: "İngiltere" },
  Scotland: { ar: "اسكتلندا", nl: "Schotland", "es-es": "Escocia", fr: "Écosse", "de-de": "Schottland", "it-it": "Scozia", "pt-br": "Escócia", "zh-cn": "苏格兰", ja: "スコットランド", ko: "스코틀랜드", hi: "स्कॉटलैंड", tr: "İskoçya" },
  "Île-de-France": { ar: "إيل دو فرانس", "zh-cn": "法兰西岛", ja: "イル＝ド＝フランス", ko: "일드프랑스", hi: "ईल-दे-फ्रांस", tr: "Île-de-France" },
  "French Riviera": { ar: "الريفيرا الفرنسية", nl: "Franse Rivièra", "es-es": "Riviera francesa", fr: "Côte d’Azur", "de-de": "Französische Riviera", "it-it": "Costa Azzurra", "pt-br": "Riviera Francesa", "zh-cn": "法国里维埃拉", ja: "フレンチ・リビエラ", ko: "프렌치 리비에라", hi: "फ्रेंच रिविएरा", tr: "Fransız Rivierası" },
  Bavaria: { ar: "بافاريا", nl: "Beieren", "es-es": "Baviera", fr: "Bavière", "de-de": "Bayern", "it-it": "Baviera", "pt-br": "Baviera", "zh-cn": "巴伐利亚", ja: "バイエルン", ko: "바이에른", hi: "बवेरिया", tr: "Bavyera" },
  Hesse: { ar: "هسن", nl: "Hessen", "es-es": "Hesse", fr: "Hesse", "de-de": "Hessen", "it-it": "Assia", "pt-br": "Hesse", "zh-cn": "黑森", ja: "ヘッセン", ko: "헤센", hi: "हेसे", tr: "Hessen" },
  "North Rhine-Westphalia": { ar: "شمال الراين وستفاليا", nl: "Noordrijn-Westfalen", "es-es": "Renania del Norte-Westfalia", fr: "Rhénanie-du-Nord-Westphalie", "de-de": "Nordrhein-Westfalen", "it-it": "Renania Settentrionale-Vestfalia", "pt-br": "Renânia do Norte-Vestfália", "zh-cn": "北莱茵-威斯特法伦", ja: "ノルトライン＝ヴェストファーレン", ko: "노르트라인베스트팔렌", hi: "नॉर्थ राइन-वेस्टफेलिया", tr: "Kuzey Ren-Vestfalya" },
  Lazio: { ar: "لاتسيو", "zh-cn": "拉齐奥", ja: "ラツィオ", ko: "라치오", hi: "लात्सियो", tr: "Lazio" },
  Lombardy: { ar: "لومبارديا", nl: "Lombardije", "es-es": "Lombardía", fr: "Lombardie", "de-de": "Lombardei", "it-it": "Lombardia", "pt-br": "Lombardia", "zh-cn": "伦巴第", ja: "ロンバルディア", ko: "롬바르디아", hi: "लोम्बार्डी", tr: "Lombardiya" },
  Tuscany: { ar: "توسكانا", nl: "Toscane", "es-es": "Toscana", fr: "Toscane", "de-de": "Toskana", "it-it": "Toscana", "pt-br": "Toscana", "zh-cn": "托斯卡纳", ja: "トスカーナ", ko: "토스카나", hi: "टस्कनी", tr: "Toskana" },
  Catalonia: { ar: "كتالونيا", nl: "Catalonië", "es-es": "Cataluña", fr: "Catalogne", "de-de": "Katalonien", "it-it": "Catalogna", "pt-br": "Catalunha", "zh-cn": "加泰罗尼亚", ja: "カタルーニャ", ko: "카탈루냐", hi: "कैटालोनिया", tr: "Katalonya" },
  Andalusia: { ar: "الأندلس", nl: "Andalusië", "es-es": "Andalucía", fr: "Andalousie", "de-de": "Andalusien", "it-it": "Andalusia", "pt-br": "Andaluzia", "zh-cn": "安达卢西亚", ja: "アンダルシア", ko: "안달루시아", hi: "अंदालूसिया", tr: "Endülüs" },
  Rivers: { ar: "ريفرز", "zh-cn": "河流州", ja: "リバーズ", ko: "리버스", hi: "रिवर्स", tr: "Rivers" },
};

const uniqueHotelDestinationLabels = (selector: (destination: HotelDestinationSuggestion) => string | undefined) =>
  [...new Set(hotelDestinations.map(selector).filter((value): value is string => Boolean(value)))];

const hotelCityDisplayNames = () =>
  Object.fromEntries(
    uniqueHotelDestinationLabels((destination) => destination.name).map((city) => [
      city,
      { ...createIdentityHotelLabels(city), ...hotelCityDisplayNameOverrides[city] },
    ]),
  ) as Record<string, LocalizedHotelDestinationLabels>;

const hotelRegionDisplayNames = () =>
  Object.fromEntries(
    uniqueHotelDestinationLabels((destination) => destination.region).map((region) => [
      region,
      { ...createIdentityHotelLabels(region), ...hotelRegionDisplayNameOverrides[region] },
    ]),
  ) as Record<string, LocalizedHotelDestinationLabels>;

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export const hotelDestinations: HotelDestinationSuggestion[] = [
  { id: "us-new-york", name: "New York", region: "New York", country: "United States", countryCode: "US", kind: "city", searchValue: "New York, NY", aliases: ["nyc", "manhattan", "brooklyn"] },
  { id: "us-los-angeles", name: "Los Angeles", region: "California", country: "United States", countryCode: "US", kind: "city", searchValue: "Los Angeles, CA", aliases: ["la", "hollywood", "santa monica"] },
  { id: "us-las-vegas", name: "Las Vegas", region: "Nevada", country: "United States", countryCode: "US", kind: "city", searchValue: "Las Vegas, NV", aliases: ["vegas", "the strip"] },
  { id: "us-miami", name: "Miami", region: "Florida", country: "United States", countryCode: "US", kind: "city", searchValue: "Miami, FL", aliases: ["south beach", "miami beach"] },
  { id: "us-chicago", name: "Chicago", region: "Illinois", country: "United States", countryCode: "US", kind: "city", searchValue: "Chicago, IL", aliases: ["magnificent mile"] },
  { id: "us-orlando", name: "Orlando", region: "Florida", country: "United States", countryCode: "US", kind: "city", searchValue: "Orlando, FL", aliases: ["disney world", "theme parks"] },
  { id: "us-san-francisco", name: "San Francisco", region: "California", country: "United States", countryCode: "US", kind: "city", searchValue: "San Francisco, CA", aliases: ["sf", "fisherman's wharf"] },
  { id: "us-honolulu", name: "Honolulu", region: "Hawaii", country: "United States", countryCode: "US", kind: "city", searchValue: "Honolulu, HI", aliases: ["waikiki", "oahu"] },
  { id: "us-jfk-area", name: "JFK Airport area", region: "New York", country: "United States", countryCode: "US", kind: "airport-area", searchValue: "JFK Airport area, New York", aliases: ["john f kennedy", "jfk"] },

  { id: "gb-london", name: "London", region: "England", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "London, United Kingdom", aliases: ["westminster", "soho", "heathrow"] },
  { id: "gb-edinburgh", name: "Edinburgh", region: "Scotland", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "Edinburgh, United Kingdom", aliases: ["old town", "royal mile"] },
  { id: "gb-manchester", name: "Manchester", region: "England", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "Manchester, United Kingdom" },
  { id: "gb-birmingham", name: "Birmingham", region: "England", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "Birmingham, United Kingdom" },
  { id: "gb-heathrow-area", name: "Heathrow Airport area", region: "London", country: "United Kingdom", countryCode: "GB", kind: "airport-area", searchValue: "Heathrow Airport area, London", aliases: ["lhr"] },

  { id: "fr-paris", name: "Paris", region: "Île-de-France", country: "France", countryCode: "FR", kind: "city", searchValue: "Paris, France", aliases: ["eiffel tower", "latin quarter", "le marais"] },
  { id: "fr-nice", name: "Nice", region: "French Riviera", country: "France", countryCode: "FR", kind: "city", searchValue: "Nice, France", aliases: ["cote d'azur", "french riviera"] },
  { id: "fr-lyon", name: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France", countryCode: "FR", kind: "city", searchValue: "Lyon, France" },
  { id: "fr-marseille", name: "Marseille", region: "Provence-Alpes-Côte d'Azur", country: "France", countryCode: "FR", kind: "city", searchValue: "Marseille, France" },
  { id: "fr-cdg-area", name: "Charles de Gaulle Airport area", region: "Paris", country: "France", countryCode: "FR", kind: "airport-area", searchValue: "Charles de Gaulle Airport area, Paris", aliases: ["cdg"] },

  { id: "de-berlin", name: "Berlin", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Berlin, Germany", aliases: ["mitte", "brandenburg gate"] },
  { id: "de-munich", name: "Munich", region: "Bavaria", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Munich, Germany", aliases: ["muenchen", "oktoberfest"] },
  { id: "de-hamburg", name: "Hamburg", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Hamburg, Germany", aliases: ["hafencity", "st pauli"] },
  { id: "de-frankfurt", name: "Frankfurt", region: "Hesse", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Frankfurt, Germany", aliases: ["frankfurt airport"] },
  { id: "de-cologne", name: "Cologne", region: "North Rhine-Westphalia", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Cologne, Germany", aliases: ["koln", "koeln", "cologne cathedral"] },

  { id: "it-rome", name: "Rome", region: "Lazio", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Rome, Italy", aliases: ["roma", "colosseum", "vatican"] },
  { id: "it-milan", name: "Milan", region: "Lombardy", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Milan, Italy", aliases: ["milano", "duomo"] },
  { id: "it-venice", name: "Venice", region: "Veneto", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Venice, Italy", aliases: ["venezia"] },
  { id: "it-florence", name: "Florence", region: "Tuscany", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Florence, Italy", aliases: ["firenze"] },

  { id: "es-madrid", name: "Madrid", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Madrid, Spain", aliases: ["gran via"] },
  { id: "es-barcelona", name: "Barcelona", region: "Catalonia", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Barcelona, Spain", aliases: ["gothic quarter", "sagrada familia"] },
  { id: "es-seville", name: "Seville", region: "Andalusia", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Seville, Spain", aliases: ["sevilla"] },
  { id: "es-valencia", name: "Valencia", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Valencia, Spain" },

  { id: "nl-amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL", kind: "city", searchValue: "Amsterdam, Netherlands", aliases: ["canal ring", "schiphol"] },
  { id: "nl-rotterdam", name: "Rotterdam", country: "Netherlands", countryCode: "NL", kind: "city", searchValue: "Rotterdam, Netherlands" },
  { id: "nl-the-hague", name: "The Hague", country: "Netherlands", countryCode: "NL", kind: "city", searchValue: "The Hague, Netherlands", aliases: ["den haag"] },

  { id: "ch-zurich", name: "Zurich", country: "Switzerland", countryCode: "CH", kind: "city", searchValue: "Zurich, Switzerland", aliases: ["zuerich"] },
  { id: "tr-istanbul", name: "Istanbul", country: "Türkiye", countryCode: "TR", kind: "city", searchValue: "Istanbul, Türkiye", aliases: ["sultanahmet", "taksim"] },

  { id: "ca-toronto", name: "Toronto", region: "Ontario", country: "Canada", countryCode: "CA", kind: "city", searchValue: "Toronto, Canada", aliases: ["downtown toronto"] },
  { id: "ca-vancouver", name: "Vancouver", region: "British Columbia", country: "Canada", countryCode: "CA", kind: "city", searchValue: "Vancouver, Canada" },
  { id: "ca-montreal", name: "Montreal", region: "Quebec", country: "Canada", countryCode: "CA", kind: "city", searchValue: "Montreal, Canada", aliases: ["montréal"] },

  { id: "mx-mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX", kind: "city", searchValue: "Mexico City, Mexico", aliases: ["cdmx", "roma norte", "polanco"] },
  { id: "mx-cancun", name: "Cancún", region: "Quintana Roo", country: "Mexico", countryCode: "MX", kind: "city", searchValue: "Cancún, Mexico", aliases: ["cancun", "hotel zone"] },
  { id: "mx-guadalajara", name: "Guadalajara", region: "Jalisco", country: "Mexico", countryCode: "MX", kind: "city", searchValue: "Guadalajara, Mexico" },

  { id: "br-rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", kind: "city", searchValue: "Rio de Janeiro, Brazil", aliases: ["copacabana", "ipanema"] },
  { id: "br-sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR", kind: "city", searchValue: "São Paulo, Brazil", aliases: ["sao paulo", "paulista"] },
  { id: "br-salvador", name: "Salvador", region: "Bahia", country: "Brazil", countryCode: "BR", kind: "city", searchValue: "Salvador, Brazil" },
  { id: "ar-buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", kind: "city", searchValue: "Buenos Aires, Argentina", aliases: ["palermo", "recoleta"] },
  { id: "co-cartagena", name: "Cartagena", country: "Colombia", countryCode: "CO", kind: "city", searchValue: "Cartagena, Colombia", aliases: ["walled city"] },
  { id: "pe-lima", name: "Lima", country: "Peru", countryCode: "PE", kind: "city", searchValue: "Lima, Peru", aliases: ["miraflores"] },

  { id: "jp-tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", kind: "city", searchValue: "Tokyo, Japan", aliases: ["shinjuku", "shibuya", "haneda", "narita"] },
  { id: "jp-kyoto", name: "Kyoto", country: "Japan", countryCode: "JP", kind: "city", searchValue: "Kyoto, Japan", aliases: ["gion"] },
  { id: "jp-osaka", name: "Osaka", country: "Japan", countryCode: "JP", kind: "city", searchValue: "Osaka, Japan", aliases: ["namba", "umeda"] },
  { id: "kr-seoul", name: "Seoul", country: "South Korea", countryCode: "KR", kind: "city", searchValue: "Seoul, South Korea", aliases: ["gangnam", "myeongdong"] },
  { id: "cn-shanghai", name: "Shanghai", country: "China", countryCode: "CN", kind: "city", searchValue: "Shanghai, China", aliases: ["the bund", "pudong"] },
  { id: "hk-hong-kong", name: "Hong Kong", country: "Hong Kong", countryCode: "HK", kind: "city", searchValue: "Hong Kong", aliases: ["kowloon", "central"] },
  { id: "sg-singapore", name: "Singapore", country: "Singapore", countryCode: "SG", kind: "city", searchValue: "Singapore", aliases: ["marina bay", "sentosa", "changi"] },
  { id: "th-bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", kind: "city", searchValue: "Bangkok, Thailand", aliases: ["sukhumvit", "siam"] },
  { id: "id-bali", name: "Bali", country: "Indonesia", countryCode: "ID", kind: "district", searchValue: "Bali, Indonesia", aliases: ["ubud", "seminyak", "canggu"] },
  { id: "my-kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", kind: "city", searchValue: "Kuala Lumpur, Malaysia", aliases: ["bukit bintang"] },
  { id: "ph-manila", name: "Manila", country: "Philippines", countryCode: "PH", kind: "city", searchValue: "Manila, Philippines", aliases: ["makati", "bonifacio global city", "bgc"] },

  { id: "in-delhi", name: "Delhi", country: "India", countryCode: "IN", kind: "city", searchValue: "Delhi, India", aliases: ["new delhi", "connaught place"] },
  { id: "in-mumbai", name: "Mumbai", region: "Maharashtra", country: "India", countryCode: "IN", kind: "city", searchValue: "Mumbai, India", aliases: ["bombay", "bandra"] },
  { id: "in-bengaluru", name: "Bengaluru", region: "Karnataka", country: "India", countryCode: "IN", kind: "city", searchValue: "Bengaluru, India", aliases: ["bangalore"] },
  { id: "in-goa", name: "Goa", country: "India", countryCode: "IN", kind: "district", searchValue: "Goa, India", aliases: ["panaji", "north goa"] },

  { id: "ae-dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", kind: "city", searchValue: "Dubai, United Arab Emirates", aliases: ["downtown dubai", "jumeirah", "dxb"] },
  { id: "ae-abu-dhabi", name: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", kind: "city", searchValue: "Abu Dhabi, United Arab Emirates", aliases: ["yas island"] },
  { id: "ae-sharjah", name: "Sharjah", country: "United Arab Emirates", countryCode: "AE", kind: "city", searchValue: "Sharjah, United Arab Emirates" },
  { id: "sa-riyadh", name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", kind: "city", searchValue: "Riyadh, Saudi Arabia" },
  { id: "eg-cairo", name: "Cairo", country: "Egypt", countryCode: "EG", kind: "city", searchValue: "Cairo, Egypt", aliases: ["giza", "pyramids"] },
  { id: "ma-marrakesh", name: "Marrakesh", country: "Morocco", countryCode: "MA", kind: "city", searchValue: "Marrakesh, Morocco", aliases: ["marrakech", "medina"] },

  { id: "za-cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA", kind: "city", searchValue: "Cape Town, South Africa", aliases: ["waterfront", "camps bay"] },
  { id: "za-johannesburg", name: "Johannesburg", region: "Gauteng", country: "South Africa", countryCode: "ZA", kind: "city", searchValue: "Johannesburg, South Africa", aliases: ["sandton"] },
  { id: "za-durban", name: "Durban", region: "KwaZulu-Natal", country: "South Africa", countryCode: "ZA", kind: "city", searchValue: "Durban, South Africa" },
  { id: "ke-nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", kind: "city", searchValue: "Nairobi, Kenya", aliases: ["westlands"] },
  { id: "ke-mombasa", name: "Mombasa", country: "Kenya", countryCode: "KE", kind: "city", searchValue: "Mombasa, Kenya", aliases: ["nyali"] },
  { id: "ng-lagos", name: "Lagos", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Lagos, Nigeria", aliases: ["victoria island", "ikeja", "lekki"] },
  { id: "ng-abuja", name: "Abuja", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Abuja, Nigeria", aliases: ["maitama", "wuse"] },
  { id: "ng-port-harcourt", name: "Port Harcourt", region: "Rivers", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Port Harcourt, Nigeria", aliases: ["phc", "rivers state"] },
  { id: "gh-accra", name: "Accra", country: "Ghana", countryCode: "GH", kind: "city", searchValue: "Accra, Ghana", aliases: ["osu", "airport city"] },
  { id: "gh-kumasi", name: "Kumasi", country: "Ghana", countryCode: "GH", kind: "city", searchValue: "Kumasi, Ghana" },

  { id: "au-sydney", name: "Sydney", region: "New South Wales", country: "Australia", countryCode: "AU", kind: "city", searchValue: "Sydney, Australia", aliases: ["darling harbour", "bondi"] },
  { id: "au-melbourne", name: "Melbourne", region: "Victoria", country: "Australia", countryCode: "AU", kind: "city", searchValue: "Melbourne, Australia" },
  { id: "au-brisbane", name: "Brisbane", region: "Queensland", country: "Australia", countryCode: "AU", kind: "city", searchValue: "Brisbane, Australia" },
];

const cityDisplayNames = hotelCityDisplayNames();
const regionDisplayNames = hotelRegionDisplayNames();

export function getLocalizedHotelDestinationCityName(
  city: string,
  locale?: string | null,
) {
  const displayLocale = normalizeHotelDestinationDisplayLocale(locale);
  return cityDisplayNames[city]?.[displayLocale] ?? city;
}

export function getLocalizedHotelDestinationRegionName(
  region: string | undefined,
  locale?: string | null,
) {
  if (!region) return "";
  const displayLocale = normalizeHotelDestinationDisplayLocale(locale);
  return regionDisplayNames[region]?.[displayLocale] ?? region;
}

export function getLocalizedHotelDestinationCountryName(
  destination: Pick<HotelDestinationSuggestion, "country" | "countryCode">,
  locale?: string | null,
) {
  return getCountryDisplayNameForLocale(
    destination.countryCode,
    locale,
    destination.country,
  );
}

export function getLocalizedHotelDestinationDetail(
  destination: Pick<
    HotelDestinationSuggestion,
    "region" | "country" | "countryCode"
  >,
  locale?: string | null,
) {
  const region = getLocalizedHotelDestinationRegionName(
    destination.region,
    locale,
  );
  const country = getLocalizedHotelDestinationCountryName(destination, locale);

  return [region, country].filter(Boolean).join(", ") || country;
}

export function getHotelDestinationLocalizationCoverage() {
  const uniqueCities = uniqueHotelDestinationLabels(
    (destination) => destination.name,
  );
  const uniqueRegions = uniqueHotelDestinationLabels(
    (destination) => destination.region,
  );
  const uniqueCountries = new Map<string, string>();

  for (const destination of hotelDestinations) {
    uniqueCountries.set(destination.countryCode, destination.country);
  }

  return activeHotelDestinationDisplayLocales.map((locale) => {
    const missingCities = uniqueCities.filter(
      (city) => !cityDisplayNames[city]?.[locale],
    );
    const missingRegions = uniqueRegions.filter(
      (region) => !regionDisplayNames[region]?.[locale],
    );
    const missingCountries = [...uniqueCountries].filter(
      ([countryCode, fallbackName]) =>
        !getCountryDisplayNameForLocale(countryCode, locale, fallbackName),
    );
    const cityIdentity = uniqueCities.filter(
      (city) => cityDisplayNames[city]?.[locale] === city,
    ).length;
    const regionIdentity = uniqueRegions.filter(
      (region) => regionDisplayNames[region]?.[locale] === region,
    ).length;
    const countryIdentity = [...uniqueCountries].filter(
      ([countryCode, fallbackName]) =>
        getCountryDisplayNameForLocale(countryCode, locale, fallbackName) ===
        fallbackName,
    ).length;
    const fallbackCount =
      missingCities.length + missingRegions.length + missingCountries.length;

    return {
      locale,
      cities: uniqueCities.length,
      regions: uniqueRegions.length,
      countries: uniqueCountries.size,
      missingCities,
      missingRegions,
      missingCountries: missingCountries.map(([countryCode]) => countryCode),
      fallbackCount,
      intentionalIdentityCount: cityIdentity + regionIdentity + countryIdentity,
    };
  });
}

const defaultGlobalDestinationIds = [
  "gb-london",
  "fr-paris",
  "it-rome",
  "jp-tokyo",
  "ae-dubai",
  "us-new-york",
  "sg-singapore",
  "ng-lagos",
];

const normalizeCountryHint = (countryCode?: string | null) => {
  const normalized = countryCode?.trim().toUpperCase() || "";
  if (normalized === "EU") return normalized;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
};

const countryMatchesHint = (destination: HotelDestinationSuggestion, countryHint: string) => {
  if (!countryHint) return false;
  if (countryHint === "EU") return EU_COUNTRY_CODES.has(destination.countryCode);
  return destination.countryCode === countryHint;
};

const primarySearchTextForDestination = (destination: HotelDestinationSuggestion) =>
  [destination.name, destination.searchValue, ...(destination.aliases ?? [])]
    .filter(Boolean)
    .map((value) => normalizeText(String(value)));

const contextSearchTextForDestination = (destination: HotelDestinationSuggestion) =>
  [destination.region, destination.country, destination.countryCode, destination.kind.replace("-", " ")]
    .filter(Boolean)
    .map((value) => normalizeText(String(value)));

const hasWordStartingWith = (value: string, query: string) =>
  value.split(/\s+/).some((part) => part.startsWith(query));

const uniqueById = (destinations: HotelDestinationSuggestion[]) => {
  const seen = new Set<string>();
  return destinations.filter((destination) => {
    if (seen.has(destination.id)) return false;
    seen.add(destination.id);
    return true;
  });
};

const globalDefaultDestinations = () =>
  defaultGlobalDestinationIds
    .map((id) => hotelDestinations.find((destination) => destination.id === id))
    .filter((destination): destination is HotelDestinationSuggestion => Boolean(destination));

const defaultDestinationSort = (a: HotelDestinationSuggestion, b: HotelDestinationSuggestion) => {
  const cityDelta = Number(b.kind === "city") - Number(a.kind === "city");
  if (cityDelta !== 0) return cityDelta;
  const airportDelta = Number(a.kind === "airport-area") - Number(b.kind === "airport-area");
  if (airportDelta !== 0) return airportDelta;
  return hotelDestinations.indexOf(a) - hotelDestinations.indexOf(b);
};

type QueryMatch = {
  destination: HotelDestinationSuggestion;
  index: number;
  isLocal: boolean;
  exactOrPrefix: boolean;
  wordOrAliasPrefix: boolean;
  contains: boolean;
  contextPrefix: boolean;
};

const getQueryMatch = (
  destination: HotelDestinationSuggestion,
  query: string,
  countryHint: string,
  index: number,
): QueryMatch | null => {
  const primarySearchText = primarySearchTextForDestination(destination);
  const contextSearchText = contextSearchTextForDestination(destination);
  const directName = normalizeText(destination.name);
  const directSearchValue = normalizeText(destination.searchValue);
  const exactOrPrefix =
    directName === query ||
    directSearchValue === query ||
    directName.startsWith(query) ||
    directSearchValue.startsWith(query);
  const wordOrAliasPrefix = primarySearchText.some((value) => hasWordStartingWith(value, query));
  const contains = primarySearchText.some((value) => value.includes(query));
  const contextPrefix = contextSearchText.some((value) => hasWordStartingWith(value, query));

  if (!exactOrPrefix && !wordOrAliasPrefix && !contains && !contextPrefix) return null;

  return {
    destination,
    index,
    isLocal: countryMatchesHint(destination, countryHint),
    exactOrPrefix,
    wordOrAliasPrefix,
    contains,
    contextPrefix,
  };
};

const queryMatchTier = (match: QueryMatch) => {
  if (match.isLocal && match.exactOrPrefix) return 0;
  if (match.exactOrPrefix) return 1;
  if (match.isLocal && match.wordOrAliasPrefix) return 2;
  if (match.wordOrAliasPrefix) return 3;
  if (match.isLocal && match.contains) return 4;
  if (match.contains) return 5;
  if (match.isLocal && match.contextPrefix) return 6;
  return 7;
};

const queryMatchStrength = (match: QueryMatch) =>
  Number(match.exactOrPrefix) * 8 +
  Number(match.wordOrAliasPrefix) * 4 +
  Number(match.contains) * 2 +
  Number(match.contextPrefix);

export function searchHotelDestinations({
  query,
  countryCode,
  limit = 8,
}: {
  query?: string;
  countryCode?: string | null;
  limit?: number;
}) {
  const normalizedQuery = normalizeText(query ?? "");
  const normalizedCountryHint = normalizeCountryHint(countryCode);

  if (!normalizedQuery) {
    const countryDefaults = normalizedCountryHint
      ? hotelDestinations
          .filter((destination) => countryMatchesHint(destination, normalizedCountryHint))
          .sort(defaultDestinationSort)
      : [];

    return uniqueById([...countryDefaults, ...globalDefaultDestinations()]).slice(0, limit);
  }

  return hotelDestinations
    .map((destination, index) => getQueryMatch(destination, normalizedQuery, normalizedCountryHint, index))
    .filter((match): match is QueryMatch => Boolean(match))
    .sort((a, b) => {
      const tierDelta = queryMatchTier(a) - queryMatchTier(b);
      if (tierDelta !== 0) return tierDelta;

      const strengthDelta = queryMatchStrength(b) - queryMatchStrength(a);
      if (strengthDelta !== 0) return strengthDelta;

      const cityDelta = Number(b.destination.kind === "city") - Number(a.destination.kind === "city");
      if (cityDelta !== 0) return cityDelta;

      const airportDelta = Number(a.destination.kind === "airport-area") - Number(b.destination.kind === "airport-area");
      if (airportDelta !== 0) return airportDelta;

      return a.index - b.index;
    })
    .map((match) => match.destination)
    .slice(0, limit);
}
