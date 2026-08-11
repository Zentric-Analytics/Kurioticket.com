import { areDealsCarSelectionsMateriallyEqual } from "./dealsCarDetails";
import { areDealsHotelSelectionsMateriallyEqual } from "./dealsHotelDetails";
import {
  buildDealsSearchFingerprint,
  isDealsTripPlanProductExpired,
  type DealsTripPlanCar,
  type DealsTripPlanHotel,
} from "./dealsTripPlan";
import { getIncludedProducts, type DealsSearch } from "./dealsSearchParams";
import { buildDealsProductSearchKeys } from "./dealsProductSearchKeys";
import {
  areDealsFlightOfferAndJourneyConsistentV2,
  canonicalizeDealsConfirmedFlightOfferV2,
  canonicalizeDealsFlightFareV2,
  canonicalizeDealsFlightItineraryV2,
  canonicalizeDealsTripPlanV2,
  type DealsConfirmedFlightOfferV2,
  type DealsFlightFareV2,
  type DealsFlightItineraryV2,
  type DealsFlightJourneyV2,
  type DealsTripPlanV2,
} from "./dealsTripPlanV2";

export type DealsJourneyStateV2 =
  | "hotel"
  | "flight-outbound"
  | "flight-return"
  | "flight-fare"
  | "flight-revalidating"
  | "car"
  | "review"
  | "handoff";
export type DealsJourneyFailureReasonV2 =
  | "stale-revision"
  | "search-context-mismatch"
  | "invalid-transition"
  | "not-ready"
  | "expired-plan"
  | "non-monotonic-time";

type Revisioned = { expectedRevision: number };
export type DealsJourneyEventV2 =
  | (Revisioned & { type: "HOTEL_CONFIRMED"; hotel: DealsTripPlanHotel })
  | (Revisioned & {
      type: "FLIGHT_OUTBOUND_SELECTED";
      itinerary: DealsFlightItineraryV2;
    })
  | (Revisioned & {
      type: "FLIGHT_RETURN_SELECTED";
      itinerary: DealsFlightItineraryV2;
    })
  | (Revisioned & { type: "FLIGHT_FARE_SELECTED"; fare: DealsFlightFareV2 })
  | (Revisioned & { type: "FLIGHT_REVALIDATION_STARTED" })
  | (Revisioned & {
      type: "FLIGHT_REVALIDATION_SUCCEEDED";
      offer: DealsConfirmedFlightOfferV2;
    })
  | (Revisioned & { type: "FLIGHT_OFFER_EXPIRED" })
  | (Revisioned & { type: "FLIGHT_OFFER_UNAVAILABLE" })
  | (Revisioned & { type: "CAR_CONFIRMED"; car: DealsTripPlanCar })
  | (Revisioned & { type: "SEARCH_RECONCILED" })
  | (Revisioned & { type: "REVIEW_CONTINUE_REQUESTED" });
export type DealsJourneyResultV2 =
  | {
      ok: true;
      plan: DealsTripPlanV2;
      changed: boolean;
      nextState: DealsJourneyStateV2;
    }
  | {
      ok: false;
      plan: DealsTripPlanV2;
      changed: false;
      reason: DealsJourneyFailureReasonV2;
      nextState: DealsJourneyStateV2;
    };

const selectionFresh = (
  selection: { resultReceivedAt: number } | undefined,
  now: number,
) =>
  Boolean(
    selection &&
    selection.resultReceivedAt <= now &&
    !isDealsTripPlanProductExpired(selection.resultReceivedAt, now),
  );
const flightComplete = (
  journey: DealsFlightJourneyV2 | undefined,
  now: number,
) =>
  Boolean(
    journey?.phase === "confirmed" &&
    journey.fare &&
    journey.confirmedOffer &&
    journey.confirmedOffer.providerExpiresAt > now &&
    areDealsFlightOfferAndJourneyConsistentV2(journey.confirmedOffer, journey),
  );

export function getRequiredDealsJourneyStateV2(
  plan: DealsTripPlanV2,
  now = Date.now(),
): DealsJourneyStateV2 {
  const included = getIncludedProducts(plan.mode);
  if (included.hotel && !selectionFresh(plan.hotel, now)) return "hotel";
  if (included.flight) {
    const flight = plan.flightJourney;
    if (!flight?.outbound) return "flight-outbound";
    if (flight.tripType === "round-trip" && !flight.return)
      return "flight-return";
    if (!flight.fare) return "flight-fare";
    if (flight.phase === "revalidating") return "flight-revalidating";
    if (!flightComplete(flight, now)) return "flight-fare";
  }
  if (included.car && !selectionFresh(plan.car, now)) return "car";
  return "review";
}

