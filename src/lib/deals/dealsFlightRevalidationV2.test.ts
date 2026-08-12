import assert from "node:assert/strict";
import test from "node:test";
import { offer, confirmedPlan } from "./dealsTripPlanV2.test";
import {
  buildDealsFlightSelectionSnapshotV2,
  canonicalOfferForSnapshotV2,
  fareFromConfirmedOfferV2,
  getDealsFlightMaterialChangesV2,
  sameDealsFlightSelectionSnapshotV2,
} from "./dealsFlightRevalidationV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";

const setup = () => {
  const plan = confirmedPlan();
  plan.flightJourney = {
    ...plan.flightJourney!,
    phase: "fare",
    confirmedOffer: undefined,
  };
  const runtime: DealsFlightRuntimeV2 = {
    version: 2,
    inventoryToken: "token_12345678901234567890123456789012",
    sourceSearchKey: plan.flightJourney.searchKey,
    inventoryExpiresAt: "2027-12-01T00:00:00Z",
    tripType: "round-trip",
    outboundChoices: [plan.flightJourney.outbound!],
    fareBrandOptions: [
      {
        brandOptionKey: "flight-brand-v1:a",
        fareBrandName: "Flex",
        ownerNames: ["Air"],
      },
    ],
    returnChoices: [plan.flightJourney.return!],
    fareChoices: [
      {
        ...plan.flightJourney.fare!,
        sourcePrice: 850,
        sourceCurrency: "USD",
        baggageInfo: "No checked baggage",
        refundInfo: "Non-refundable",
      },
    ],
    selectedOutboundKey: "out-1",
    selectedBrandOptionKey: "flight-brand-v1:a",
    selectedReturnKey: "ret-1",
    selectedFareKey: "fare-1",
  };
  return { plan, runtime };
};

test("builds only an exact plan/runtime selection and detects races", () => {
  const { plan, runtime } = setup();
  const snapshot = buildDealsFlightSelectionSnapshotV2(runtime, plan);
  assert.deepEqual(snapshot, {
    inventoryToken: runtime.inventoryToken,
    sourceSearchKey: runtime.sourceSearchKey,
    outboundItineraryKey: "out-1",
    returnItineraryKey: "ret-1",
    brandOptionKey: "flight-brand-v1:a",
    fareKey: "fare-1",
  });
  assert.equal(sameDealsFlightSelectionSnapshotV2(snapshot!, snapshot), true);
  assert.equal(
    buildDealsFlightSelectionSnapshotV2(
      { ...runtime, selectedFareKey: "fare-2" },
      plan,
    ),
    null,
  );
  assert.equal(
    sameDealsFlightSelectionSnapshotV2(snapshot!, {
      ...snapshot!,
      fareKey: "fare-2",
    }),
    false,
  );
});

test("brand context is required on both sides and participates in race identity", () => {
  const { plan, runtime } = setup();
  plan.flightJourney!.fareBrand = {
    brandOptionKey: "flight-brand-v1:a",
    fareBrandName: "Flex",
  };
  const brandedRuntime: DealsFlightRuntimeV2 = {
    ...runtime,
    version: 2,
    fareBrandOptions: [
      {
        brandOptionKey: "flight-brand-v1:a",
        fareBrandName: "Flex",
        ownerNames: ["Air"],
      },
    ],
    selectedBrandOptionKey: "flight-brand-v1:a",
  };
  const snapshot = buildDealsFlightSelectionSnapshotV2(brandedRuntime, plan);
  assert.equal(snapshot?.brandOptionKey, "flight-brand-v1:a");
  assert.equal(
    buildDealsFlightSelectionSnapshotV2(
      { ...brandedRuntime, selectedBrandOptionKey: "flight-brand-v1:b" },
      plan,
    ),
    null,
  );
  assert.equal(
    sameDealsFlightSelectionSnapshotV2(snapshot!, {
      ...snapshot!,
      brandOptionKey: "flight-brand-v1:b",
    }),
    false,
  );
  assert.equal(
    buildDealsFlightSelectionSnapshotV2(
      { ...runtime, selectedBrandOptionKey: undefined },
      plan,
    ),
    null,
  );
});

test("canonical offer matching strips secrets and rejects itinerary substitution", () => {
  const snapshot = buildDealsFlightSelectionSnapshotV2(
    setup().runtime,
    setup().plan,
  )!;
  const safe = canonicalOfferForSnapshotV2(
    {
      ...offer,
      providerOfferId: "off_secret_123",
      rawProviderReference: "duffel-off_secret_123",
    },
    snapshot,
  );
  assert.ok(safe);
  assert.doesNotMatch(
    JSON.stringify(safe),
    /off_secret_123|duffel-off_secret_123|providerOfferId|rawProviderReference/,
  );
  assert.equal(
    canonicalOfferForSnapshotV2(
      { ...offer, outboundItineraryKey: "other" },
      snapshot,
    ),
    null,
  );
});

test("accepted projection replaces stale material terms and omits stale brand", () => {
  const fare = fareFromConfirmedOfferV2({
    ...offer,
    cabinClass: "business",
    sourcePrice: 910,
    baggageInfo: "2 bags",
    refundInfo: "Refundable with fee",
  });
  assert.deepEqual(fare, {
    fareKey: "fare-1",
    cabinClass: "business",
    baggageInfo: "2 bags",
    refundInfo: "Refundable with fee",
    sourcePrice: 910,
    sourceCurrency: "USD",
    offerExpiresAt: offer.offerExpiresAt,
  });
  assert.equal("brand" in fare!, false);
});

test("material comparison shows only changed price, cabin, baggage, and refunds", () => {
  const { runtime } = setup();
  const changes = getDealsFlightMaterialChangesV2(runtime.fareChoices[0]!, {
    ...offer,
    cabinClass: "business",
  });
  assert.deepEqual(
    changes.map((change) => change.field),
    ["Price", "Cabin", "Baggage", "Refunds"],
  );
  assert.deepEqual(changes[0], {
    field: "Price",
    before: "USD 850",
    after: "USD 900",
  });
});
