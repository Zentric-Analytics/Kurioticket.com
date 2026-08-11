import { buildDealsProductSearchKeys } from "./dealsProductSearchKeys";
import {
  buildDealsSearchFingerprint,
  isDealsTripPlanProductExpired,
} from "./dealsTripPlan";
import { getIncludedProducts, type DealsSearch } from "./dealsSearchParams";
import {
  createDealsFlightJourneyV2,
  type DealsConfirmedFlightOfferV2,
  type DealsFlightFareV2,
  type DealsFlightItineraryV2,
  type DealsTripPlanV2,
} from "./dealsTripPlanV2";
import type { DealsTripPlanCar, DealsTripPlanHotel } from "./dealsTripPlan";

export type DealsJourneyStateV2 =
  | "hotel"
  | "flight-outbound"
  | "flight-return"
  | "flight-fare"
  | "flight-revalidating"
  | "car"
  | "review"
  | "handoff";
type Guard = { expectedRevision: number };
export type DealsJourneyEventV2 =
  | ({ type: "HOTEL_CONFIRMED"; hotel: DealsTripPlanHotel } & Guard)
  | ({
      type: "FLIGHT_OUTBOUND_SELECTED";
      itinerary: DealsFlightItineraryV2;
    } & Guard)
  | ({
      type: "FLIGHT_RETURN_SELECTED";
      itinerary: DealsFlightItineraryV2;
    } & Guard)
  | ({ type: "FLIGHT_FARE_SELECTED"; fare: DealsFlightFareV2 } & Guard)
  | ({ type: "FLIGHT_REVALIDATION_STARTED" } & Guard)
  | ({
      type: "FLIGHT_REVALIDATION_SUCCEEDED";
      offer: DealsConfirmedFlightOfferV2;
    } & Guard)
  | ({ type: "FLIGHT_OFFER_EXPIRED" | "FLIGHT_OFFER_UNAVAILABLE" } & Guard)
  | ({ type: "CAR_CONFIRMED"; car: DealsTripPlanCar } & Guard)
  | ({ type: "SEARCH_RECONCILED" } & Guard)
  | { type: "REVIEW_CONTINUE_REQUESTED" };
export type DealsJourneyEventResultV2 =
  | {
      ok: true;
      plan: DealsTripPlanV2;
      changed: boolean;
      nextState: DealsJourneyStateV2;
    }
  | {
      ok: false;
      reason:
        | "stale-revision"
        | "invalid-transition"
        | "not-ready"
        | "expired-plan";
      plan: DealsTripPlanV2;
      nextState: DealsJourneyStateV2;
    };

const fresh = (
  selection: { resultReceivedAt: number } | undefined,
  now: number,
) =>
  !!selection &&
  !isDealsTripPlanProductExpired(selection.resultReceivedAt, now);
export function getRequiredDealsJourneyStateV2(
  plan: DealsTripPlanV2,
  _search: DealsSearch,
  now = Date.now(),
): DealsJourneyStateV2 {
  const included = getIncludedProducts(plan.mode);
  if (plan.expiresAt <= now)
    return included.hotel
      ? "hotel"
      : included.flight
        ? "flight-outbound"
        : "car";
  if (included.hotel && !fresh(plan.hotel, now)) return "hotel";
  if (included.flight) {
    const flight = plan.flightJourney;
    if (!flight?.outbound) return "flight-outbound";
    if (flight.tripType === "round-trip" && !flight.return)
      return "flight-return";
    if (flight.phase === "revalidating") return "flight-revalidating";
    const offer = flight.confirmedOffer;
    if (
      flight.phase !== "confirmed" ||
      !offer ||
      offer.providerExpiresAt <= now
    )
      return "flight-fare";
  }
  if (included.car && !fresh(plan.car, now)) return "car";
  return "review";
}

