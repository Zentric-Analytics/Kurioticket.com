/** Synthetic rich provider response for regression tests; no live supplier identifiers. */
export function kayakFlightInformationFixture() {
  return {
    currency: "USD", priceMode: "total",
    providers: { SELLER: { displayName: "KAYAK sandbox" } },
    airlines: {
      AA: { displayName: "Example Airways", baggagePolicies: [
        { bagType: "carryOn", description: "Up to 21 × 15 × 7 in" },
        { bagType: "checked", restrictions: [{ description: "Up to 62 in total" }] },
      ] },
      BA: { displayName: "Example Connect", baggagePolicies: [
        { bagType: "carryOn", description: "Up to 21 × 15 × 9 in" },
        { bagType: "checked", description: "Up to 79 in total" },
      ] },
    },
    legs: { l: { duration: 410, segments: [{ id: "provider-segment-1" }, { id: "provider-segment-2" }] } },
    segments: {
      "provider-segment-1": { origin: "BOS", destination: "ORD", departureTime: "2027-02-10T10:00:00Z", arrivalTime: "2027-02-10T12:00:00Z", airline: "AA", flightNumber: "100", equipmentTypeName: "Boeing 737 MAX 8", duration: 120, type: "flight" },
      "provider-segment-2": { origin: "ORD", destination: "LAS", departureTime: "2027-02-10T13:00:00Z", arrivalTime: "2027-02-10T16:50:00Z", airline: "BA", flightNumber: "200", equipmentTypeName: "Boeing 787-8 Dreamliner", duration: 230, type: "flight" },
    },
    results: [{ id: "rich-flight", legs: [{ id: "l" }], bookingOptions: [{
      type: "regular", providerCode: "SELLER", displayPrice: { price: 309 }, bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
      fareFamily: { displayName: "Economy Saver" },
      fees: { basePrice: 202, totalPrice: 309, carryOnBag: [{ bagNumber: "first", restriction: "included" }], checkedBag: [{ bagNumber: "first", restriction: "notIncluded", price: { price: 35, currency: "USD" } }] },
      conditions: { change: { restriction: "allowed", penalty: { price: 50, currency: "USD" } }, refund: { restriction: "notAllowed" } },
      optionalServices: [{ type: "seat", description: "Preferred seat", optional: true, price: { price: 20, currency: "USD" }, maximumQuantity: 1, travelerCount: 1, journeyContext: "BOS → ORD" }],
      segmentFares: [
        { segmentId: "provider-segment-1", cabin: { code: "economy", displayName: "Economy" }, qualityItems: [
          { code: "seat", displayName: '32" seat pitch · 3-3 seat layout' },
          { code: "power", displayName: "Power & USB outlets" },
          { code: "food", displayName: "Meal provided" },
          { code: "entertainment", displayName: "Seatback on-demand video" },
          { code: "wifi", displayName: "Wi-Fi included" },
        ] },
        { segmentId: "provider-segment-2", cabin: { code: "economy", displayName: "Economy" }, qualityItems: [
          { code: "seat", displayName: '31" seat pitch · 3-3-3 seat layout' },
          { code: "wifi", displayName: "Fast web browsing (fee)" },
          { code: "powerNegative", displayName: "Power (some rows) & USB" },
          { code: "entertainment", displayName: "Streaming entertainment" },
          { code: "redEye", displayName: "Overnight flight (red-eye)" },
        ] },
      ],
      badges: ["rawBadge"], futureUnknownField: "Unmapped preview fact",
    }] }],
  };
}
