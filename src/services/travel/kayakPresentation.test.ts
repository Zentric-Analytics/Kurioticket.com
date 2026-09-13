import test from "node:test";
import assert from "node:assert/strict";
import { kayakImageUrl, kayakImages, kayakFlightLegs, kayakCarFilterOptions, kayakHotelAmenities, kayakHotelAmenityStatus } from "./kayakPresentation";

test("hotel amenities resolve only supplied official mappings without duplicates", () => {
  assert.deepEqual(kayakHotelAmenities([3,3,99],[{id:3,name:"Conference facilities"}]),["Conference facilities"]);
  assert.deepEqual(kayakHotelAmenities([3],undefined),[]);
  assert.equal(kayakHotelAmenityStatus([3,99,99],[{id:3,name:"Conference facilities"}]),"1 additional amenity descriptions unavailable from provider");
  assert.equal(kayakHotelAmenityStatus([],[]),"Amenities not supplied by provider");
});

test("car filter capabilities use supplied specifications, not legacy defaults", () => {
  assert.deepEqual(kayakCarFilterOptions({}), []);
  assert.deepEqual(kayakCarFilterOptions({transmission:"automatic",passengers:5,bags:2}), ["automatic","seats4Plus","seats5Plus","bags2Plus"]);
  assert.deepEqual(kayakCarFilterOptions({transmission:"unknown",passengers:Infinity,bags:"4"}), []);
});

test("KAYAK preserves every distinct supplied hotel image and the car image", () => {
  const first = "https://content.r9cdn.net/himg/first.jpg";
  const second = "https://www.kayak.ch/h/run/api/image?url=/himg/second.jpg&maxheight=460";
  assert.deepEqual(kayakImages("hotels", { images: [{large:first}, {large:second}, {large:first}] }, {}, "Hotel"), [{url:first,alt:"Hotel"},{url:second,alt:"Hotel"}]);
  assert.deepEqual(kayakImages("cars", {}, {image:first}, "Car"), [{url:first,alt:"Car"}]);
  assert.deepEqual(kayakImages("hotels", {}, {}, "Hotel"), []);
});

test("KAYAK media rejects unsafe hosts, credentials and non-media API links", () => {
  for (const value of ["javascript:alert(1)", "http://content.r9cdn.net/a.png", "https://evil.test/a.png", "https://user:pass@content.r9cdn.net/a.png", "https://www.kayak.com/api/private", "https://content.r9cdn.net/a.png?apiKey=secret", "https://content.r9cdn.net/a.png?access_token=secret"])
    assert.equal(kayakImageUrl(value), undefined);
});

test("flight presentation preserves segment timing, provider duration and operating disclosures", () => {
  const legs = kayakFlightLegs({
    legs: { l1: { duration: 125, segments: [{id:"s1"}] } },
    segments: { s1: { origin:"BOS", destination:"JFK", departureTime:"2099-10-12T10:00:00", arrivalTime:"2099-10-12T12:05:00", airline:"AA", flightNumber:"123", operationalDisplay:"Operated by Example Air" } },
    airlines: { AA: { displayName:"American Airlines", logoUrl:"https://content.r9cdn.net/logo.png" } },
  }, {legs:[{id:"l1"}]});
  assert.equal(legs[0].durationMinutes, 125);
  assert.equal(legs[0].segments[0].operatingDisclosure, "Operated by Example Air");
  assert.equal(legs[0].segments[0].airline, "American Airlines");
  assert.equal(legs[0].segments[0].flightNumber, "AA 123");
  assert.equal(legs[0].segments[0].arrival, "2099-10-12T12:05:00");
});
