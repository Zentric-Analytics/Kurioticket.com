import {
  getIncludedProducts,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";

export type SharedTripDates = { start: string; end: string };

export const getSharedDestination = (search: DealsSearch) =>
  search.sharedDestination;

export const getSharedDates = (search: DealsSearch): SharedTripDates => ({
  start: search.sharedTravelStartDate,
  end: search.sharedTravelEndDate,
});

export function applySharedDestination(
  search: DealsSearch,
  destination: string,
  flightText = destination,
): DealsSearch {
  const included = getIncludedProducts(search.mode);
  return {
    ...search,
    sharedDestination: destination,
    ...(included.flight
      ? { flightDestinationText: flightText }
      : { hotelDestination: destination }),
    ...(included.flight && search.stayDestinationLinked
      ? { hotelDestination: destination }
      : {}),
    ...(search.carPickupLinked ? { carPickupLocation: destination } : {}),
  };
}

export function applySharedDates(
  search: DealsSearch,
  dates: SharedTripDates,
): DealsSearch {
  const included = getIncludedProducts(search.mode);
  return {
    ...search,
    sharedTravelStartDate: dates.start,
    sharedTravelEndDate: dates.end,
    ...(included.flight
      ? {
          flightDepartureDate: dates.start,
          flightReturnDate:
            search.flightTripType === "round-trip" ? dates.end : "",
        }
      : { hotelCheckIn: dates.start, hotelCheckOut: dates.end }),
    ...(included.flight && search.stayDatesLinked
      ? { hotelCheckIn: dates.start, hotelCheckOut: dates.end }
      : {}),
    ...(search.carDatesLinked
      ? { carPickupDate: dates.start, carReturnDate: dates.end }
      : {}),
  };
}

export function customizeInheritedField(
  search: DealsSearch,
  field: "stayDestination" | "stayDates" | "carPickup" | "carDates",
  value: string | SharedTripDates,
): DealsSearch {
  if (field === "stayDestination")
    return {
      ...search,
      hotelDestination: String(value),
      stayDestinationLinked: false,
    };
  if (field === "carPickup")
    return {
      ...search,
      carPickupLocation: String(value),
      carPickupLinked: false,
    };
  const dates = value as SharedTripDates;
  if (field === "stayDates")
    return {
      ...search,
      hotelCheckIn: dates.start,
      hotelCheckOut: dates.end,
      stayDatesLinked: false,
    };
  return {
    ...search,
    carPickupDate: dates.start,
    carReturnDate: dates.end,
    carDatesLinked: false,
  };
}

export function relinkInheritedField(
  search: DealsSearch,
  field: "stayDestination" | "stayDates" | "carPickup" | "carDates",
): DealsSearch {
  const destination = getSharedDestination(search);
  const dates = getSharedDates(search);
  if (field === "stayDestination")
    return {
      ...search,
      hotelDestination: destination,
      stayDestinationLinked: true,
    };
  if (field === "stayDates")
    return {
      ...search,
      hotelCheckIn: dates.start,
      hotelCheckOut: dates.end,
      stayDatesLinked: true,
    };
  if (field === "carPickup")
    return { ...search, carPickupLocation: destination, carPickupLinked: true };
  return {
    ...search,
    carPickupDate: dates.start,
    carReturnDate: dates.end,
    carDatesLinked: true,
  };
}

export function transitionDealsMode(
  search: DealsSearch,
  mode: DealsPackageMode,
): DealsSearch {
  const was = getIncludedProducts(search.mode);
  const next = getIncludedProducts(mode);
  let transitioned = { ...search, mode };
  if (!was.flight && next.flight)
    transitioned = {
      ...transitioned,
      flightDestinationText: transitioned.sharedDestination,
      flightDepartureDate: transitioned.sharedTravelStartDate,
      flightReturnDate:
        transitioned.flightTripType === "round-trip"
          ? transitioned.sharedTravelEndDate
          : "",
    };
  if (!was.hotel && next.hotel && transitioned.stayDestinationLinked)
    transitioned = relinkInheritedField(transitioned, "stayDestination");
  if (!was.hotel && next.hotel && transitioned.stayDatesLinked)
    transitioned = relinkInheritedField(transitioned, "stayDates");
  if (!was.car && next.car && transitioned.carPickupLinked)
    transitioned = relinkInheritedField(transitioned, "carPickup");
  if (!was.car && next.car && transitioned.carDatesLinked)
    transitioned = relinkInheritedField(transitioned, "carDates");
  return transitioned;
}

export function swapFlightAirports(
  search: DealsSearch,
  newDestination: string,
): DealsSearch {
  return applySharedDestination(
    {
      ...search,
      flightOriginText: search.flightDestinationText,
      flightOriginCode: search.flightDestinationCode,
      flightDestinationCode: search.flightOriginCode,
    },
    newDestination,
    search.flightOriginText,
  );
}

export function setCarReturnMode(
  search: DealsSearch,
  customized: boolean,
  location = "",
): DealsSearch {
  return {
    ...search,
    carReturnToDifferentLocation: customized,
    carReturnLocation: customized ? location : "",
  };
}
