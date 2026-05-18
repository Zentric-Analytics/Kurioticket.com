import type { FlightSearchParams, HotelSearchParams, NormalizedFlightResult, NormalizedHotelResult } from "@/lib/types";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { normalizeHotelResult } from "@/services/travel/normalizeHotelResult";

export function fallbackFlights(search: FlightSearchParams): NormalizedFlightResult[] {
  const depart = search.departureDate;
  return [
    normalizeFlightResult(
      "Development Fallback",
      {
        id: "calm-nonstop",
        airlineName: "Delta Air Lines",
        flightNumber: "DL2184",
        departureTime: `${depart}T07:20:00`,
        arrivalTime: `${depart}T12:35:00`,
        durationMinutes: 315,
        stops: 0,
        price: 248,
        baggageInfo: "Carry-on included",
      },
      search,
    ),
    normalizeFlightResult(
      "Development Fallback",
      {
        id: "lowest-price",
        airlineName: "United Airlines",
        flightNumber: "UA1142",
        departureTime: `${depart}T10:15:00`,
        arrivalTime: `${depart}T17:20:00`,
        durationMinutes: 425,
        stops: 1,
        layovers: [{ airport: "DEN", duration: "1h 20m", quality: "good" }],
        price: 211,
        baggageInfo: "Baggage rules vary by fare",
      },
      search,
    ),
    normalizeFlightResult(
      "Development Fallback",
      {
        id: "fastest-route",
        airlineName: "American Airlines",
        flightNumber: "AA946",
        departureTime: `${depart}T15:10:00`,
        arrivalTime: `${depart}T20:05:00`,
        durationMinutes: 295,
        stops: 0,
        price: 302,
        baggageInfo: "Carry-on included",
      },
      search,
    ),
  ].filter(Boolean) as NormalizedFlightResult[];
}

export function fallbackHotels(search: HotelSearchParams): NormalizedHotelResult[] {
  return [
    normalizeHotelResult(
      "Development Fallback",
      {
        id: "harborline",
        name: "Harborline City Hotel",
        rating: 4.4,
        location: `${search.destination} transit district`,
        pricePerNight: 139,
        totalPrice: 139 * nights(search),
        amenities: ["Free Wi-Fi", "Late check-in", "Airport transit access", "Breakfast available"],
      },
      search,
    ),
    normalizeHotelResult(
      "Development Fallback",
      {
        id: "linen-house",
        name: "Linen House Suites",
        rating: 4.7,
        location: `${search.destination} central stay area`,
        pricePerNight: 178,
        totalPrice: 178 * nights(search),
        amenities: ["Flexible cancellation", "Quiet rooms", "Workspace", "24-hour desk"],
      },
      search,
    ),
    normalizeHotelResult(
      "Development Fallback",
      {
        id: "station-inn",
        name: "Station Inn Express",
        rating: 4.1,
        location: `${search.destination} rail and airport link`,
        pricePerNight: 112,
        totalPrice: 112 * nights(search),
        amenities: ["Airport shuttle", "Late check-in", "Free Wi-Fi"],
      },
      search,
    ),
  ].filter(Boolean) as NormalizedHotelResult[];
}

function nights(search: HotelSearchParams) {
  const ms = new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime();
  return Math.max(Math.round(ms / 86400000), 1);
}
