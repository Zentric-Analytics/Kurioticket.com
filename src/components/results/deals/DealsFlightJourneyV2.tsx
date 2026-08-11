"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsProductSearchKeys } from "@/lib/deals/dealsProductSearchKeys";
import { applyDealsJourneyEventV2 } from "@/lib/deals/dealsJourneyEngineV2";
import {
  createDealsTripPlanV2,
  type DealsTripPlanV2,
} from "@/lib/deals/dealsTripPlanV2";
import type { DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import {
  createFlightInventory,
  DealsFlightInventoryClientError,
  getFlightFareChoices,
  getFlightReturnChoices,
  type DealsFlightInventoryErrorCode,
} from "@/lib/deals/dealsFlightInventoryClientV2";
import {
  clearDealsFlightRuntimeV2,
  readDealsFlightRuntimeV2,
  writeDealsFlightRuntimeV2,
  type DealsFlightRuntimeV2,
} from "@/lib/deals/dealsFlightRuntimeStorageV2";
import {
  isFatalFlightInventoryError,
  restoreDealsFlightRuntimeV2,
  shouldRenderDownstreamEmpty,
  type DownstreamLoadState,
} from "@/lib/deals/dealsFlightRuntimeOrchestratorV2";

type Status = "initial" | "loading" | "success" | "empty" | "error";
const messages: Record<DealsFlightInventoryErrorCode, string> = {
  MALFORMED_REQUEST:
    "The flight search is invalid. Please modify it and try again.",
  NO_INVENTORY: "No flights are available for this search.",
  UNKNOWN_INVENTORY:
    "This flight session is no longer available. Start a fresh search.",
  INVENTORY_EXPIRED:
    "This flight session expired. Refresh the available flights.",
  STALE_SEARCH:
    "The saved flights do not match this search. Refresh the available flights.",
  STORAGE_UNAVAILABLE: "Flight availability is temporarily unavailable.",
  PROVIDER_TEMPORARILY_UNAVAILABLE:
    "The flight provider is temporarily unavailable.",
  FEATURE_DISABLED: "Flight search is currently unavailable.",
  RATE_LIMITED:
    "Too many flight searches were requested. Please wait, then retry.",
  INVALID_SELECTION:
    "That selection is no longer available. Choose from the refreshed options.",
  NETWORK_FAILURE:
    "We could not reach flight search. Check your connection and retry.",
  MALFORMED_RESPONSE:
    "Flight search returned an unexpected response. Please retry.",
};

export function DealsFlightJourneyV2({
  search,
  upstreamPlan,
}: {
  search: DealsSearch;
  upstreamPlan: DealsTripPlan | null;
}) {
  const searchKey = buildDealsProductSearchKeys(search).flight;
  const [runtime, setRuntime] = useState<DealsFlightRuntimeV2 | null>(null);
  const freshPlan = useCallback(
    () => ({
      ...createDealsTripPlanV2(search),
      ...(upstreamPlan?.hotel ? { hotel: upstreamPlan.hotel } : {}),
    }),
    [search, upstreamPlan],
  );
  const [plan, setPlan] = useState<DealsTripPlanV2>(() => freshPlan());
  const [status, setStatus] = useState<Status>("initial");
  const [returnState, setReturnState] = useState<DownstreamLoadState>("idle");
  const [fareState, setFareState] = useState<DownstreamLoadState>("idle");
  const [error, setError] = useState<DealsFlightInventoryErrorCode | null>(
    null,
  );
  const generation = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const cancel = useCallback(() => {
    generation.current += 1;
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);
  const request = useCallback(() => {
    const controller = new AbortController();
    controllers.current.add(controller);
    return { controller, generation: generation.current };
  }, []);
  const current = useCallback(
    (value: { controller: AbortController; generation: number }) =>
      !value.controller.signal.aborted &&
      value.generation === generation.current,
    [],
  );
  const fail = useCallback(
    (caught: unknown, stage?: "return" | "fare") => {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      const code =
        caught instanceof DealsFlightInventoryClientError
          ? caught.code
          : "NETWORK_FAILURE";
      if (isFatalFlightInventoryError(code)) {
        clearDealsFlightRuntimeV2(sessionStorage);
        setRuntime(null);
        setPlan(freshPlan());
        setReturnState("idle");
        setFareState("idle");
      }
      setError(code);
      if (stage === "return") setReturnState("error");
      if (stage === "fare") setFareState("error");
      setStatus("error");
    },
    [freshPlan],
  );

  const searchRequest = useMemo(
    () => ({
      tripType: search.flightTripType,
      origin: search.flightOriginCode,
      destination: search.flightDestinationCode,
      departureDate: search.flightDepartureDate,
      ...(search.flightTripType === "round-trip"
        ? { returnDate: search.flightReturnDate }
        : {}),
      travelers:
        search.flightAdults + search.flightChildren + search.flightInfants,
      adults: search.flightAdults,
      children: search.flightChildren,
      infants: search.flightInfants,
      cabinClass: search.flightCabinClass,
      currency: "USD",
    }),
    [search],
  );

  const create = useCallback(async () => {
    cancel();
    const cleared = clearDealsFlightRuntimeV2(sessionStorage);
    if (!cleared.ok)
      return fail(new DealsFlightInventoryClientError(cleared.code, true));
    setRuntime(null);
    setPlan(freshPlan());
    setReturnState("idle");
    setFareState("idle");
    setError(null);
    setStatus("loading");
    const pending = request();
    try {
      const result = await createFlightInventory(
        searchRequest,
        pending.controller.signal,
      );
      if (!current(pending)) return;
      if (result.status === "empty") {
        setStatus("empty");
        return;
      }
      const next: DealsFlightRuntimeV2 = {
        version: 1,
        inventoryToken: result.inventoryToken,
        sourceSearchKey: result.sourceSearchKey,
        inventoryExpiresAt: result.inventoryExpiresAt,
        tripType: search.flightTripType,
        outboundChoices: result.outboundChoices,
        returnChoices: [],
        fareChoices: [],
      };
      if (result.sourceSearchKey !== searchKey)
        throw new DealsFlightInventoryClientError("STALE_SEARCH", true);
      const written = writeDealsFlightRuntimeV2(sessionStorage, next);
      if (!written.ok)
        throw new DealsFlightInventoryClientError(written.code, true);
      setRuntime(written.value);
      setStatus("success");
    } catch (caught) {
      if (current(pending)) fail(caught);
    } finally {
      controllers.current.delete(pending.controller);
    }
  }, [
    cancel,
    current,
    fail,
    freshPlan,
    request,
    search,
    searchKey,
    searchRequest,
  ]);

  const commitRuntime = (next: DealsFlightRuntimeV2) => {
    const written = writeDealsFlightRuntimeV2(sessionStorage, next);
    if (!written.ok) {
      fail(new DealsFlightInventoryClientError(written.code, true));
      return null;
    }
    setRuntime(written.value);
    return written.value;
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const read = readDealsFlightRuntimeV2(
          sessionStorage,
          searchKey,
          search.flightTripType,
        );
        if (!read.ok)
          return fail(new DealsFlightInventoryClientError(read.code, true));
        if (!read.value) return void create();
        setStatus("loading");
        const pending = request();
        try {
          const restored = await restoreDealsFlightRuntimeV2({
            stored: read.value,
            freshPlan: freshPlan(),
            search,
            searchKey,
            requests: {
              getReturns: (body) =>
                getFlightReturnChoices(body, pending.controller.signal),
              getFares: (body) =>
                getFlightFareChoices(body, pending.controller.signal),
            },
          });
          if (!current(pending)) return;
          const written = writeDealsFlightRuntimeV2(
            sessionStorage,
            restored.runtime,
          );
          if (!written.ok)
            throw new DealsFlightInventoryClientError(written.code, true);
          setRuntime(written.value);
          setPlan(restored.plan);
          setReturnState(restored.returnState);
          setFareState(restored.fareState);
          setStatus("success");
        } catch (caught) {
          if (current(pending)) fail(caught);
        } finally {
          controllers.current.delete(pending.controller);
        }
      })();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [
    cancel,
    create,
    current,
    fail,
    freshPlan,
    request,
    search,
    search.flightTripType,
    searchKey,
  ]);

  const selectOutbound = async (key: string) => {
    if (!runtime || runtime.selectedOutboundKey === key) return;
    cancel();
    setError(null);
    setStatus("loading");
    setReturnState(search.flightTripType === "round-trip" ? "loading" : "idle");
    setFareState(search.flightTripType === "one-way" ? "loading" : "idle");
    const itinerary = runtime.outboundChoices.find(
      (choice) => choice.itineraryKey === key,
    );
    if (!itinerary)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!applied.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const next = {
      ...runtime,
      selectedOutboundKey: key,
      selectedReturnKey: undefined,
      selectedFareKey: undefined,
      returnChoices: [],
      fareChoices: [],
    };
    if (!commitRuntime(next)) return;
    setPlan(applied.plan);
    const pending = request();
    try {
      if (search.flightTripType === "round-trip") {
        const returnChoices = await getFlightReturnChoices(
          {
            inventoryToken: next.inventoryToken,
            sourceSearchKey: next.sourceSearchKey,
            outboundItineraryKey: key,
          },
          pending.controller.signal,
        );
        if (current(pending)) {
          if (!commitRuntime({ ...next, returnChoices })) return;
          setReturnState(returnChoices.length ? "success" : "empty");
          setStatus("success");
        }
      } else {
        const fareChoices = await getFlightFareChoices(
          {
            inventoryToken: next.inventoryToken,
            sourceSearchKey: next.sourceSearchKey,
            outboundItineraryKey: key,
          },
          pending.controller.signal,
        );
        if (current(pending)) {
          if (!commitRuntime({ ...next, fareChoices })) return;
          setFareState(fareChoices.length ? "success" : "empty");
          setStatus("success");
        }
      }
    } catch (caught) {
      if (current(pending))
        fail(
          caught,
          search.flightTripType === "round-trip" ? "return" : "fare",
        );
    }
  };
  const selectReturn = async (key: string) => {
    if (!runtime?.selectedOutboundKey || runtime.selectedReturnKey === key)
      return;
    const outboundItineraryKey = runtime.selectedOutboundKey;
    cancel();
    setError(null);
    setStatus("loading");
    setFareState("loading");
    const itinerary = runtime.returnChoices.find(
      (choice) => choice.itineraryKey === key,
    );
    if (!itinerary)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_RETURN_SELECTED",
      itinerary,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!applied.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const next = {
      ...runtime,
      selectedReturnKey: key,
      selectedFareKey: undefined,
      fareChoices: [],
    };
    if (!commitRuntime(next)) return;
    setPlan(applied.plan);
    const pending = request();
    try {
      const fareChoices = await getFlightFareChoices(
        {
          inventoryToken: next.inventoryToken,
          sourceSearchKey: next.sourceSearchKey,
          outboundItineraryKey,
          returnItineraryKey: key,
        },
        pending.controller.signal,
      );
      if (current(pending)) {
        if (!commitRuntime({ ...next, fareChoices })) return;
        setFareState(fareChoices.length ? "success" : "empty");
        setStatus("success");
      }
    } catch (caught) {
      if (current(pending)) fail(caught, "fare");
    }
  };
  const selectFare = (key: string) => {
    if (!runtime) return;
    const fare = runtime.fareChoices.find((choice) => choice.fareKey === key);
    if (!fare)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!applied.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    if (!commitRuntime({ ...runtime, selectedFareKey: key })) return;
    setPlan(applied.plan);
  };

  if (!runtime && status === "loading")
    return (
      <div role="status" className="rounded-2xl bg-white p-8">
        Loading current flight availability…
      </div>
    );
  if (!runtime)
    return (
      <SafeState
        message={
          error ? messages[error] : "No flights are available for this search."
        }
        onRetry={create}
      />
    );
  return (
    <div className="space-y-8" data-deals-v2-flight-runtime>
      {error && <SafeState message={messages[error]} onRetry={create} />}
      <ChoiceSection
        title="Choose your outbound flight"
        busy={status === "loading"}
      >
        {runtime.outboundChoices.map((choice) => (
          <ItineraryButton
            key={choice.itineraryKey}
            choice={choice}
            selected={runtime.selectedOutboundKey === choice.itineraryKey}
            onSelect={() => void selectOutbound(choice.itineraryKey)}
          />
        ))}
      </ChoiceSection>
      {runtime.tripType === "round-trip" && runtime.selectedOutboundKey && (
        <ChoiceSection
          title="Choose your return flight"
          busy={status === "loading"}
        >
          {runtime.returnChoices.map((choice) => (
            <ItineraryButton
              key={choice.itineraryKey}
              choice={choice}
              selected={runtime.selectedReturnKey === choice.itineraryKey}
              onSelect={() => void selectReturn(choice.itineraryKey)}
            />
          ))}
          {shouldRenderDownstreamEmpty(
            returnState,
            runtime.returnChoices.length,
          ) && (
            <p>
              No compatible return flights are currently available for this
              outbound.
            </p>
          )}
        </ChoiceSection>
      )}
      {runtime.selectedOutboundKey &&
        (runtime.tripType === "one-way" || runtime.selectedReturnKey) && (
          <ChoiceSection
            title="Choose a fare and cabin"
            busy={status === "loading"}
          >
            <p className="text-sm text-slate-600">
              Current flight fares may need to be refreshed before final
              confirmation.
            </p>
            {runtime.fareChoices.map((fare) => (
              <button
                type="button"
                aria-pressed={runtime.selectedFareKey === fare.fareKey}
                onClick={() => selectFare(fare.fareKey)}
                key={fare.fareKey}
                className="focus-ring w-full rounded-2xl border border-slate-300 bg-white p-5 text-left aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-700"
              >
                <span className="font-bold capitalize">{fare.cabinClass}</span>
                <span className="ml-3 text-lg font-extrabold">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: fare.sourceCurrency,
                  }).format(fare.sourcePrice)}
                </span>
                <span className="mt-2 block text-sm text-slate-600">
                  {fare.baggageInfo || "Baggage details unavailable"} ·{" "}
                  {fare.refundInfo || "Refund terms unavailable"}
                </span>
              </button>
            ))}
            {shouldRenderDownstreamEmpty(
              fareState,
              runtime.fareChoices.length,
            ) && <p>No fares are currently available for this itinerary.</p>}
          </ChoiceSection>
        )}
    </div>
  );
}

