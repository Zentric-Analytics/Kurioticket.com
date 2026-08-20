import assert from "node:assert/strict";
import test from "node:test";
import type { PublicHotelPropertyDetails } from "@/lib/types";
import {
  buildHotelAddress,
  buildHotelDirectionsUrl,
  buildHotelMapEmbedUrl,
} from "./hotelMap";

const parkPlaza: PublicHotelPropertyDetails = {
  description: "",
  latitude: 51.501,
  longitude: -0.1167,
  streetAddress: "200 Westminster Bridge Rd, Lambeth, London SE1 7UT",
  city: "London",
  country: "United Kingdom",
  neighbourhood: "South Bank",
};

test("builds a centered OpenStreetMap URL without swapping coordinates", () => {
  const mapUrl = buildHotelMapEmbedUrl(parkPlaza);
  assert.ok(mapUrl);
  const params = new URL(mapUrl).searchParams;
  assert.equal(params.get("marker"), "51.501,-0.1167");
  assert.notEqual(params.get("marker"), "-0.1167,51.501");

  const [west, south, east, north] = (params.get("bbox") ?? "")
    .split(",")
    .map(Number);
  assert.ok(west < parkPlaza.longitude);
  assert.ok(east > parkPlaza.longitude);
  assert.ok(south < parkPlaza.latitude);
  assert.ok(north > parkPlaza.latitude);
  assert.ok(west < east);
  assert.ok(south < north);
});
test("rejects invalid and out-of-range map coordinates", () => {
  for (const coordinates of [
    { latitude: Number.NaN, longitude: -0.1167 },
    { latitude: Number.POSITIVE_INFINITY, longitude: -0.1167 },
    { latitude: 100, longitude: -0.1167 },
    { latitude: 51.501, longitude: 200 },
  ]) {
    assert.equal(buildHotelMapEmbedUrl(coordinates), null);
  }
});

test("directions prefer the non-duplicated property address", () => {
  assert.equal(
    buildHotelAddress(parkPlaza),
    "200 Westminster Bridge Rd, Lambeth, London SE1 7UT, United Kingdom",
  );
  const directionsUrl = buildHotelDirectionsUrl(parkPlaza);
  assert.ok(directionsUrl);
  assert.equal(
    new URL(directionsUrl).searchParams.get("destination"),
    "200 Westminster Bridge Rd, Lambeth, London SE1 7UT, United Kingdom",
  );
});

test("directions fall back to valid coordinates when no address exists", () => {
  const directionsUrl = buildHotelDirectionsUrl({
    ...parkPlaza,
    streetAddress: "",
    city: "",
    country: "",
  });
  assert.ok(directionsUrl);
  assert.equal(
    new URL(directionsUrl).searchParams.get("destination"),
    "51.501,-0.1167",
  );
});
