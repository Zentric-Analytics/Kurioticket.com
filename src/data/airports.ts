import { distanceKm } from "@/lib/geo/distance";
import { countryMatchesCode } from "@/lib/geo/context";

export type AirportOption = {
  code: string;
  city: string;
  airport: string;
  country?: string;
  lat?: number;
  lon?: number;
};

export const airports: AirportOption[] = [
  { city: "Houston", airport: "George Bush Intercontinental Airport", code: "IAH", country: "United States", lat: 29.9902, lon: -95.3368 },
  { city: "Houston", airport: "William P. Hobby Airport", code: "HOU", country: "United States", lat: 29.6454, lon: -95.2789 },
  { city: "New York", airport: "John F. Kennedy International Airport", code: "JFK", country: "United States", lat: 40.6413, lon: -73.7781 },
  { city: "Los Angeles", airport: "Los Angeles International Airport", code: "LAX", country: "United States", lat: 33.9416, lon: -118.4085 },
  { city: "Chicago", airport: "O'Hare International Airport", code: "ORD", country: "United States", lat: 41.9742, lon: -87.9073 },
  { city: "Atlanta", airport: "Hartsfield-Jackson Atlanta International Airport", code: "ATL", country: "United States", lat: 33.6407, lon: -84.4277 },
  { city: "Dallas", airport: "Dallas/Fort Worth International Airport", code: "DFW", country: "United States", lat: 32.8998, lon: -97.0403 },
  { city: "San Francisco", airport: "San Francisco International Airport", code: "SFO", country: "United States", lat: 37.6213, lon: -122.379 },
  { city: "Miami", airport: "Miami International Airport", code: "MIA", country: "United States", lat: 25.7959, lon: -80.287 },
  { city: "Seattle", airport: "Seattle-Tacoma International Airport", code: "SEA", country: "United States", lat: 47.4502, lon: -122.3088 },
  { city: "Denver", airport: "Denver International Airport", code: "DEN", country: "United States", lat: 39.8561, lon: -104.6737 },
  { city: "Lagos", airport: "Murtala Muhammed International Airport", code: "LOS", country: "Nigeria", lat: 6.5774, lon: 3.3212 },
  { city: "Abuja", airport: "Nnamdi Azikiwe International Airport", code: "ABV", country: "Nigeria", lat: 9.0068, lon: 7.2632 },
  { city: "Port Harcourt", airport: "Port Harcourt International Airport", code: "PHC", country: "Nigeria", lat: 5.0155, lon: 6.9496 },
  { city: "Kano", airport: "Mallam Aminu Kano International Airport", code: "KAN", country: "Nigeria", lat: 12.0476, lon: 8.5246 },
  { city: "London", airport: "Heathrow Airport", code: "LHR", country: "United Kingdom", lat: 51.47, lon: -0.4543 },
  { city: "London", airport: "Gatwick Airport", code: "LGW", country: "United Kingdom", lat: 51.1537, lon: -0.1821 },
  { city: "Manchester", airport: "Manchester Airport", code: "MAN", country: "United Kingdom", lat: 53.3537, lon: -2.2749 },
  { city: "Toronto", airport: "Toronto Pearson International Airport", code: "YYZ", country: "Canada", lat: 43.6777, lon: -79.6248 },
  { city: "Vancouver", airport: "Vancouver International Airport", code: "YVR", country: "Canada", lat: 49.1951, lon: -123.1779 },
  { city: "Montreal", airport: "Montréal–Trudeau International Airport", code: "YUL", country: "Canada", lat: 45.47, lon: -73.7408 },
  { city: "Dubai", airport: "Dubai International Airport", code: "DXB", country: "United Arab Emirates", lat: 25.2532, lon: 55.3657 },
  { city: "Abu Dhabi", airport: "Zayed International Airport", code: "AUH", country: "United Arab Emirates", lat: 24.4329, lon: 54.6511 },
  { city: "Paris", airport: "Charles de Gaulle Airport", code: "CDG", country: "France", lat: 49.0097, lon: 2.5479 },
  { city: "Frankfurt", airport: "Frankfurt Airport", code: "FRA", country: "Germany", lat: 50.0379, lon: 8.5622 },
  { city: "Amsterdam", airport: "Amsterdam Airport Schiphol", code: "AMS", country: "Netherlands", lat: 52.3105, lon: 4.7683 },
  { city: "Madrid", airport: "Adolfo Suárez Madrid-Barajas Airport", code: "MAD", country: "Spain", lat: 40.4983, lon: -3.5676 },
  { city: "Rome", airport: "Leonardo da Vinci–Fiumicino Airport", code: "FCO", country: "Italy", lat: 41.8003, lon: 12.2389 },
  { city: "Istanbul", airport: "Istanbul Airport", code: "IST", country: "Türkiye", lat: 41.2753, lon: 28.7519 },
  { city: "Doha", airport: "Hamad International Airport", code: "DOH", country: "Qatar", lat: 25.2731, lon: 51.6081 },
  { city: "Singapore", airport: "Singapore Changi Airport", code: "SIN", country: "Singapore", lat: 1.3644, lon: 103.9915 },
  { city: "Tokyo", airport: "Haneda Airport", code: "HND", country: "Japan", lat: 35.5494, lon: 139.7798 },
];

export const destinationDefaults = ["LHR", "CDG", "DXB", "JFK", "LAX", "AMS", "MAD", "FCO", "SIN", "HND", "DOH"];

export const getDefaultAirports = (params: { context: "origin" | "destination"; countryCode?: string; lat?: number; lon?: number; limit?: number; }) => {
  const limit = params.limit ?? 8;
  const destinationOrder = new Map(destinationDefaults.map((code, index) => [code, index]));

  return [...airports]
    .sort((a, b) => {
      if (params.context === "destination") {
        const ad = destinationOrder.get(a.code) ?? 999;
        const bd = destinationOrder.get(b.code) ?? 999;
        if (ad !== bd) return ad - bd;
      }
      if (params.countryCode) {
        const aMatch = countryMatchesCode(a.country, params.countryCode) ? 1 : 0;
        const bMatch = countryMatchesCode(b.country, params.countryCode) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      if (typeof params.lat === "number" && typeof params.lon === "number") {
        const ad = typeof a.lat === "number" && typeof a.lon === "number" ? distanceKm(params.lat, params.lon, a.lat, a.lon) : Number.POSITIVE_INFINITY;
        const bd = typeof b.lat === "number" && typeof b.lon === "number" ? distanceKm(params.lat, params.lon, b.lat, b.lon) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
      }
      return a.city.localeCompare(b.city);
    })
    .slice(0, limit);
};

export function formatAirportLabel(airport: AirportOption) {
  return `${airport.city} (${airport.code})`;
}
