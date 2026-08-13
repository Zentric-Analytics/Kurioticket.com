"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import type { DisplayPrice } from "@/lib/currency/formatCurrency";
import { formatTime } from "@/lib/utils";
import {
  serializeDealsSearchParams,
  type DealsSearch,
} from "@/lib/deals/dealsSearchParams";
import { buildDealsProductSearchKeys } from "@/lib/deals/dealsProductSearchKeys";
import { buildDealsJourneyUrl } from "@/lib/deals/dealsJourneyRoutes";
import {
  buildDealsReviewSnapshotV2,
  evaluateDealsReviewLifecycleV2,
  isCurrentDealsReviewSnapshotV2,
  type DealsReviewSnapshotV2,
} from "@/lib/deals/dealsReviewLifecycleV2";
import {
  applyDealsJourneyEventV2,
  getRequiredDealsJourneyStateV2,
} from "@/lib/deals/dealsJourneyEngineV2";
import {
  createDealsTripPlanV2ForRestart,
  type DealsTripPlanV2,
} from "@/lib/deals/dealsTripPlanV2";
import type { DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import {
  installDealsCurrentPlanV2,
  isDealsFlightInventoryBlockedByHotelV2,
} from "@/lib/deals/dealsFlightJourneyControllerV2";
import {
  createFlightInventory,
  DealsFlightInventoryClientError,
  getFlightBrandFareChoices,
  getFlightBrandReturnChoices,
  getFlightFareChoices,
  getFlightFareBrandOptions,
  getFlightReturnChoices,
  revalidateFlightOfferV2,
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
import {
  buildDealsFlightSelectionSnapshotV2,
  canonicalOfferForSnapshotV2,
  createDealsFlightRevalidationCoordinatorV2,
  fareFromConfirmedOfferV2,
  getDealsFlightMaterialChangesV2,
  sameDealsFlightSelectionSnapshotV2,
  type DealsFlightSelectionSnapshotV2,
} from "@/lib/deals/dealsFlightRevalidationV2";
import type { DealsConfirmedFlightOfferV2 } from "@/lib/deals/dealsTripPlanV2";
import {
  filterAndSortDealsOutboundResultsV2,
  type OutboundDepartureFilter,
  type OutboundSort,
  type OutboundStopsFilter,
} from "@/lib/deals/dealsOutboundResultsV2";
import {
  deriveDealsOutboundDisplayPricesV2,
  getComparableDealsOutboundPriceV2,
} from "@/lib/deals/dealsOutboundDisplayPriceV2";
import { DealsCarJourneyV2 } from "./DealsCarJourneyV2";
import { DealsReviewJourneyV2 } from "./DealsReviewJourneyV2";
import { writeDealsHandoffSnapshotV2 } from "@/lib/deals/dealsHandoffSnapshotV2";

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
  const router = useRouter();
  const { locale } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const searchKey = buildDealsProductSearchKeys(search).flight;
  const [runtime, setRuntime] = useState<DealsFlightRuntimeV2 | null>(null);
  const freshPlan = useCallback(
    (now = Date.now()) =>
      createDealsTripPlanV2ForRestart(search, upstreamPlan, now),
    [search, upstreamPlan],
  );
  const [plan, setPlan] = useState<DealsTripPlanV2>(() => freshPlan());
  const planRef = useRef(plan);
  const installPlan = useCallback(
    (nextPlan: DealsTripPlanV2) =>
      installDealsCurrentPlanV2(planRef, setPlan, nextPlan),
    [],
  );
  const [status, setStatus] = useState<Status>("initial");
  const [brandState, setBrandState] = useState<DownstreamLoadState>("idle");
  const [returnState, setReturnState] = useState<DownstreamLoadState>("idle");
  const [fareState, setFareState] = useState<DownstreamLoadState>("idle");
  const [error, setError] = useState<DealsFlightInventoryErrorCode | null>(
    null,
  );
  const [revalidationMessage, setRevalidationMessage] = useState<string | null>(
    null,
  );
  const [pendingChange, setPendingChange] = useState<{
    snapshot: DealsFlightSelectionSnapshotV2;
    offer: DealsConfirmedFlightOfferV2;
    generation: number;
  } | null>(null);
  const [editingCar, setEditingCar] = useState(false);
  const [journeyNow, setJourneyNow] = useState(() => Date.now());
  const [reviewRecovery, setReviewRecovery] = useState<"plan" | "hotel" | null>(
    null,
  );
  const [stopsFilter, setStopsFilter] = useState<OutboundStopsFilter>("all");
  const [departureFilter, setDepartureFilter] =
    useState<OutboundDepartureFilter>("all");
  const [outboundSort, setOutboundSort] = useState<OutboundSort>("departure");
  const coordinator = useRef(createDealsFlightRevalidationCoordinatorV2());
  const cancel = useCallback(() => {
    coordinator.current.cancel();
    setPendingChange(null);
    setRevalidationMessage(null);
  }, []);
  const request = useCallback(() => coordinator.current.request(), []);
  const current = useCallback(
    (value: { controller: AbortController; generation: number }) =>
      coordinator.current.current(value),
    [],
  );
  const fail = useCallback(
    (caught: unknown, stage?: "brand" | "return" | "fare") => {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      const code =
        caught instanceof DealsFlightInventoryClientError
          ? caught.code
          : "NETWORK_FAILURE";
      if (isFatalFlightInventoryError(code)) {
        clearDealsFlightRuntimeV2(sessionStorage);
        setRuntime(null);
        installPlan(freshPlan());
        setBrandState("idle");
        setReturnState("idle");
        setFareState("idle");
      }
      setError(code);
      if (stage === "brand") setBrandState("error");
      if (stage === "return") setReturnState("error");
      if (stage === "fare") setFareState("error");
      setStatus("error");
    },
    [freshPlan, installPlan],
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
    setReviewRecovery(null);
    cancel();
    const cleared = clearDealsFlightRuntimeV2(sessionStorage);
    if (!cleared.ok)
      return fail(new DealsFlightInventoryClientError(cleared.code, true));
    setRuntime(null);
    setBrandState("idle");
    setReturnState("idle");
    setFareState("idle");
    setError(null);
    const nextPlan = freshPlan();
    installPlan(nextPlan);
    if (isDealsFlightInventoryBlockedByHotelV2(search.mode, nextPlan)) {
      setStatus("initial");
      return;
    }
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
        version: search.flightTripType === "round-trip" ? 2 : 1,
        inventoryToken: result.inventoryToken,
        sourceSearchKey: result.sourceSearchKey,
        inventoryExpiresAt: result.inventoryExpiresAt,
        tripType: search.flightTripType,
        outboundChoices: result.outboundChoices,
        ...(search.flightTripType === "round-trip"
          ? { fareBrandOptions: [] }
          : {}),
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
      coordinator.current.finish(pending);
    }
  }, [
    cancel,
    current,
    fail,
    freshPlan,
    installPlan,
    request,
    search,
    searchKey,
    searchRequest,
  ]);

  const hotelPrerequisiteMissing =
    (search.mode === "hotel-flight-car" || search.mode === "hotel-flight") &&
    !plan.hotel;

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
        if (search.flightTripType === "round-trip" && read.value.version === 1)
          return void create();
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
              getFareBrands: (body) =>
                getFlightFareBrandOptions(body, pending.controller.signal),
              getBrandReturns: (body) =>
                getFlightBrandReturnChoices(body, pending.controller.signal),
              getBrandFares: (body) =>
                getFlightBrandFareChoices(body, pending.controller.signal),
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
          installPlan(restored.plan);
          setBrandState(restored.brandState);
          setReturnState(restored.returnState);
          setFareState(restored.fareState);
          setStatus("success");
        } catch (caught) {
          if (current(pending)) fail(caught);
        } finally {
          coordinator.current.finish(pending);
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
    installPlan,
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
    setBrandState(search.flightTripType === "round-trip" ? "loading" : "idle");
    setReturnState("idle");
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
      fareBrandOptions: runtime.version === 2 ? [] : undefined,
      selectedBrandOptionKey: undefined,
      selectedReturnKey: undefined,
      selectedFareKey: undefined,
      returnChoices: [],
      fareChoices: [],
    };
    if (!commitRuntime(next)) return;
    installPlan(applied.plan);
    const pending = request();
    try {
      if (search.flightTripType === "round-trip") {
        const fareBrandOptions = await getFlightFareBrandOptions(
          {
            inventoryToken: next.inventoryToken,
            sourceSearchKey: next.sourceSearchKey,
            outboundItineraryKey: key,
          },
          pending.controller.signal,
        );
        if (current(pending)) {
          if (!commitRuntime({ ...next, fareBrandOptions })) return;
          setBrandState(fareBrandOptions.length ? "success" : "empty");
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
        fail(caught, search.flightTripType === "round-trip" ? "brand" : "fare");
    }
  };
  const selectFareBrand = async (key: string) => {
    if (
      !runtime?.selectedOutboundKey ||
      runtime.version !== 2 ||
      runtime.selectedBrandOptionKey === key
    )
      return;
    const outboundItineraryKey = runtime.selectedOutboundKey;
    const option = runtime.fareBrandOptions?.find(
      (candidate) => candidate.brandOptionKey === key,
    );
    if (!option)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    cancel();
    setError(null);
    setStatus("loading");
    setReturnState("loading");
    setFareState("idle");
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_FARE_BRAND_SELECTED",
      fareBrand: {
        brandOptionKey: option.brandOptionKey,
        fareBrandName: option.fareBrandName,
        ...(option.cabinClass ? { cabinClass: option.cabinClass } : {}),
      },
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!applied.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const next = {
      ...runtime,
      selectedBrandOptionKey: key,
      selectedReturnKey: undefined,
      selectedFareKey: undefined,
      returnChoices: [],
      fareChoices: [],
    };
    if (!commitRuntime(next)) return;
    installPlan(applied.plan);
    const pending = request();
    try {
      const returnChoices = await getFlightBrandReturnChoices(
        {
          inventoryToken: next.inventoryToken,
          sourceSearchKey: next.sourceSearchKey,
          outboundItineraryKey,
          brandOptionKey: key,
        },
        pending.controller.signal,
      );
      if (current(pending)) {
        if (!commitRuntime({ ...next, returnChoices })) return;
        setReturnState(returnChoices.length ? "success" : "empty");
        setStatus("success");
      }
    } catch (caught) {
      if (current(pending)) fail(caught, "return");
    }
  };
  const selectReturn = async (key: string) => {
    if (
      !runtime?.selectedOutboundKey ||
      !runtime.selectedBrandOptionKey ||
      runtime.selectedReturnKey === key
    )
      return;
    const outboundItineraryKey = runtime.selectedOutboundKey;
    const brandOptionKey = runtime.selectedBrandOptionKey;
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
    installPlan(applied.plan);
    const pending = request();
    try {
      const fareChoices = await getFlightBrandFareChoices(
        {
          inventoryToken: next.inventoryToken,
          sourceSearchKey: next.sourceSearchKey,
          outboundItineraryKey,
          brandOptionKey,
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
    if (!runtime || runtime.selectedFareKey === key) return;
    const fare = runtime.fareChoices.find((choice) => choice.fareKey === key);
    if (!fare)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    cancel();
    setError(null);
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
    installPlan(applied.plan);
    setStatus("success");
  };

  const recoverExactFares = async (
    message: string,
    event: "FLIGHT_OFFER_EXPIRED" | "FLIGHT_OFFER_UNAVAILABLE",
  ) => {
    if (!runtime?.selectedOutboundKey)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const outboundItineraryKey = runtime.selectedOutboundKey;
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: event,
      expectedRevision: plan.revision,
    });
    if (!applied.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    cancel();
    const next = {
      ...runtime,
      selectedFareKey: undefined,
      fareChoices: [],
    };
    if (!commitRuntime(next)) return;
    installPlan(applied.plan);
    setFareState("loading");
    setStatus("loading");
    setRevalidationMessage(message);
    const pending = request();
    try {
      const fareChoices =
        next.tripType === "round-trip"
          ? next.selectedBrandOptionKey && next.selectedReturnKey
            ? await getFlightBrandFareChoices(
                {
                  inventoryToken: next.inventoryToken,
                  sourceSearchKey: next.sourceSearchKey,
                  outboundItineraryKey,
                  brandOptionKey: next.selectedBrandOptionKey,
                  returnItineraryKey: next.selectedReturnKey,
                },
                pending.controller.signal,
              )
            : null
          : await getFlightFareChoices(
              {
                inventoryToken: next.inventoryToken,
                sourceSearchKey: next.sourceSearchKey,
                outboundItineraryKey,
              },
              pending.controller.signal,
            );
      if (!fareChoices)
        throw new DealsFlightInventoryClientError("INVALID_SELECTION", false);
      if (current(pending)) {
        if (!commitRuntime({ ...next, fareChoices })) return;
        setFareState(fareChoices.length ? "success" : "empty");
        setStatus("success");
      }
    } catch (caught) {
      if (current(pending)) fail(caught, "fare");
    } finally {
      coordinator.current.finish(pending);
    }
  };

  const confirmFlight = async () => {
    if (status === "loading") return;
    const snapshot = buildDealsFlightSelectionSnapshotV2(runtime, plan);
    if (!snapshot)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const started = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_REVALIDATION_STARTED",
      expectedRevision: plan.revision,
    });
    if (!started.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    installPlan(started.plan);
    setPendingChange(null);
    setRevalidationMessage(null);
    setError(null);
    setStatus("loading");
    const pending = request();
    try {
      const result = await revalidateFlightOfferV2(
        snapshot,
        pending.controller.signal,
      );
      if (!current(pending)) return;
      const currentSnapshot = buildDealsFlightSelectionSnapshotV2(
        runtime,
        started.plan,
      );
      if (!sameDealsFlightSelectionSnapshotV2(snapshot, currentSnapshot))
        return;
      if (result.status === "confirmed" || result.status === "changed") {
        const offer = canonicalOfferForSnapshotV2(result.offer, snapshot);
        if (!offer)
          throw new DealsFlightInventoryClientError("INVALID_SELECTION", false);
        if (result.status === "changed") {
          setPendingChange({
            snapshot,
            offer,
            generation: pending.generation,
          });
          setStatus("success");
          return;
        }
        const fare = fareFromConfirmedOfferV2(offer);
        if (!fare || !runtime)
          throw new DealsFlightInventoryClientError(
            "MALFORMED_RESPONSE",
            false,
          );
        const updatedRuntime = {
          ...runtime,
          fareChoices: runtime.fareChoices.map((item) =>
            item.fareKey === fare.fareKey ? fare : item,
          ),
        };
        if (!commitRuntime(updatedRuntime)) return;
        const succeeded = applyDealsJourneyEventV2(started.plan, search, {
          type: "FLIGHT_REVALIDATION_SUCCEEDED",
          offer,
          expectedRevision: started.plan.revision,
        });
        if (!succeeded.ok)
          throw new DealsFlightInventoryClientError("INVALID_SELECTION", false);
        installPlan(succeeded.plan);
        setStatus("success");
        return;
      }
      if (result.status === "temporary-failure") {
        setRevalidationMessage(
          "We couldn't refresh this flight right now. Try again.",
        );
        setStatus("success");
      } else if (result.status === "expired") {
        await recoverExactFares(
          "This flight offer expired. Refresh flight availability.",
          "FLIGHT_OFFER_EXPIRED",
        );
      } else if (result.status === "unavailable") {
        await recoverExactFares(
          "This flight is no longer available. Refresh flight availability.",
          "FLIGHT_OFFER_UNAVAILABLE",
        );
      } else {
        await recoverExactFares(
          "This flight selection is no longer valid. Refresh availability.",
          "FLIGHT_OFFER_UNAVAILABLE",
        );
      }
    } catch (caught) {
      if (current(pending)) {
        setStatus("success");
        fail(caught);
      }
    } finally {
      coordinator.current.finish(pending);
    }
  };

  const acceptChangedFlight = () => {
    if (
      !pendingChange ||
      pendingChange.generation !== coordinator.current.generation()
    ) {
      setPendingChange(null);
      return;
    }
    if (!runtime || pendingChange.offer.offerExpiresAt <= Date.now()) {
      setPendingChange(null);
      setRevalidationMessage(
        "The refreshed flight expired. Confirm the fare again.",
      );
      return;
    }
    const snapshot = buildDealsFlightSelectionSnapshotV2(runtime, plan);
    if (!sameDealsFlightSelectionSnapshotV2(pendingChange.snapshot, snapshot)) {
      setPendingChange(null);
      return;
    }
    const offer = canonicalOfferForSnapshotV2(
      pendingChange.offer,
      pendingChange.snapshot,
    );
    const fare = fareFromConfirmedOfferV2(offer);
    if (!offer || !fare)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const selected = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!selected.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const nextRuntime = {
      ...runtime,
      fareChoices: runtime.fareChoices.map((item) =>
        item.fareKey === fare.fareKey ? fare : item,
      ),
    };
    if (!commitRuntime(nextRuntime)) return;
    const started = applyDealsJourneyEventV2(selected.plan, search, {
      type: "FLIGHT_REVALIDATION_STARTED",
      expectedRevision: selected.plan.revision,
    });
    if (!started.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    const succeeded = applyDealsJourneyEventV2(started.plan, search, {
      type: "FLIGHT_REVALIDATION_SUCCEEDED",
      offer,
      expectedRevision: started.plan.revision,
    });
    if (!succeeded.ok)
      return fail(
        new DealsFlightInventoryClientError("INVALID_SELECTION", false),
      );
    setPendingChange(null);
    installPlan(succeeded.plan);
  };

  const declineChangedFlight = () => {
    if (!plan.flightJourney?.fare) return setPendingChange(null);
    const applied = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare: plan.flightJourney.fare,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    setPendingChange(null);
    if (applied.ok) installPlan(applied.plan);
  };

  const recoverReviewLifecycle = useCallback(
    (snapshot: DealsReviewSnapshotV2) => {
      const currentPlan = planRef.current;
      const now = Date.now();
      const outcome = evaluateDealsReviewLifecycleV2(
        currentPlan,
        snapshot,
        now,
      );
      if (outcome.status === "stale" || outcome.status === "review-ready")
        return outcome.status;

      setJourneyNow(now);
      setEditingCar(false);
      if (outcome.kind === "plan") {
        setReviewRecovery("plan");
        return "recovered";
      }
      if (outcome.kind === "hotel") {
        cancel();
        clearDealsFlightRuntimeV2(sessionStorage);
        setRuntime(null);
        setReviewRecovery("hotel");
        return "recovered";
      }
      if (outcome.kind === "flight-offer") {
        void recoverExactFares(
          "This flight offer expired. Refresh flight availability.",
          "FLIGHT_OFFER_EXPIRED",
        );
        return "recovered";
      }
      // Car freshness is derived from time. Preserve the canonical plan.
      return "recovered";
    },
    [cancel, recoverExactFares],
  );

  const continueReview = useCallback(
    (snapshot: DealsReviewSnapshotV2) => {
      const currentPlan = planRef.current;
      const now = Date.now();
      const lifecycle = evaluateDealsReviewLifecycleV2(
        currentPlan,
        snapshot,
        now,
      );
      if (lifecycle.status === "stale") return { status: "stale" } as const;
      if (lifecycle.status === "expired") {
        recoverReviewLifecycle(snapshot);
        return { status: "recovered" } as const;
      }
      const result = applyDealsJourneyEventV2(
        currentPlan,
        search,
        {
          type: "REVIEW_CONTINUE_REQUESTED",
          expectedRevision: currentPlan.revision,
        },
        now,
      );
      if (result.ok && result.nextState === "handoff") {
        if (!writeDealsHandoffSnapshotV2(sessionStorage, currentPlan))
          return { status: "persistence-failed" as const };
        const params = serializeDealsSearchParams(search);
        params.set("journey", "guided-v2");
        router.push(`/deals/handoff?${params.toString()}`);
        return { status: "continued" as const };
      }
      return { status: "recovered" as const };
    },
    [recoverReviewLifecycle, router, search],
  );

  const changeFlightFromReview = (snapshot: DealsReviewSnapshotV2) => {
    const currentPlan = planRef.current;
    if (!isCurrentDealsReviewSnapshotV2(currentPlan, snapshot)) return;
    const fare = currentPlan.flightJourney?.fare;
    if (!fare) return;
    cancel();
    setEditingCar(false);
    const applied = applyDealsJourneyEventV2(currentPlan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare,
      sourceSearchKey: searchKey,
      expectedRevision: currentPlan.revision,
    });
    if (applied.ok) installPlan(applied.plan);
  };

  if (reviewRecovery === "plan")
    return (
      <ReviewRecovery
        message="Your package session expired. Refresh availability to continue."
        action="Refresh availability"
        onRecover={() => void create()}
      />
    );
  if (reviewRecovery === "hotel")
    return (
      <ReviewRecovery
        message="Your hotel selection expired. Return to the hotel step to choose it again."
        action="Return to hotel results"
        onRecover={() =>
          router.push(buildDealsJourneyUrl("hotel-results", search))
        }
      />
    );
  if (hotelPrerequisiteMissing)
    return (
      <SafeState message="Your hotel selection expired. Return to the hotel step to choose it again." />
    );
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
          revalidationMessage ||
          (error
            ? messages[error]
            : "No flights are available for this search.")
        }
        onRetry={create}
      />
    );
  const requiredState = getRequiredDealsJourneyStateV2(
    plan,
    Math.max(journeyNow, plan.updatedAt),
  );
  if (requiredState === "review" && !editingCar)
    return (
      <DealsReviewJourneyV2
        key={`${plan.searchFingerprint}:${plan.revision}`}
        plan={plan}
        onChangeFlight={changeFlightFromReview}
        onChangeCar={(snapshot) => {
          if (isCurrentDealsReviewSnapshotV2(planRef.current, snapshot))
            setEditingCar(true);
        }}
        onChangeStay={(snapshot) => {
          if (!isCurrentDealsReviewSnapshotV2(planRef.current, snapshot))
            return;
          clearDealsFlightRuntimeV2(sessionStorage);
          router.push(buildDealsJourneyUrl("hotel-results", search));
        }}
        onContinue={continueReview}
        onLifecycleDeadline={recoverReviewLifecycle}
      />
    );
  if (editingCar && requiredState === "review")
    return (
      <DealsCarJourneyV2
        search={search}
        plan={plan}
        editing
        onBackToReview={() => setEditingCar(false)}
        onPlanChange={(next) => {
          installPlan(next);
          setEditingCar(false);
        }}
        onSessionExpired={() => void create()}
        onFlightExpired={() =>
          recoverReviewLifecycle(buildDealsReviewSnapshotV2(plan))
        }
      />
    );
  const outboundDisplayPrices = deriveDealsOutboundDisplayPricesV2({
    choices: runtime.outboundChoices,
    displayCurrency: selectedOption.currency,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const visibleOutboundChoices = filterAndSortDealsOutboundResultsV2(
    runtime.outboundChoices,
    { stops: stopsFilter, departure: departureFilter, sort: outboundSort },
    (choice) =>
      getComparableDealsOutboundPriceV2(
        outboundDisplayPrices.get(choice.itineraryKey),
        selectedOption.currency,
      ),
  );
  return (
    <div className="space-y-8" data-deals-v2-flight-runtime>
      {error && <SafeState message={messages[error]} onRetry={create} />}
      <ChoiceSection
        title="Choose your departing flight"
        busy={status === "loading"}
      >
        <OutboundControls
          stops={stopsFilter}
          departure={departureFilter}
          sort={outboundSort}
          onStops={setStopsFilter}
          onDeparture={setDepartureFilter}
          onSort={setOutboundSort}
        />
        {visibleOutboundChoices.map((choice) => (
          <ItineraryButton
            key={choice.itineraryKey}
            choice={choice}
            displayPrice={outboundDisplayPrices.get(choice.itineraryKey)}
            locale={locale}
            selected={runtime.selectedOutboundKey === choice.itineraryKey}
            onSelect={() => void selectOutbound(choice.itineraryKey)}
          />
        ))}
        {!visibleOutboundChoices.length && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            No outbound flights match these filters. Adjust the filters to see
            more options.
          </p>
        )}
      </ChoiceSection>
      {runtime.tripType === "round-trip" && runtime.selectedOutboundKey && (
        <ChoiceSection title="Choose a fare option" busy={status === "loading"}>
          <p className="text-sm text-slate-600">
            Choose the fare option you want with this departing flight. Any
            “From” price is based on compatible complete round-trip flight
            offers. Your exact fare and terms are shown after you choose a
            return flight.
          </p>
          {runtime.fareBrandOptions?.map((option) => (
            <button
              type="button"
              aria-pressed={
                runtime.selectedBrandOptionKey === option.brandOptionKey
              }
              onClick={() => void selectFareBrand(option.brandOptionKey)}
              key={option.brandOptionKey}
              className="focus-ring w-full rounded-2xl border border-slate-300 bg-white p-5 text-left aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-700"
            >
              <span className="block text-lg font-extrabold">
                {option.fareBrandName}
              </span>
              {option.cabinClass && (
                <span className="mt-1 block capitalize">
                  {option.cabinClass}
                </span>
              )}
              <span className="mt-1 block text-sm text-slate-600">
                {option.ownerNames.length === 1 ? "Airline" : "Airlines"}:{" "}
                {option.ownerNames.join(", ")}
              </span>
              {option.indicativeFromPrice !== undefined &&
                option.indicativeCurrency && (
                  <span className="mt-2 block font-bold">
                    From{" "}
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: option.indicativeCurrency,
                    }).format(option.indicativeFromPrice)}{" "}
                    round-trip flight
                  </span>
                )}
            </button>
          ))}
          {shouldRenderDownstreamEmpty(
            brandState,
            runtime.fareBrandOptions?.length ?? 0,
          ) && (
            <p>
              No fare options are currently available for this departing flight.
            </p>
          )}
        </ChoiceSection>
      )}
      {runtime.tripType === "round-trip" && runtime.selectedBrandOptionKey && (
        <ChoiceSection
          title="Choose your return flight"
          busy={status === "loading"}
        >
          {runtime.returnChoices.map((choice) => (
            <ItineraryButton
              key={choice.itineraryKey}
              choice={choice}
              locale={locale}
              selected={runtime.selectedReturnKey === choice.itineraryKey}
              onSelect={() => void selectReturn(choice.itineraryKey)}
            />
          ))}
          {shouldRenderDownstreamEmpty(
            returnState,
            runtime.returnChoices.length,
          ) && (
            <p>
              No compatible return flights are currently available for this fare
              option and departing flight.
            </p>
          )}
        </ChoiceSection>
      )}
      {runtime.selectedOutboundKey &&
        (runtime.tripType === "one-way" || runtime.selectedReturnKey) && (
          <ChoiceSection
            title={
              runtime.tripType === "round-trip"
                ? "Choose your final flight fare"
                : "Choose a fare and cabin"
            }
            busy={status === "loading"}
          >
            <p className="text-sm text-slate-600">
              {runtime.tripType === "round-trip"
                ? "These are current exact complete flight offers matching your departing flight, fare option, and return flight. Your selection will be refreshed before continuing."
                : "Current flight fares may need to be refreshed before continuing."}
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
            {runtime.selectedFareKey && !pendingChange && (
              <button
                type="button"
                onClick={() => void confirmFlight()}
                disabled={status === "loading"}
                aria-busy={status === "loading"}
                className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {status === "loading"
                  ? "Checking fare…"
                  : "Continue with this fare"}
              </button>
            )}
            {revalidationMessage && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 p-4"
              >
                <p className="font-semibold">{revalidationMessage}</p>
                <button
                  type="button"
                  onClick={() => void confirmFlight()}
                  className="focus-ring mt-3 min-h-11 rounded-xl border border-blue-700 px-4 font-bold text-blue-800"
                >
                  Try again
                </button>
              </div>
            )}
            {pendingChange &&
              (() => {
                const selectedFare = runtime.fareChoices.find(
                  (item) => item.fareKey === pendingChange.snapshot.fareKey,
                );
                const changes = selectedFare
                  ? getDealsFlightMaterialChangesV2(
                      selectedFare,
                      pendingChange.offer,
                    )
                  : [];
                return (
                  <section
                    role="alertdialog"
                    aria-labelledby="changed-flight-heading"
                    className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5"
                    tabIndex={-1}
                  >
                    <h3
                      id="changed-flight-heading"
                      className="text-lg font-extrabold"
                    >
                      Your flight details changed
                    </h3>
                    <p className="mt-2 text-sm text-slate-700">
                      The provider refreshed your exact selected offer. Review
                      the updated Flight terms before continuing.
                    </p>
                    <dl className="mt-4 grid gap-3">
                      {changes.map((change) => (
                        <div
                          key={change.field}
                          className="rounded-xl bg-white p-3"
                        >
                          <dt className="font-bold">{change.field}</dt>
                          <dd>
                            <span
                              className="line-through"
                              aria-label={`Previous ${change.field}: ${change.before}`}
                            >
                              {change.before}
                            </span>
                            <span aria-hidden="true"> → </span>
                            <strong
                              aria-label={`Updated ${change.field}: ${change.after}`}
                            >
                              {change.after}
                            </strong>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={acceptChangedFlight}
                        className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
                      >
                        Accept updated flight
                      </button>
                      <button
                        type="button"
                        onClick={declineChangedFlight}
                        className="focus-ring min-h-11 rounded-xl border border-slate-500 bg-white px-5 font-bold"
                      >
                        Choose another fare
                      </button>
                    </div>
                  </section>
                );
              })()}
          </ChoiceSection>
        )}
      {plan.flightJourney?.phase === "confirmed" &&
        plan.flightJourney.confirmedOffer && (
          <section
            aria-labelledby="confirmed-flight-heading"
            className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6"
          >
            <h2
              id="confirmed-flight-heading"
              className="text-xl font-extrabold"
            >
              Flight offer verified
            </h2>
            <p className="mt-2 font-semibold">
              {plan.flightJourney.confirmedOffer.airline}
              {plan.flightJourney.confirmedOffer.flightNumber
                ? ` · ${plan.flightJourney.confirmedOffer.flightNumber}`
                : ""}
            </p>
            <p className="mt-1 capitalize">
              {plan.flightJourney.confirmedOffer.cabinClass} ·{" "}
              {plan.flightJourney.confirmedOffer.baggageInfo ||
                "Baggage details unavailable"}{" "}
              ·{" "}
              {plan.flightJourney.confirmedOffer.refundInfo ||
                "Refund terms unavailable"}
            </p>
            <p className="mt-2 text-lg font-extrabold">
              {plan.flightJourney.confirmedOffer.sourceCurrency}{" "}
              {plan.flightJourney.confirmedOffer.sourcePrice}
            </p>
          </section>
        )}
      {(search.mode === "flight-car" || search.mode === "hotel-flight-car") &&
        plan.flightJourney?.phase === "confirmed" &&
        plan.flightJourney.confirmedOffer && (
          <DealsCarJourneyV2
            key={`${plan.searchFingerprint}:${plan.flightJourney.confirmedOffer.outboundItineraryKey}:${plan.flightJourney.confirmedOffer.returnItineraryKey ?? ""}:${plan.flightJourney.confirmedOffer.fareKey}`}
            search={search}
            plan={plan}
            onPlanChange={setPlan}
            onSessionExpired={() => void create()}
            onFlightExpired={() =>
              void recoverExactFares(
                "This flight offer expired while you were choosing a car. Refresh flight availability.",
                "FLIGHT_OFFER_EXPIRED",
              )
            }
          />
        )}
    </div>
  );
}

