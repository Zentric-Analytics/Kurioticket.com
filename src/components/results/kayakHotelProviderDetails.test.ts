import assert from "node:assert/strict";
import test from "node:test";
import { kayakHotelCardModel } from "./kayakCardModels";

test("KAYAK hotel model preserves only sanitized customer-facing detail facts", () => {
  const model = kayakHotelCardModel({
    id: "hotel-rate",
    title: "Provider Hotel",
    description: "King room",
    details: ["10 Test Street"],
    price: 300,
    currency: "USD",
    priceBasis: "total stay",
    testUrl: "https://affiliates.kayak.com/sandbox-clickout",
    hotelReviewScore: 8.9,
    hotelReviewCount: 420,
    attributes: [
      { label: "address", value: "10 Test Street" },
      { label: "hotel Country Code", value: "US" },
      { label: "guest Rating Sentiment", value: "Excellent" },
      { label: "review Quotes 1", value: "Great location" },
      { label: "policies 1", value: "Check-in after 3 PM" },
      { label: "room Name", value: "King room" },
      { label: "has Free Cancellation", value: "Yes" },
      { label: "can Pay Later", value: "Yes" },
      { label: "rate Breakdown · taxes", value: "Included" },
      { label: "conditions 1", value: "Cancel before 6 PM" },
    ],
  }, 3) as ReturnType<typeof kayakHotelCardModel> & {
    providerDetails?: {
      overview?: { address?: string; countryCode?: string; policies?: Array<{ label: string; value: string }> };
      reviews?: { sentiment?: string; quotes?: Array<{ label: string; value: string }> };
      rate?: { roomName?: string; freeCancellation?: boolean; payLater?: boolean; rateBreakdown?: Array<{ label: string; value: string }>; conditions?: Array<{ label: string; value: string }> };
    };
  };

  assert.equal(model.pricePerNight, 100);
  assert.equal(model.cancellationInfo, "Free cancellation");
  assert.equal(model.reviewSource, "KAYAK");
  assert.equal(model.providerDetails?.overview?.address, "10 Test Street");
  assert.equal(model.providerDetails?.overview?.countryCode, "US");
  assert.deepEqual(model.providerDetails?.overview?.policies, [{ label: "policies", value: "Check-in after 3 PM" }]);
  assert.equal(model.providerDetails?.reviews?.sentiment, "Excellent");
  assert.deepEqual(model.providerDetails?.reviews?.quotes, [{ label: "review Quotes", value: "Great location" }]);
  assert.equal(model.providerDetails?.rate?.roomName, "King room");
  assert.equal(model.providerDetails?.rate?.freeCancellation, true);
  assert.equal(model.providerDetails?.rate?.payLater, true);
  assert.deepEqual(model.providerDetails?.rate?.rateBreakdown, [{ label: "taxes", value: "Included" }]);
  assert.deepEqual(model.providerDetails?.rate?.conditions, [{ label: "conditions", value: "Cancel before 6 PM" }]);

  const reference = model.rawProviderReference as {
    kind: string;
    details: typeof model.providerDetails;
  };
  assert.equal(reference.kind, "kayak-hotel-details");
  assert.deepEqual(reference.details, model.providerDetails);
});
