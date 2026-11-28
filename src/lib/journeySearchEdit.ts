import { parseFlightLegParams } from "./flights/flightSearchJourney";
import { defaultDriverAge } from "./cars/carsSearchUtils";
import type { JourneySearchEditField } from "./search-journey";

type SearchProduct = "FLIGHT" | "HOTEL" | "CAR";
type SearchFields = Partial<Record<JourneySearchEditField, string[]>>;

function searchFieldValues(product: SearchProduct, params: URLSearchParams): SearchFields {
  const value = (key: string, fallback = "") => params.get(key)?.trim() || fallback;
  switch (product) {
    case "FLIGHT": {
      const tripType = value("tripType", "round-trip");
      return {
        origin: [value("origin", value("from")).toUpperCase()],
        destination: [value("destination", value("to")).toUpperCase()],
        dates: [value("departureDate"), tripType === "round-trip" ? value("returnDate") : ""],
        trip_type: [tripType],
        travelers: [value("adults", value("travelers", "1")), value("children", "0"), value("infants", "0")],
        cabin: [value("cabinClass", value("cabin", "economy")).toLowerCase()],
        segments: [tripType === "multi-city" ? JSON.stringify(parseFlightLegParams(params)) : ""],
      };
    }
    case "HOTEL":
      return {
        destination: [value("destination").toLowerCase(), value("destinationId")],
        dates: [value("checkIn"), value("checkOut")],
        travelers: [value("adults", value("guests", "1")), value("children", "0")],
        rooms: [value("rooms", "1"), value("roomComposition")],
        pet_policy: [value("petFriendly", "false")],
      };
    case "CAR": {
      const pickup = value("pickupLocation").toLowerCase();
      const dropoff = value("dropoffLocation").toLowerCase();
      return {
        pickup_location: [pickup],
        dropoff_location: [dropoff === pickup ? "" : dropoff],
        rental_dates: [value("pickupDate"), value("dropoffDate")],
        rental_times: [value("pickupTime"), value("dropoffTime")],
        driver_age: [value("driverAge", defaultDriverAge)],
      };
    }
  }
}

/** Compare only form fields at submission. Return category names with no field values. */
export function changedJourneySearchFields(product: SearchProduct, before: URLSearchParams, after: URLSearchParams): JourneySearchEditField[] {
  const previous = searchFieldValues(product, before);
  const selected = searchFieldValues(product, after);
  return (Object.keys(selected) as JourneySearchEditField[])
    .filter(field => selected[field]?.some((value, index) => previous[field]?.[index] !== value));
}
