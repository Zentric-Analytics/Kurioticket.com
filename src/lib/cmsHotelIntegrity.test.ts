import assert from "node:assert/strict";
import test from "node:test";

import { hotelDestinations } from "@/data/hotelDestinations";
import {
  cmsHotelCanonicalId,
  getCmsHotelMetadataMismatch,
  homepageDestinationHotelCanonicalId,
} from "@/lib/cmsHotelIntegrity";

test("canonical hotel metadata must match the owned hotel catalogue", () => {
  const london = hotelDestinations.find((item) => item.id === "gb-london");
  assert.ok(london);
  const payload = {
    canonicalId: "hotel:" + london.id,
    country: london.country,
    countryCode: london.countryCode,
    kind: london.kind,
    searchValue: london.searchValue,
  };
  assert.equal(getCmsHotelMetadataMismatch(payload), null);
  assert.match(getCmsHotelMetadataMismatch({ ...payload, searchValue: "Paris" }) ?? "", /searchValue/);
  assert.match(getCmsHotelMetadataMismatch({ ...payload, countryCode: "FR" }) ?? "", /countryCode/);
  assert.match(getCmsHotelMetadataMismatch({ ...payload, canonicalId: "hotel:made-up" }) ?? "", /canonical/);
});

test("canonical IDs come from the canonical ID field, not labels", () => {
  assert.equal(cmsHotelCanonicalId({ canonicalId: " hotel:gb-london " }), "hotel:gb-london");
  assert.equal(cmsHotelCanonicalId({ name: "London" }), null);
  assert.equal(cmsHotelCanonicalId(null), null);
});

test("homepage hotel reference lookup rejects malformed and empty content", () => {
  assert.equal(homepageDestinationHotelCanonicalId(null), null);
  assert.equal(homepageDestinationHotelCanonicalId({ city: "", country: "United Kingdom" }), null);
  assert.equal(homepageDestinationHotelCanonicalId({ city: 100, country: "United Kingdom" }), null);
});