function OutboundControls({
  stops,
  departure,
  sort,
  onStops,
  onDeparture,
  onSort,
}: {
  stops: OutboundStopsFilter;
  departure: OutboundDepartureFilter;
  sort: OutboundSort;
  onStops: (value: OutboundStopsFilter) => void;
  onDeparture: (value: OutboundDepartureFilter) => void;
  onSort: (value: OutboundSort) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
      <ResultSelect label="Stops" value={stops} onChange={onStops}>
        <option value="all">Any stops</option>
        <option value="nonstop">Nonstop</option>
        <option value="one">1 stop</option>
        <option value="two-plus">2+ stops</option>
      </ResultSelect>
      <ResultSelect label="Departure" value={departure} onChange={onDeparture}>
        <option value="all">Any time</option>
        <option value="morning">Morning</option>
        <option value="afternoon">Afternoon</option>
        <option value="evening">Evening</option>
      </ResultSelect>
      <ResultSelect label="Sort by" value={sort} onChange={onSort}>
        <option value="departure">Departure time</option>
        <option value="cheapest">Lowest estimated price</option>
        <option value="fastest">Shortest duration</option>
      </ResultSelect>
    </div>
  );
}

function ResultSelect<T extends string>({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-bold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"
      >
        {children}
      </select>
    </label>
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
  displayPrice,
  locale,
  selected,
  onSelect,
}: {
  choice: DealsFlightRuntimeV2["outboundChoices"][number];
  displayPrice?: DisplayPrice;
  locale: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const airline = choice.segments[0]?.airlineName || "Airline unavailable";
  const flightNumbers = choice.segments
    .map((segment) => segment.flightNumber)
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="focus-ring w-full rounded-2xl border border-slate-300 bg-white p-4 text-left aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-700 sm:p-5"
    >
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span>
          <span className="block font-extrabold text-slate-950">{airline}</span>
          {flightNumbers && (
            <span className="block text-xs font-semibold text-slate-600">
              {flightNumbers}
            </span>
          )}
        </span>
        {displayPrice && (
          <span className="text-right">
            <span className="block text-xs font-bold text-slate-500">
              Estimated from
            </span>
            <span
              className="block font-extrabold text-[#004BB8]"
              title={displayPrice.title}
              aria-label={displayPrice.ariaLabel}
            >
              {displayPrice.formatted}
            </span>
            {displayPrice.isConvertedEstimate && (
              <span className="block text-xs font-semibold text-slate-500">
                Provider price: {displayPrice.providerFormatted}
              </span>
            )}
          </span>
        )}
      </span>
      <span className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span>
          <span className="block text-lg font-extrabold">
            {formatTime(choice.departureTime, locale)}
          </span>
          <span className="text-sm font-bold">{choice.originAirport}</span>
        </span>
        <span className="text-center text-xs font-semibold text-slate-600">
          <span className="block">{choice.duration}</span>
          <span className="block border-t border-slate-300 pt-1">
            {choice.stops === 0
              ? "Nonstop"
              : `${choice.stops} stop${choice.stops === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-lg font-extrabold">
            {formatTime(choice.arrivalTime, locale)}
          </span>
          <span className="text-sm font-bold">{choice.destinationAirport}</span>
        </span>
      </span>
    </button>
  );
}
function SafeState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-300 bg-white p-6"
    >
      <p className="font-semibold">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-4 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
        >
          Retry flight search
        </button>
      )}
    </div>
  );
}

function ReviewRecovery({
  message,
  action,
  onRecover,
}: {
  message: string;
  action: string;
  onRecover: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-300 bg-white p-6"
    >
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRecover}
        className="focus-ring mt-4 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
      >
        {action}
      </button>
    </section>
  );
}
