import type { ComponentProps } from "react";
import type Link from "next/link";
import { buildCarResultsHref } from "@/lib/cars/carsSearchUtils";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";
import { isoAlpha2ToFlagEmoji } from "@/lib/region/flagEmoji";

export type CountryDirectoryCategory = "Flights" | "Hotels" | "Cars";
export type CountryDirectoryLink = { label: string; href: ComponentProps<typeof Link>["href"]; routeKey?: string };
export type CountryDirectoryCountry = {
  id: string;
  countryCode: string;
  flag: string;
  labelKey: string;
  fallbackName: string;
  sortOrder: number;
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

const country = (sortOrder: number, id: string, countryCode: string, fallbackName: string, links: Record<CountryDirectoryCategory, CountryDirectoryLink[]>): CountryDirectoryCountry => ({
  id,
  countryCode,
  flag: isoAlpha2ToFlagEmoji(countryCode),
  labelKey: `homeHotelDestinationsCountry.${id}`,
  fallbackName,
  sortOrder,
  links,
});

export const countryDirectoryCountries = [
  country(1, "unitedStates", "US", "United States", { Flights: flights([["New York to Los Angeles", "JFK", "LAX"], ["Chicago to Miami", "ORD", "MIA"], ["Seattle to Honolulu", "SEA", "HNL"]]), Hotels: hotels(["New York", "Las Vegas", "Miami"]), Cars: cars(["Los Angeles", "Orlando", "Denver"]) }),
  country(2, "uk", "GB", "UK", { Flights: flights([["London to Amsterdam", "LHR", "AMS"], ["Manchester to Faro", "MAN", "FAO"], ["London to New York", "LHR", "JFK"]]), Hotels: hotels(["London", "Edinburgh", "Manchester"]), Cars: cars(["London", "Manchester", "Edinburgh"]) }),
  country(3, "uae", "AE", "UAE", { Flights: flights([["Dubai to Bangkok", "DXB", "BKK"], ["Abu Dhabi to London", "AUH", "LHR"], ["Dubai to Singapore", "DXB", "SIN"]]), Hotels: hotels(["Dubai", "Abu Dhabi", "Ras Al Khaimah"]), Cars: cars(["Dubai", "Abu Dhabi", "Sharjah"]) }),
  country(4, "spain", "ES", "Spain", { Flights: flights([["Madrid to Barcelona", "MAD", "BCN"], ["Madrid to Paris", "MAD", "CDG"], ["Barcelona to Rome", "BCN", "FCO"]]), Hotels: hotels(["Madrid", "Barcelona", "Seville"]), Cars: cars(["Madrid", "Barcelona", "Málaga"]) }),
  country(5, "japan", "JP", "Japan", { Flights: flights([["Tokyo to Singapore", "HND", "SIN"], ["Tokyo to Bangkok", "NRT", "BKK"], ["Osaka to Seoul", "KIX", "ICN"]]), Hotels: hotels(["Tokyo", "Osaka", "Kyoto"]), Cars: cars(["Tokyo", "Osaka", "Sapporo"]) }),
  country(6, "france", "FR", "France", { Flights: flights([["Paris to Rome", "CDG", "FCO"], ["Paris to Dubai", "CDG", "DXB"], ["Nice to London", "NCE", "LHR"]]), Hotels: hotels(["Paris", "Nice", "Lyon"]), Cars: cars(["Paris", "Nice", "Lyon"]) }),
  country(7, "singapore", "SG", "Singapore", { Flights: flights([["Singapore to Bali", "SIN", "DPS"], ["Singapore to Tokyo", "SIN", "HND"], ["Singapore to Bangkok", "SIN", "BKK"]]), Hotels: hotels(["Singapore", "Sentosa", "Marina Bay"]), Cars: cars(["Singapore", "Changi", "Sentosa"]) }),
  country(8, "germany", "DE", "Germany", { Flights: flights([["Berlin to Paris", "BER", "CDG"], ["Frankfurt to London", "FRA", "LHR"], ["Munich to Rome", "MUC", "FCO"]]), Hotels: hotels(["Berlin", "Munich", "Hamburg"]), Cars: cars(["Berlin", "Frankfurt", "Munich"]) }),
  country(9, "mexico", "MX", "Mexico", { Flights: flights([["Los Angeles to Mexico City", "LAX", "MEX"], ["New York to Cancún", "JFK", "CUN"], ["Mexico City to Cancún", "MEX", "CUN"]]), Hotels: hotels(["Cancún", "Mexico City", "Playa del Carmen"]), Cars: cars(["Cancún", "Mexico City", "Guadalajara"]) }),
  country(10, "italy", "IT", "Italy", { Flights: flights([["Rome to Paris", "FCO", "CDG"], ["Milan to London", "MXP", "LHR"], ["Rome to Barcelona", "FCO", "BCN"]]), Hotels: hotels(["Rome", "Venice", "Milan"]), Cars: cars(["Rome", "Milan", "Florence"]) }),
  country(11, "indonesia", "ID", "Indonesia", { Flights: flights([["Jakarta to Bali", "CGK", "DPS"], ["Bali to Singapore", "DPS", "SIN"], ["Jakarta to Kuala Lumpur", "CGK", "KUL"]]), Hotels: hotels(["Bali", "Jakarta", "Ubud"]), Cars: cars(["Bali", "Jakarta", "Surabaya"]) }),
  country(12, "netherlands", "NL", "Netherlands", { Flights: flights([["Amsterdam to London", "AMS", "LHR"], ["Amsterdam to Paris", "AMS", "CDG"], ["Amsterdam to Rome", "AMS", "FCO"]]), Hotels: hotels(["Amsterdam", "Rotterdam", "The Hague"]), Cars: cars(["Amsterdam", "Rotterdam", "Eindhoven"]) }),
  country(13, "brazil", "BR", "Brazil", { Flights: flights([["São Paulo to Rio de Janeiro", "GRU", "GIG"], ["Rio de Janeiro to Salvador", "GIG", "SSA"], ["São Paulo to Brasília", "GRU", "BSB"]]), Hotels: hotels(["Rio de Janeiro", "São Paulo", "Salvador"]), Cars: cars(["Rio de Janeiro", "São Paulo", "Brasília"]) }),
  country(14, "thailand", "TH", "Thailand", { Flights: flights([["Bangkok to Phuket", "BKK", "HKT"], ["Bangkok to Chiang Mai", "BKK", "CNX"], ["Bangkok to Singapore", "BKK", "SIN"]]), Hotels: hotels(["Bangkok", "Phuket", "Chiang Mai"]), Cars: cars(["Bangkok", "Phuket", "Chiang Mai"]) }),
  country(15, "malaysia", "MY", "Malaysia", { Flights: flights([["Kuala Lumpur to Singapore", "KUL", "SIN"], ["Kuala Lumpur to Penang", "KUL", "PEN"], ["Kuala Lumpur to Langkawi", "KUL", "LGK"]]), Hotels: hotels(["Kuala Lumpur", "Penang", "Langkawi"]), Cars: cars(["Kuala Lumpur", "Penang", "Johor Bahru"]) }),
  country(16, "greece", "GR", "Greece", { Flights: flights([["Athens to Santorini", "ATH", "JTR"], ["Athens to Rome", "ATH", "FCO"], ["Athens to London", "ATH", "LHR"]]), Hotels: hotels(["Athens", "Santorini", "Mykonos"]), Cars: cars(["Athens", "Santorini", "Heraklion"]) }),
  country(17, "egypt", "EG", "Egypt", { Flights: flights([["Cairo to Luxor", "CAI", "LXR"], ["Cairo to Dubai", "CAI", "DXB"], ["Cairo to Istanbul", "CAI", "IST"]]), Hotels: hotels(["Cairo", "Sharm El Sheikh", "Hurghada"]), Cars: cars(["Cairo", "Alexandria", "Hurghada"]) }),
  country(18, "turkey", "TR", "Turkey", { Flights: flights([["Istanbul to Antalya", "IST", "AYT"], ["Istanbul to London", "IST", "LHR"], ["Istanbul to Dubai", "IST", "DXB"]]), Hotels: hotels(["Istanbul", "Antalya", "Cappadocia"]), Cars: cars(["Istanbul", "Antalya", "Izmir"]) }),
  country(19, "vietnam", "VN", "Vietnam", { Flights: flights([["Ho Chi Minh City to Hanoi", "SGN", "HAN"], ["Hanoi to Da Nang", "HAN", "DAD"], ["Ho Chi Minh City to Singapore", "SGN", "SIN"]]), Hotels: hotels(["Ho Chi Minh City", "Hanoi", "Da Nang"]), Cars: cars(["Ho Chi Minh City", "Hanoi", "Da Nang"]) }),
  country(20, "australia", "AU", "Australia", { Flights: flights([["Sydney to Melbourne", "SYD", "MEL"], ["Sydney to Brisbane", "SYD", "BNE"], ["Melbourne to Perth", "MEL", "PER"]]), Hotels: hotels(["Sydney", "Melbourne", "Gold Coast"]), Cars: cars(["Sydney", "Melbourne", "Brisbane"]) }),
].sort((a, b) => a.sortOrder - b.sortOrder);
