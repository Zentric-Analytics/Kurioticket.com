import { mobileLocales, type MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { formatCabinClass } from "./flightCardSummaries";

export type FlightResultsSummaryInput = {
  origin?: unknown;
  destination?: unknown;
  tripType?: unknown;
  departureDate?: unknown;
  returnDate?: unknown;
  adults?: unknown;
  children?: unknown;
  infants?: unknown;
  travelers?: unknown;
  cabinClass?: unknown;
};

const count = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

type FlightResultsCopy = {
  oneWay: string;
  roundTrip: string;
  multiCity: string;
  traveler: string;
  travelers: string;
  viewFlight: string;
  viewDeals?: string;
  baggage: string;
  cabin: string;
  fareRule: string;
  estimatedPrice: string;
  providerPrice: string;
  fareRules?: string; review?: string; viewDeal?: string; trackTitle?: string; trackAction?: string; tracking?: string; checking?: string;
};

const copy: Record<MobileLocale, FlightResultsCopy> = {
  "en-us": { oneWay:"One-way",roundTrip:"Round-trip",multiCity:"Multi-city",traveler:"traveler",travelers:"travelers",viewFlight:"View Flight",viewDeals:"View deals",baggage:"Baggage",cabin:"Cabin",fareRule:"Fare rule",estimatedPrice:"ESTIMATED PRICE",providerPrice:"PROVIDER PRICE",fareRules:"Fare rules",review:"Review",viewDeal:"View deal",trackTitle:"Track this flight price",trackAction:"Track price",tracking:"Tracking",checking:"Checking…" },
  "es-es": { oneWay:"Solo ida",roundTrip:"Ida y vuelta",multiCity:"Varias ciudades",traveler:"viajero",travelers:"viajeros",viewFlight:"Ver vuelo",baggage:"Equipaje",cabin:"Cabina",fareRule:"Regla tarifaria",estimatedPrice:"PRECIO ESTIMADO",providerPrice:"PRECIO DEL PROVEEDOR" },
  fr: { oneWay:"Aller simple",roundTrip:"Aller-retour",multiCity:"Multi-destinations",traveler:"voyageur",travelers:"voyageurs",viewFlight:"Voir le vol",baggage:"Bagages",cabin:"Cabine",fareRule:"Règle tarifaire",estimatedPrice:"PRIX ESTIMÉ",providerPrice:"PRIX DU FOURNISSEUR",fareRules:"Règles",review:"Consulter",viewDeal:"Voir l’offre",trackTitle:"Suivre le prix du vol",trackAction:"Suivre le prix",tracking:"Suivi actif",checking:"Vérification…" },
  "de-de": { oneWay:"Hinflug",roundTrip:"Hin- und Rückflug",multiCity:"Mehrere Städte",traveler:"Reisender",travelers:"Reisende",viewFlight:"Flug ansehen",baggage:"Gepäck",cabin:"Kabine",fareRule:"Tarifregel",estimatedPrice:"GESCHÄTZTER PREIS",providerPrice:"ANBIETERPREIS",fareRules:"Tarifregeln",review:"Prüfen",viewDeal:"Angebot ansehen",trackTitle:"Flugpreis verfolgen",trackAction:"Preis verfolgen",tracking:"Wird verfolgt",checking:"Prüfen…" },
  "it-it": { oneWay:"Solo andata",roundTrip:"Andata e ritorno",multiCity:"Più città",traveler:"viaggiatore",travelers:"viaggiatori",viewFlight:"Vedi volo",baggage:"Bagaglio",cabin:"Cabina",fareRule:"Regola tariffaria",estimatedPrice:"PREZZO STIMATO",providerPrice:"PREZZO DEL FORNITORE" },
  "pt-br": { oneWay:"Só ida",roundTrip:"Ida e volta",multiCity:"Várias cidades",traveler:"viajante",travelers:"viajantes",viewFlight:"Ver voo",baggage:"Bagagem",cabin:"Cabine",fareRule:"Regra tarifária",estimatedPrice:"PREÇO ESTIMADO",providerPrice:"PREÇO DO FORNECEDOR" },
  nl: { oneWay:"Enkele reis",roundTrip:"Retour",multiCity:"Meerdere steden",traveler:"reiziger",travelers:"reizigers",viewFlight:"Vlucht bekijken",baggage:"Bagage",cabin:"Cabine",fareRule:"Tariefregel",estimatedPrice:"GESCHATTE PRIJS",providerPrice:"PRIJS VAN AANBIEDER" },
  ar: { oneWay:"ذهاب فقط",roundTrip:"ذهاب وعودة",multiCity:"وجهات متعددة",traveler:"مسافر",travelers:"مسافرون",viewFlight:"عرض الرحلة",baggage:"الأمتعة",cabin:"المقصورة",fareRule:"قاعدة السعر",estimatedPrice:"السعر التقديري",providerPrice:"سعر المزوّد",fareRules:"قواعد السعر",review:"مراجعة",viewDeal:"عرض الصفقة",trackTitle:"تتبّع سعر الرحلة",trackAction:"تتبّع السعر",tracking:"قيد التتبّع",checking:"جارٍ التحقق…" },
  "zh-cn": { oneWay:"单程",roundTrip:"往返",multiCity:"多城市",traveler:"位旅客",travelers:"位旅客",viewFlight:"查看航班",baggage:"行李",cabin:"舱位",fareRule:"票价规则",estimatedPrice:"预估价格",providerPrice:"供应商价格" },
  ja: { oneWay:"片道",roundTrip:"往復",multiCity:"複数都市",traveler:"名",travelers:"名",viewFlight:"フライトを見る",baggage:"手荷物",cabin:"座席クラス",fareRule:"運賃規則",estimatedPrice:"推定価格",providerPrice:"プロバイダー価格" },
  ko: { oneWay:"편도",roundTrip:"왕복",multiCity:"다구간",traveler:"명",travelers:"명",viewFlight:"항공편 보기",baggage:"수하물",cabin:"좌석 등급",fareRule:"운임 규정",estimatedPrice:"예상 가격",providerPrice:"제공업체 가격" },
  hi: { oneWay:"एकतरफ़ा",roundTrip:"आना-जाना",multiCity:"कई शहर",traveler:"यात्री",travelers:"यात्री",viewFlight:"उड़ान देखें",baggage:"सामान",cabin:"केबिन",fareRule:"किराया नियम",estimatedPrice:"अनुमानित कीमत",providerPrice:"प्रदाता कीमत" },
  tr: { oneWay:"Tek yön",roundTrip:"Gidiş-dönüş",multiCity:"Çoklu şehir",traveler:"yolcu",travelers:"yolcu",viewFlight:"Uçuşu görüntüle",baggage:"Bagaj",cabin:"Kabin",fareRule:"Ücret kuralı",estimatedPrice:"TAHMİNİ FİYAT",providerPrice:"SAĞLAYICI FİYATI" },
  pl: { oneWay:"W jedną stronę",roundTrip:"W obie strony",multiCity:"Wiele miast",traveler:"podróżny",travelers:"podróżnych",viewFlight:"Zobacz lot",baggage:"Bagaż",cabin:"Kabina",fareRule:"Zasady taryfy",estimatedPrice:"SZACOWANA CENA",providerPrice:"CENA DOSTAWCY" },
  sv: { oneWay:"Enkel resa",roundTrip:"Tur och retur",multiCity:"Flera städer",traveler:"resenär",travelers:"resenärer",viewFlight:"Visa flyg",baggage:"Bagage",cabin:"Kabin",fareRule:"Prisregel",estimatedPrice:"UPPSKATTAT PRIS",providerPrice:"LEVERANTÖRSPRIS" },
  id: { oneWay:"Sekali jalan",roundTrip:"Pulang-pergi",multiCity:"Multi-kota",traveler:"wisatawan",travelers:"wisatawan",viewFlight:"Lihat penerbangan",baggage:"Bagasi",cabin:"Kabin",fareRule:"Aturan tarif",estimatedPrice:"HARGA PERKIRAAN",providerPrice:"HARGA PENYEDIA" },
  th: { oneWay:"เที่ยวเดียว",roundTrip:"ไป-กลับ",multiCity:"หลายเมือง",traveler:"ผู้เดินทาง",travelers:"ผู้เดินทาง",viewFlight:"ดูเที่ยวบิน",baggage:"สัมภาระ",cabin:"ชั้นโดยสาร",fareRule:"กฎค่าโดยสาร",estimatedPrice:"ราคาโดยประมาณ",providerPrice:"ราคาจากผู้ให้บริการ" },
  vi: { oneWay:"Một chiều",roundTrip:"Khứ hồi",multiCity:"Nhiều thành phố",traveler:"hành khách",travelers:"hành khách",viewFlight:"Xem chuyến bay",baggage:"Hành lý",cabin:"Hạng ghế",fareRule:"Quy định giá vé",estimatedPrice:"GIÁ ƯỚC TÍNH",providerPrice:"GIÁ NHÀ CUNG CẤP" },
};

export const flightResultsCopy = (locale: MobileLocale) => {
  const localized = copy[locale];
  return {
    ...copy["en-us"],
    ...localized,
    fareRules: localized.fareRules ?? localized.fareRule,
    viewDeal: localized.viewDeal ?? localized.viewFlight,
    viewDeals: localized.viewDeals ?? localized.viewDeal ?? localized.viewFlight,
  } as Required<FlightResultsCopy>;
};

const dateLabel = (value: unknown, locale: MobileLocale) => {
  const iso = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const intl = mobileLocales.find((option) => option.code === locale)?.intl ?? "en-US";
  return new Intl.DateTimeFormat(intl, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
};

export function flightResultsSummary(input: FlightResultsSummaryInput, locale: MobileLocale) {
  const labels = copy[locale];
  const origin = String(input.origin ?? "").trim().toUpperCase();
  const destination = String(input.destination ?? "").trim().toUpperCase();
  const tripType = input.tripType === "one-way" ? labels.oneWay : input.tripType === "multi-city" ? labels.multiCity : labels.roundTrip;
  const departure = dateLabel(input.departureDate, locale);
  const returning = input.tripType === "round-trip" ? dateLabel(input.returnDate, locale) : "";
  const dates = [departure, returning].filter(Boolean).join(" – ");
  const explicitTravelers = count(input.adults) + count(input.children) + count(input.infants);
  const travelers = explicitTravelers || count(input.travelers) || 1;
  const cabin = formatCabinClass(String(input.cabinClass ?? "economy"));

  return {
    route: `${origin} → ${destination}`,
    secondaryLine: [tripType, dates, `${travelers} ${travelers === 1 ? labels.traveler : labels.travelers}`, cabin].filter(Boolean).join(" · "),
  };
}