const fail = (
  plan: DealsTripPlanV2,
  search: DealsSearch,
  now: number,
  reason:
    | "stale-revision"
    | "invalid-transition"
    | "not-ready"
    | "expired-plan",
): DealsJourneyEventResultV2 => ({
  ok: false,
  reason,
  plan,
  nextState: getRequiredDealsJourneyStateV2(plan, search, now),
});
const commit = (
  plan: DealsTripPlanV2,
  patch: Partial<DealsTripPlanV2>,
  search: DealsSearch,
  now: number,
): DealsJourneyEventResultV2 => {
  const next = {
    ...plan,
    ...patch,
    updatedAt: now,
    revision: plan.revision + 1,
  };
  return {
    ok: true,
    plan: next,
    changed: true,
    nextState: getRequiredDealsJourneyStateV2(next, search, now),
  };
};
export function applyDealsJourneyEventV2(
  plan: DealsTripPlanV2,
  event: DealsJourneyEventV2,
  search: DealsSearch,
  now = Date.now(),
): DealsJourneyEventResultV2 {
  if (event.type === "REVIEW_CONTINUE_REQUESTED")
    return getRequiredDealsJourneyStateV2(plan, search, now) === "review"
      ? { ok: true, plan, changed: false, nextState: "handoff" }
      : fail(plan, search, now, "not-ready");
  if (event.expectedRevision !== plan.revision)
    return fail(plan, search, now, "stale-revision");
  if (plan.expiresAt <= now) return fail(plan, search, now, "expired-plan");
  const included = getIncludedProducts(plan.mode),
    flight = plan.flightJourney;
  switch (event.type) {
    case "HOTEL_CONFIRMED":
      if (!included.hotel) return fail(plan, search, now, "invalid-transition");
      return commit(plan, { hotel: event.hotel, opened: {} }, search, now);
    case "FLIGHT_OUTBOUND_SELECTED":
      if (
        !flight ||
        event.itinerary.direction !== "outbound" ||
        (included.hotel && !fresh(plan.hotel, now))
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        {
          flightJourney: {
            searchKey: flight.searchKey,
            tripType: flight.tripType,
            phase: flight.tripType === "round-trip" ? "return" : "fare",
            outbound: event.itinerary,
          },
          opened: {},
        },
        search,
        now,
      );
    case "FLIGHT_RETURN_SELECTED":
      if (
        !flight?.outbound ||
        flight.tripType !== "round-trip" ||
        event.itinerary.direction !== "return"
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        {
          flightJourney: {
            searchKey: flight.searchKey,
            tripType: flight.tripType,
            phase: "fare",
            outbound: flight.outbound,
            return: event.itinerary,
          },
          opened: {},
        },
        search,
        now,
      );
    case "FLIGHT_FARE_SELECTED":
      if (
        !flight?.outbound ||
        (flight.tripType === "round-trip" && !flight.return)
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        {
          flightJourney: {
            ...flight,
            phase: "fare",
            fare: event.fare,
            confirmedOffer: undefined,
          },
          opened: {},
        },
        search,
        now,
      );
    case "FLIGHT_REVALIDATION_STARTED":
      if (
        !flight?.outbound ||
        (flight.tripType === "round-trip" && !flight.return)
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        {
          flightJourney: {
            ...flight,
            phase: "revalidating",
            confirmedOffer: undefined,
          },
        },
        search,
        now,
      );
    case "FLIGHT_REVALIDATION_SUCCEEDED": {
      const o = event.offer;
      if (
        !flight?.outbound ||
        flight.phase !== "revalidating" ||
        o.providerExpiresAt <= now ||
        o.outboundItineraryKey !== flight.outbound.itineraryKey ||
        (flight.tripType === "round-trip" &&
          o.returnItineraryKey !== flight.return?.itineraryKey) ||
        (flight.fare &&
          o.fareKey !== undefined &&
          o.fareKey !== flight.fare.fareKey)
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        { flightJourney: { ...flight, phase: "confirmed", confirmedOffer: o } },
        search,
        now,
      );
    }
    case "FLIGHT_OFFER_EXPIRED":
    case "FLIGHT_OFFER_UNAVAILABLE":
      if (!flight) return fail(plan, search, now, "invalid-transition");
      return commit(
        plan,
        {
          flightJourney: createDealsFlightJourneyV2(
            flight.searchKey,
            flight.tripType,
          ),
          opened: {},
        },
        search,
        now,
      );
    case "CAR_CONFIRMED":
      if (
        !included.car ||
        (included.hotel && !fresh(plan.hotel, now)) ||
        (included.flight &&
          getRequiredDealsJourneyStateV2(
            { ...plan, car: event.car },
            search,
            now,
          ) !== "review")
      )
        return fail(plan, search, now, "invalid-transition");
      return commit(plan, { car: event.car, opened: {} }, search, now);
    case "SEARCH_RECONCILED": {
      const keys = buildDealsProductSearchKeys(search),
        fingerprint = buildDealsSearchFingerprint(search),
        nextIncluded = getIncludedProducts(search.mode);
      if (
        plan.mode === search.mode &&
        plan.searchFingerprint === fingerprint &&
        Object.keys(keys).every(
          (k) =>
            keys[k as keyof typeof keys] ===
            plan.productSearchKeys[k as keyof typeof keys],
        )
      )
        return {
          ok: true,
          plan,
          changed: false,
          nextState: getRequiredDealsJourneyStateV2(plan, search, now),
        };
      const patch: Partial<DealsTripPlanV2> = {
        mode: search.mode,
        searchFingerprint: fingerprint,
        productSearchKeys: keys,
        opened: {},
      };
      patch.hotel =
        nextIncluded.hotel && keys.hotel === plan.productSearchKeys.hotel
          ? plan.hotel
          : undefined;
      patch.car =
        nextIncluded.car && keys.car === plan.productSearchKeys.car
          ? plan.car
          : undefined;
      patch.flightJourney = nextIncluded.flight
        ? keys.flight === plan.productSearchKeys.flight && plan.flightJourney
          ? plan.flightJourney
          : createDealsFlightJourneyV2(keys.flight, search.flightTripType)
        : undefined;
      return commit(plan, patch, search, now);
    }
  }
}