function ChoiceSection({
  title,
  busy,
  children,
}: {
  title: string;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-busy={busy}>
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      {busy && (
        <p role="status" className="mb-3 text-sm font-semibold text-blue-800">
          Updating available choices…
        </p>
      )}
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
function ItineraryButton({
  choice,
  selected,
  onSelect,
}: {
  choice: DealsFlightRuntimeV2["outboundChoices"][number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="focus-ring w-full rounded-2xl border border-slate-300 bg-white p-5 text-left aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-700"
    >
      <span className="block text-lg font-extrabold">
        {choice.originAirport} → {choice.destinationAirport}
      </span>
      <span className="mt-1 block text-slate-700">
        {new Date(choice.departureTime).toLocaleString()} –{" "}
        {new Date(choice.arrivalTime).toLocaleString()}
      </span>
      <span className="mt-2 block text-sm text-slate-600">
        {choice.duration} ·{" "}
        {choice.stops === 0
          ? "Nonstop"
          : `${choice.stops} stop${choice.stops === 1 ? "" : "s"}`}
        {choice.segments[0]?.airlineName
          ? ` · ${choice.segments[0].airlineName}`
          : ""}
      </span>
    </button>
  );
}
function SafeState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-300 bg-white p-6"
    >
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
      >
        Retry flight search
      </button>
    </div>
  );
}