const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const fail = (
  plan: DealsTripPlanV2,
  now: number,
  reason: DealsJourneyFailureReasonV2,
): DealsJourneyResultV2 => ({
  ok: false,
  plan,
  changed: false,
  reason,
  nextState: getRequiredDealsJourneyStateV2(plan, now),
});
const success = (
  plan: DealsTripPlanV2,
  now: number,
  changed: boolean,
  nextState = getRequiredDealsJourneyStateV2(plan, now),
): DealsJourneyResultV2 => ({ ok: true, plan, changed, nextState });
const commit = (
  plan: DealsTripPlanV2,
  patch: Partial<DealsTripPlanV2>,
  now: number,
): DealsTripPlanV2 | null =>
  canonicalizeDealsTripPlanV2({
    ...plan,
    ...patch,
    opened: {},
    updatedAt: now,
    revision: plan.revision + 1,
  });
const resetFlight = (plan: DealsTripPlanV2): DealsFlightJourneyV2 => ({
  searchKey: plan.productSearchKeys.flight,
  tripType: plan.flightJourney!.tripType,
  phase: "outbound",
});

export function applyDealsJourneyEventV2(
  plan: DealsTripPlanV2,
  search: DealsSearch,
  event: DealsJourneyEventV2,
  now = Date.now(),
): DealsJourneyResultV2 {
  if (event.expectedRevision !== plan.revision)
    return fail(plan, now, "stale-revision");
  if (plan.expiresAt <= now) return fail(plan, now, "expired-plan");
  if (now < plan.updatedAt) return fail(plan, now, "non-monotonic-time");
  if (event.type === "SEARCH_RECONCILED") return reconcile(plan, search, now);
  const keys = buildDealsProductSearchKeys(search),
    included = getIncludedProducts(plan.mode);
  if (
    plan.mode !== search.mode ||
    plan.searchFingerprint !== buildDealsSearchFingerprint(search) ||
    (included.hotel && keys.hotel !== plan.productSearchKeys.hotel) ||
    (included.flight && keys.flight !== plan.productSearchKeys.flight) ||
    (included.car && keys.car !== plan.productSearchKeys.car)
  )
    return fail(plan, now, "search-context-mismatch");
  if (event.type === "REVIEW_CONTINUE_REQUESTED")
    return getRequiredDealsJourneyStateV2(plan, now) === "review"
      ? success(plan, now, false, "handoff")
      : fail(plan, now, "not-ready");

  let next: DealsTripPlanV2 | null = null;
  if (event.type === "HOTEL_CONFIRMED") {
    if (
      !included.hotel ||
      event.hotel.resultReceivedAt > now ||
      isDealsTripPlanProductExpired(event.hotel.resultReceivedAt, now)
    )
      return fail(plan, now, "invalid-transition");
    if (areDealsHotelSelectionsMateriallyEqual(plan.hotel, event.hotel))
      return success(plan, now, false);
    next = commit(plan, { hotel: event.hotel }, now);
  } else if (event.type === "FLIGHT_OUTBOUND_SELECTED") {
    const itinerary = canonicalizeDealsFlightItineraryV2(event.itinerary);
    if (
      !included.flight ||
      !itinerary ||
      itinerary.direction !== "outbound" ||
      (included.hotel && !selectionFresh(plan.hotel, now))
    )
      return fail(plan, now, "invalid-transition");
    const flight = plan.flightJourney!;
    if (
      same(flight.outbound, itinerary) &&
      ((flight.tripType === "round-trip" && flight.phase === "return") ||
        (flight.tripType === "one-way" && flight.phase === "fare"))
    )
      return success(plan, now, false);
    next = commit(
      plan,
      {
        flightJourney: {
          searchKey: flight.searchKey,
          tripType: flight.tripType,
          phase: flight.tripType === "round-trip" ? "return" : "fare",
          outbound: itinerary,
        },
      },
      now,
    );
  } else if (event.type === "FLIGHT_RETURN_SELECTED") {
    const itinerary = canonicalizeDealsFlightItineraryV2(event.itinerary),
      flight = plan.flightJourney;
    if (
      !flight ||
      flight.tripType !== "round-trip" ||
      !flight.outbound ||
      !itinerary ||
      itinerary.direction !== "return"
    )
      return fail(plan, now, "invalid-transition");
    if (
      same(flight.return, itinerary) &&
      flight.phase === "fare" &&
      !flight.confirmedOffer
    )
      return success(plan, now, false);
    next = commit(
      plan,
      {
        flightJourney: {
          searchKey: flight.searchKey,
          tripType: flight.tripType,
          phase: "fare",
          outbound: flight.outbound,
          return: itinerary,
        },
      },
      now,
    );
  } else if (event.type === "FLIGHT_FARE_SELECTED") {
    const fare = canonicalizeDealsFlightFareV2(event.fare),
      flight = plan.flightJourney;
    if (
      !flight?.outbound ||
      (flight.tripType === "round-trip" && !flight.return) ||
      !fare
    )
      return fail(plan, now, "invalid-transition");
    if (
      same(flight.fare, fare) &&
      flight.phase === "fare" &&
      !flight.confirmedOffer
    )
      return success(plan, now, false);
    next = commit(
      plan,
      {
        flightJourney: {
          searchKey: flight.searchKey,
          tripType: flight.tripType,
          phase: "fare",
          outbound: flight.outbound,
          ...(flight.return ? { return: flight.return } : {}),
          fare,
        },
      },
      now,
    );
  } else if (event.type === "FLIGHT_REVALIDATION_STARTED") {
    const flight = plan.flightJourney;
    if (
      !flight?.outbound ||
      (flight.tripType === "round-trip" && !flight.return) ||
      !flight.fare
    )
      return fail(plan, now, "invalid-transition");
    if (flight.phase === "revalidating" && !flight.confirmedOffer)
      return success(plan, now, false);
    next = commit(
      plan,
      {
        flightJourney: {
          ...flight,
          phase: "revalidating",
          confirmedOffer: undefined,
        },
      },
      now,
    );
  } else if (event.type === "FLIGHT_REVALIDATION_SUCCEEDED") {
    const flight = plan.flightJourney,
      offer = canonicalizeDealsConfirmedFlightOfferV2(event.offer);
    if (
      flight?.phase !== "revalidating" ||
      !flight.fare ||
      !offer ||
      offer.providerExpiresAt <= now ||
      offer.validatedAt > now ||
      !areDealsFlightOfferAndJourneyConsistentV2(offer, flight)
    )
      return fail(plan, now, "invalid-transition");
    next = commit(
      plan,
      {
        flightJourney: { ...flight, phase: "confirmed", confirmedOffer: offer },
      },
      now,
    );
  } else if (
    event.type === "FLIGHT_OFFER_EXPIRED" ||
    event.type === "FLIGHT_OFFER_UNAVAILABLE"
  ) {
    if (!plan.flightJourney) return fail(plan, now, "invalid-transition");
    const clean = resetFlight(plan);
    if (same(plan.flightJourney, clean)) return success(plan, now, false);
    next = commit(plan, { flightJourney: clean }, now);
  } else if (event.type === "CAR_CONFIRMED") {
    if (
      !included.car ||
      event.car.resultReceivedAt > now ||
      isDealsTripPlanProductExpired(event.car.resultReceivedAt, now) ||
      (included.hotel && !selectionFresh(plan.hotel, now)) ||
      (included.flight && !flightComplete(plan.flightJourney, now))
    )
      return fail(plan, now, "invalid-transition");
    if (areDealsCarSelectionsMateriallyEqual(plan.car, event.car))
      return success(plan, now, false);
    next = commit(plan, { car: event.car }, now);
  }
  return next
    ? success(next, now, true)
    : fail(plan, now, "invalid-transition");
}

