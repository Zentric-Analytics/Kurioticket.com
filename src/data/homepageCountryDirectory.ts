import type { ComponentProps } from "react";
import type Link from "next/link";
import { buildCarResultsHref } from "@/lib/cars/carsSearchUtils";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";

export const COUNTRY_FLAG_ASSET_BY_CODE = {
  AU: "/flags/au.svg",
  BR: "/flags/br.svg",
  EG: "/flags/eg.svg",
  FR: "/flags/fr.svg",
  DE: "/flags/de.svg",
  GR: "/flags/gr.svg",
  ID: "/flags/id.svg",
  IT: "/flags/it.svg",
  JP: "/flags/jp.svg",
  MY: "/flags/my.svg",
  MX: "/flags/mx.svg",
  NL: "/flags/nl.svg",
  SG: "/flags/sg.svg",
  ES: "/flags/es.svg",
  TH: "/flags/th.svg",
  TR: "/flags/tr.svg",
  AE: "/flags/ae.svg",
  GB: "/flags/gb.svg",
  US: "/flags/us.svg",
  VN: "/flags/vn.svg",
} as const;

export type CountryFlagCountryCode = keyof typeof COUNTRY_FLAG_ASSET_BY_CODE;

export type CountryDirectoryCategory = "Flights" | "Hotels" | "Cars";
export type CountryDirectoryLink = { label: string; href: ComponentProps<typeof Link>["href"]; routeKey?: string };
export type CountryDirectoryCountry = {
  id: string;
  countryCode: CountryFlagCountryCode;
  labelKey: string;
  fallbackName: string;
  links: Record<CountryDirectoryCategory, CountryDirectoryLink[]>;
};

const addDaysToIsoDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
};

export function buildCountryDirectoryFlightHref(origin: string, destination: string, displayCurrency = "USD", market = "US") {
  return buildHomepageRouteCardFlightHref({ route: { originCode: origin, destinationCode: destination }, displayCurrency, market }) ?? "/flights";
}

export function buildCountryDirectoryHotelHref(destination: string) {
  const baseDate = new Date();
  const checkIn = addDaysToIsoDate(baseDate, 21);
  const checkOut = addDaysToIsoDate(baseDate, 24);
  return { pathname: "/hotels/results", query: { destination, checkIn, checkOut, guests: "2", rooms: "1" } } satisfies ComponentProps<typeof Link>["href"];
}

export function buildCountryDirectoryCarsHref(pickupLocation: string) {
  return buildCarResultsHref({ pickupLocation });
}

const flights = (items: Array<[string, string, string]>) => items.map(([label, origin, destination]) => ({ label, href: buildCountryDirectoryFlightHref(origin, destination), routeKey: `${origin}-${destination}` }));
const hotels = (items: string[]) => items.map((destination) => ({ label: `${destination} stays`, href: buildCountryDirectoryHotelHref(destination) }));
const cars = (items: string[]) => items.map((pickup) => ({ label: `${pickup} car hire`, href: buildCountryDirectoryCarsHref(pickup) }));

const country = (id: string, countryCode: CountryFlagCountryCode, fallbackName: string, links: Record<CountryDirectoryCategory, CountryDirectoryLink[]>): CountryDirectoryCountry => ({
  id,
  countryCode,
  labelKey: `homeHotelDestinationsCountry.${id}`,
  fallbackName,
  links,
});

