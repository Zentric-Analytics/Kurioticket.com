import assert from "node:assert/strict";
import test from "node:test";

import { assertHotelAdapterIntegrity } from "./hotelCatalogueAdapter";

const property = {
  id: "property-1",
  name: "Property One",
  profile: {
    propertyType: "Hotel",
    amenities: ["Wi-Fi"],
    accessibilityFeatures: [],
    room: { name: "Double room", bedConfiguration: "1 double bed" },
  },
  gallery: ["/hotel.jpg"],
  provenance: {
    sourceKind: "curated-catalogue" as const,
    sourceId: "kurioticket-catalogue",
    propertyId: "property-1",
    realTimeAvailability: false,
  },
};

test("provider-neutral hotel adapter accepts coherent properties and offers", () => {
  assert.doesNotThrow(() =>
    assertHotelAdapterIntegrity({
      properties: [property],
      offers: [{
        id: "offer-1",
        propertyId: property.id,
        currency: "USD",
        nightlyPrice: 180,
        stayTotal: 540,
        provenance: { ...property.provenance, offerId: "offer-1" },
      }],
    }),
  );
});

test("provider-neutral hotel adapter rejects orphaned offers", () => {
  assert.throws(
    () => assertHotelAdapterIntegrity({
      properties: [property],
      offers: [{
        id: "orphan",
        propertyId: "missing",
        currency: "USD",
        nightlyPrice: 180,
        stayTotal: 540,
        provenance: { ...property.provenance, propertyId: "missing", offerId: "orphan" },
      }],
    }),
    /unknown property/,
  );
});
