import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { kayakHotelCardModel } from "./kayakCardModels";
import { toPublicHotel } from "@/lib/searchCache";

test("hotel review description comes from supplier text, never score bands", () => {
  const offer = { id: "property", title: "Hotel", description: "Room", details: [], price: 300, currency: "USD", priceBasis: "total stay", testUrl: "https://affiliates.kayak.com/sandbox-clickout", hotelReviewScore: 9.9, hotelReviewCount: 10 };
  const missing = kayakHotelCardModel(offer, 3);
  assert.equal(missing.reviewSentiment, undefined);
  const supplied = kayakHotelCardModel({ ...offer, attributes: [{ label: "guest Rating Sentiment", value: "Supplier's exact description" }] }, 3);
  assert.equal(toPublicHotel(supplied).reviewSentiment, "Supplier's exact description");
  assert.equal(supplied.reviewScore, 9.9);
  for (const path of ["src/components/results/HotelCard.tsx", "src/components/results/HotelDetailsClient.tsx", "apps/mobile/src/features/search/NativeHotelReviewsSection.tsx", "apps/mobile/src/features/search/ApprovedResultsScreen.tsx", "src/components/results/deals/DealsHotelPreviewCard.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /reviewSentiment/);
    assert.doesNotMatch(source, /reviewLabelKeys|reviewLabelFallbacks|reviewLabels\[band\]/);
    assert.doesNotMatch(source, /score >= 9 \? "Exceptional"|hotelResults\.reviewBand\.\$\{band\}/);
  }
});