export const countryDirectoryCountries = [
  country("unitedStates", "US", "United States", { Flights: flights([["New York to Los Angeles", "JFK", "LAX"], ["Chicago to Miami", "ORD", "MIA"], ["Seattle to Honolulu", "SEA", "HNL"], ["Boston to San Francisco", "BOS", "SFO"], ["Atlanta to Orlando", "ATL", "MCO"]]), Hotels: hotels(["New York", "Las Vegas", "Miami", "Los Angeles", "Chicago"]), Cars: cars(["Los Angeles", "Orlando", "Denver", "Miami", "San Francisco"]) }),
  country("uk", "GB", "UK", { Flights: flights([["London to Amsterdam", "LHR", "AMS"], ["Manchester to Faro", "MAN", "FAO"], ["London to New York", "LHR", "JFK"], ["Edinburgh to Dublin", "EDI", "DUB"], ["London to Edinburgh", "LHR", "EDI"]]), Hotels: hotels(["London", "Edinburgh", "Manchester", "Liverpool", "Bath"]), Cars: cars(["London", "Manchester", "Edinburgh", "Birmingham", "Glasgow"]) }),
  country("uae", "AE", "UAE", { Flights: flights([["Dubai to Bangkok", "DXB", "BKK"], ["Abu Dhabi to London", "AUH", "LHR"], ["Dubai to Singapore", "DXB", "SIN"], ["Dubai to Cairo", "DXB", "CAI"], ["Abu Dhabi to Mumbai", "AUH", "BOM"]]), Hotels: hotels(["Dubai", "Abu Dhabi", "Ras Al Khaimah", "Sharjah", "Ajman"]), Cars: cars(["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah", "Ajman"]) }),
  country("spain", "ES", "Spain", { Flights: flights([["Madrid to Barcelona", "MAD", "BCN"], ["Madrid to Paris", "MAD", "CDG"], ["Barcelona to Rome", "BCN", "FCO"], ["Madrid to Málaga", "MAD", "AGP"], ["Barcelona to Palma", "BCN", "PMI"]]), Hotels: hotels(["Madrid", "Barcelona", "Seville", "Valencia", "Málaga"]), Cars: cars(["Madrid", "Barcelona", "Málaga", "Valencia", "Seville"]) }),
  country("japan", "JP", "Japan", { Flights: flights([["Tokyo to Singapore", "HND", "SIN"], ["Tokyo to Bangkok", "NRT", "BKK"], ["Osaka to Seoul", "KIX", "ICN"], ["Tokyo to Osaka", "HND", "ITM"], ["Tokyo to Sapporo", "HND", "CTS"]]), Hotels: hotels(["Tokyo", "Osaka", "Kyoto", "Sapporo", "Fukuoka"]), Cars: cars(["Tokyo", "Osaka", "Sapporo", "Fukuoka", "Nagoya"]) }),
  country("france", "FR", "France", { Flights: flights([["Paris to Rome", "CDG", "FCO"], ["Paris to Dubai", "CDG", "DXB"], ["Nice to London", "NCE", "LHR"], ["Paris to Nice", "CDG", "NCE"], ["Lyon to Amsterdam", "LYS", "AMS"]]), Hotels: hotels(["Paris", "Nice", "Lyon", "Marseille", "Bordeaux"]), Cars: cars(["Paris", "Nice", "Lyon", "Marseille", "Bordeaux"]) }),
  country("singapore", "SG", "Singapore", { Flights: flights([["Singapore to Bali", "SIN", "DPS"], ["Singapore to Tokyo", "SIN", "HND"], ["Singapore to Bangkok", "SIN", "BKK"], ["Singapore to Kuala Lumpur", "SIN", "KUL"], ["Singapore to Hong Kong", "SIN", "HKG"]]), Hotels: hotels(["Singapore", "Sentosa", "Marina Bay", "Orchard Road", "Clarke Quay"]), Cars: cars(["Singapore", "Changi", "Sentosa", "Marina Bay", "Orchard Road"]) }),
  country("germany", "DE", "Germany", { Flights: flights([["Berlin to Paris", "BER", "CDG"], ["Frankfurt to London", "FRA", "LHR"], ["Munich to Rome", "MUC", "FCO"], ["Berlin to Munich", "BER", "MUC"], ["Frankfurt to Amsterdam", "FRA", "AMS"]]), Hotels: hotels(["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"]), Cars: cars(["Berlin", "Frankfurt", "Munich", "Hamburg", "Cologne"]) }),
  country("mexico", "MX", "Mexico", { Flights: flights([["Los Angeles to Mexico City", "LAX", "MEX"], ["New York to Cancún", "JFK", "CUN"], ["Mexico City to Cancún", "MEX", "CUN"], ["Mexico City to Guadalajara", "MEX", "GDL"], ["Mexico City to Monterrey", "MEX", "MTY"]]), Hotels: hotels(["Cancún", "Mexico City", "Playa del Carmen", "Guadalajara", "Tulum"]), Cars: cars(["Cancún", "Mexico City", "Guadalajara", "Monterrey", "Tulum"]) }),
  country("italy", "IT", "Italy", { Flights: flights([["Rome to Paris", "FCO", "CDG"], ["Milan to London", "MXP", "LHR"], ["Rome to Barcelona", "FCO", "BCN"], ["Rome to Milan", "FCO", "LIN"], ["Venice to Paris", "VCE", "CDG"]]), Hotels: hotels(["Rome", "Venice", "Milan", "Florence", "Naples"]), Cars: cars(["Rome", "Milan", "Florence", "Venice", "Naples"]) }),
  country("indonesia", "ID", "Indonesia", { Flights: flights([["Jakarta to Bali", "CGK", "DPS"], ["Bali to Singapore", "DPS", "SIN"], ["Jakarta to Kuala Lumpur", "CGK", "KUL"], ["Jakarta to Surabaya", "CGK", "SUB"], ["Bali to Jakarta", "DPS", "CGK"]]), Hotels: hotels(["Bali", "Jakarta", "Ubud", "Surabaya", "Lombok"]), Cars: cars(["Bali", "Jakarta", "Surabaya", "Ubud", "Lombok"]) }),
  country("netherlands", "NL", "Netherlands", { Flights: flights([["Amsterdam to London", "AMS", "LHR"], ["Amsterdam to Paris", "AMS", "CDG"], ["Amsterdam to Rome", "AMS", "FCO"], ["Amsterdam to Barcelona", "AMS", "BCN"], ["Amsterdam to Berlin", "AMS", "BER"]]), Hotels: hotels(["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"]), Cars: cars(["Amsterdam", "Rotterdam", "Eindhoven", "Utrecht", "The Hague"]) }),
  country("brazil", "BR", "Brazil", { Flights: flights([["São Paulo to Rio de Janeiro", "GRU", "GIG"], ["Rio de Janeiro to Salvador", "GIG", "SSA"], ["São Paulo to Brasília", "GRU", "BSB"], ["São Paulo to Recife", "GRU", "REC"], ["Brasília to Rio de Janeiro", "BSB", "GIG"]]), Hotels: hotels(["Rio de Janeiro", "São Paulo", "Salvador", "Brasília", "Florianópolis"]), Cars: cars(["Rio de Janeiro", "São Paulo", "Brasília", "Salvador", "Florianópolis"]) }),
  country("thailand", "TH", "Thailand", { Flights: flights([["Bangkok to Phuket", "BKK", "HKT"], ["Bangkok to Chiang Mai", "BKK", "CNX"], ["Bangkok to Singapore", "BKK", "SIN"], ["Phuket to Chiang Mai", "HKT", "CNX"], ["Bangkok to Krabi", "BKK", "KBV"]]), Hotels: hotels(["Bangkok", "Phuket", "Chiang Mai", "Krabi", "Koh Samui"]), Cars: cars(["Bangkok", "Phuket", "Chiang Mai", "Krabi", "Koh Samui"]) }),
  country("malaysia", "MY", "Malaysia", { Flights: flights([["Kuala Lumpur to Singapore", "KUL", "SIN"], ["Kuala Lumpur to Penang", "KUL", "PEN"], ["Kuala Lumpur to Langkawi", "KUL", "LGK"], ["Kuala Lumpur to Johor Bahru", "KUL", "JHB"], ["Penang to Singapore", "PEN", "SIN"]]), Hotels: hotels(["Kuala Lumpur", "Penang", "Langkawi", "Johor Bahru", "Malacca"]), Cars: cars(["Kuala Lumpur", "Penang", "Johor Bahru", "Langkawi", "Malacca"]) }),
  country("greece", "GR", "Greece", { Flights: flights([["Athens to Santorini", "ATH", "JTR"], ["Athens to Rome", "ATH", "FCO"], ["Athens to London", "ATH", "LHR"], ["Athens to Heraklion", "ATH", "HER"], ["Athens to Thessaloniki", "ATH", "SKG"]]), Hotels: hotels(["Athens", "Santorini", "Mykonos", "Heraklion", "Thessaloniki"]), Cars: cars(["Athens", "Santorini", "Heraklion", "Thessaloniki", "Mykonos"]) }),
  country("egypt", "EG", "Egypt", { Flights: flights([["Cairo to Luxor", "CAI", "LXR"], ["Cairo to Dubai", "CAI", "DXB"], ["Cairo to Istanbul", "CAI", "IST"], ["Cairo to Sharm El Sheikh", "CAI", "SSH"], ["Cairo to Hurghada", "CAI", "HRG"]]), Hotels: hotels(["Cairo", "Sharm El Sheikh", "Hurghada", "Luxor", "Alexandria"]), Cars: cars(["Cairo", "Alexandria", "Hurghada", "Sharm El Sheikh", "Luxor"]) }),
  country("turkey", "TR", "Turkey", { Flights: flights([["Istanbul to Antalya", "IST", "AYT"], ["Istanbul to London", "IST", "LHR"], ["Istanbul to Dubai", "IST", "DXB"], ["Istanbul to Izmir", "IST", "ADB"], ["Istanbul to Ankara", "IST", "ESB"]]), Hotels: hotels(["Istanbul", "Antalya", "Cappadocia", "Izmir", "Bodrum"]), Cars: cars(["Istanbul", "Antalya", "Izmir", "Ankara", "Bodrum"]) }),
  country("vietnam", "VN", "Vietnam", { Flights: flights([["Ho Chi Minh City to Hanoi", "SGN", "HAN"], ["Hanoi to Da Nang", "HAN", "DAD"], ["Ho Chi Minh City to Singapore", "SGN", "SIN"], ["Ho Chi Minh City to Da Nang", "SGN", "DAD"], ["Hanoi to Bangkok", "HAN", "BKK"]]), Hotels: hotels(["Ho Chi Minh City", "Hanoi", "Da Nang", "Hoi An", "Nha Trang"]), Cars: cars(["Ho Chi Minh City", "Hanoi", "Da Nang", "Hoi An", "Nha Trang"]) }),
  country("australia", "AU", "Australia", { Flights: flights([["Sydney to Melbourne", "SYD", "MEL"], ["Sydney to Brisbane", "SYD", "BNE"], ["Melbourne to Perth", "MEL", "PER"], ["Sydney to Gold Coast", "SYD", "OOL"], ["Brisbane to Melbourne", "BNE", "MEL"]]), Hotels: hotels(["Sydney", "Melbourne", "Gold Coast", "Brisbane", "Perth"]), Cars: cars(["Sydney", "Melbourne", "Brisbane", "Perth", "Gold Coast"]) }),
];

export function getCountryDirectoryLabel(country: CountryDirectoryCountry, translate?: (key: string) => string) {
  const translated = translate?.(country.labelKey);
  return translated && translated !== country.labelKey ? translated : country.fallbackName;
}

export function getSortedCountryDirectoryCountries(locale: string, translate?: (key: string) => string) {
  const collator = new Intl.Collator(locale, { usage: "sort", sensitivity: "base", numeric: true });

  return [...countryDirectoryCountries].sort((a, b) =>
    collator.compare(getCountryDirectoryLabel(a, translate), getCountryDirectoryLabel(b, translate)),
  );
}

export function distributeCountryDirectoryColumns<T>(items: readonly T[], columnCount: number) {
  const safeColumnCount = Math.max(1, Math.floor(columnCount));
  const countriesPerColumn = Math.ceil(items.length / safeColumnCount);

  return Array.from({ length: safeColumnCount }, (_, columnIndex) =>
    items.slice(columnIndex * countriesPerColumn, (columnIndex + 1) * countriesPerColumn),
  );
}