function reconcile(
  plan: DealsTripPlanV2,
  search: DealsSearch,
  now: number,
): DealsJourneyResultV2 {
  const nextKeys = buildDealsProductSearchKeys(search),
    currentIncluded = getIncludedProducts(plan.mode),
    nextIncluded = getIncludedProducts(search.mode);
  const nextFingerprint = buildDealsSearchFingerprint(search);
  const activeKeysEqual =
    (!currentIncluded.hotel ||
      nextKeys.hotel === plan.productSearchKeys.hotel) &&
    (!currentIncluded.flight ||
      nextKeys.flight === plan.productSearchKeys.flight) &&
    (!currentIncluded.car || nextKeys.car === plan.productSearchKeys.car);
  if (
    search.mode === plan.mode &&
    nextFingerprint === plan.searchFingerprint &&
    activeKeysEqual
  )
    return success(plan, now, false);
  const patch: Partial<DealsTripPlanV2> = {
    mode: search.mode,
    searchFingerprint: nextFingerprint,
    productSearchKeys: nextKeys,
    hotel: undefined,
    car: undefined,
    flightJourney: undefined,
  };
  if (
    nextIncluded.hotel &&
    currentIncluded.hotel &&
    nextKeys.hotel === plan.productSearchKeys.hotel
  )
    patch.hotel = plan.hotel;
  if (
    nextIncluded.car &&
    currentIncluded.car &&
    nextKeys.car === plan.productSearchKeys.car
  )
    patch.car = plan.car;
  if (nextIncluded.flight)
    patch.flightJourney =
      currentIncluded.flight &&
      nextKeys.flight === plan.productSearchKeys.flight
        ? plan.flightJourney
        : {
            searchKey: nextKeys.flight,
            tripType: search.flightTripType,
            phase: "outbound",
          };
  const next = commit(plan, patch, now);
  return next
    ? success(next, now, true)
    : fail(plan, now, "invalid-transition");
}
