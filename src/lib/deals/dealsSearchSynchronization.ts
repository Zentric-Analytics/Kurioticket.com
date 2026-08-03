import { getIncludedProducts, type DealsPackageMode, type DealsSearch } from "./dealsSearchParams";

export type SharedTripDates = { start: string; end: string };

export const getSharedDestination = (search: DealsSearch) =>
  getIncludedProducts(search.mode).flight ? search.flightDestinationText : search.hotelDestination;

export const getSharedDates = (search: DealsSearch): SharedTripDates =>
  getIncludedProducts(search.mode).flight
    ? { start: search.flightDepartureDate, end: search.flightReturnDate || search.hotelCheckOut || search.carReturnDate }
    : { start: search.hotelCheckIn, end: search.hotelCheckOut };

export function applySharedDestination(search: DealsSearch, destination: string, flightText = destination): DealsSearch {
  const included = getIncludedProducts(search.mode);
  return {
    ...search,
    ...(included.flight ? { flightDestinationText: flightText } : { hotelDestination: destination }),
    ...(included.flight && search.stayDestinationLinked ? { hotelDestination: destination } : {}),
    ...(search.carPickupLinked ? { carPickupLocation: destination } : {}),
  };
}

export function applySharedDates(search: DealsSearch, dates: SharedTripDates): DealsSearch {
  const included = getIncludedProducts(search.mode);
  return {
    ...search,
    ...(included.flight ? { flightDepartureDate: dates.start, flightReturnDate: search.flightTripType === "round-trip" ? dates.end : "" } : { hotelCheckIn: dates.start, hotelCheckOut: dates.end }),
    ...(included.flight && search.stayDatesLinked ? { hotelCheckIn: dates.start, hotelCheckOut: dates.end } : {}),
    ...(search.carDatesLinked ? { carPickupDate: dates.start, carReturnDate: dates.end } : {}),
  };
}

export function customizeInheritedField(search: DealsSearch, field: "stayDestination" | "stayDates" | "carPickup" | "carDates", value: string | SharedTripDates): DealsSearch {
  if (field === "stayDestination") return { ...search, hotelDestination: String(value), stayDestinationLinked: false };
  if (field === "carPickup") return { ...search, carPickupLocation: String(value), carPickupLinked: false };
  const dates = value as SharedTripDates;
  if (field === "stayDates") return { ...search, hotelCheckIn: dates.start, hotelCheckOut: dates.end, stayDatesLinked: false };
  return { ...search, carPickupDate: dates.start, carReturnDate: dates.end, carDatesLinked: false };
}

export function relinkInheritedField(search: DealsSearch, field: "stayDestination" | "stayDates" | "carPickup" | "carDates"): DealsSearch {
  const destination = getSharedDestination(search); const dates = getSharedDates(search);
  if (field === "stayDestination") return { ...search, hotelDestination: destination, stayDestinationLinked: true };
  if (field === "stayDates") return { ...search, hotelCheckIn: dates.start, hotelCheckOut: dates.end, stayDatesLinked: true };
  if (field === "carPickup") return { ...search, carPickupLocation: destination, carPickupLinked: true };
  return { ...search, carPickupDate: dates.start, carReturnDate: dates.end, carDatesLinked: true };
}

export function transitionDealsMode(search: DealsSearch, mode: DealsPackageMode): DealsSearch {
  const was = getIncludedProducts(search.mode); const next = getIncludedProducts(mode);
  let transitioned = { ...search, mode };
  if (was.flight && !next.flight && next.hotel) {
    transitioned = { ...transitioned, flightDestinationText: transitioned.hotelDestination, flightDepartureDate: transitioned.hotelCheckIn, flightReturnDate: transitioned.hotelCheckOut };
  }
  if (!was.hotel && next.hotel && transitioned.stayDestinationLinked) transitioned = relinkInheritedField(transitioned, "stayDestination");
  if (!was.hotel && next.hotel && transitioned.stayDatesLinked) transitioned = relinkInheritedField(transitioned, "stayDates");
  if (!was.car && next.car && transitioned.carPickupLinked) transitioned = relinkInheritedField(transitioned, "carPickup");
  if (!was.car && next.car && transitioned.carDatesLinked) transitioned = relinkInheritedField(transitioned, "carDates");
  return transitioned;
}
