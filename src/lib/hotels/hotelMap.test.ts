import assert from "node:assert/strict";
import test from "node:test";
import type { PublicHotelPropertyDetails } from "@/lib/types";
import {
  buildHotelAddress,
  buildHotelDirectionsUrl,
  buildGoogleHotelMapEmbedUrl,
  buildHotelMapEmbedUrl,
  buildOpenStreetMapHotelMapEmbedUrl,
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

test("builds a centered OpenStreetMap fallback without swapping coordinates", () => {
  const mapUrl = buildOpenStreetMapHotelMapEmbedUrl(parkPlaza);
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
    assert.equal(buildOpenStreetMapHotelMapEmbedUrl(coordinates), null);
  }
});

test("builds an official Google place roadmap for the identified property", () => {
  const mapUrl = buildGoogleHotelMapEmbedUrl({
    hotelName: "Park Plaza Westminster Bridge London",
    propertyDetails: parkPlaza,
    googleMapsEmbedApiKey: "test-browser-key",
  });
  assert.ok(mapUrl);
  const url = new URL(mapUrl);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/embed/v1/place");
  assert.equal(url.searchParams.get("maptype"), "roadmap");
  assert.equal(url.searchParams.get("zoom"), "16");
  assert.equal(url.searchParams.get("center"), "51.501,-0.1167");
  assert.match(url.searchParams.get("q") ?? "", /Park Plaza Westminster Bridge London/);
  assert.match(url.searchParams.get("q") ?? "", /200 Westminster Bridge Rd/);
  assert.doesNotMatch(mapUrl, /streetview/i);
});

test("map selection uses Google only when configured and otherwise falls back", () => {
  const configuration = {
    hotelName: "Park Plaza Westminster Bridge London",
    propertyDetails: parkPlaza,
  };
  assert.match(buildHotelMapEmbedUrl(configuration) ?? "", /openstreetmap\.org/);
  assert.match(
    buildHotelMapEmbedUrl({
      ...configuration,
      googleMapsEmbedApiKey: "test-browser-key",
    }) ?? "",
    /google\.com\/maps\/embed\/v1\/place/,
  );
});

test("directions preserve exact property coordinates when an address exists", () => {
  assert.equal(
    buildHotelAddress(parkPlaza),
    "200 Westminster Bridge Rd, Lambeth, London SE1 7UT, United Kingdom",
  );
  const directionsUrl = buildHotelDirectionsUrl(parkPlaza);
  assert.ok(directionsUrl);
  assert.equal(
    new URL(directionsUrl).searchParams.get("destination"),
    "51.501,-0.1167",
  );
});

test("directions fall back to an address when coordinates are invalid", () => {
  const directionsUrl = buildHotelDirectionsUrl({
    ...parkPlaza,
    latitude: Number.NaN,
    longitude: Number.NaN,
  });
  assert.ok(directionsUrl);
  assert.equal(
    new URL(directionsUrl).searchParams.get("destination"),
    "200 Westminster Bridge Rd, Lambeth, London SE1 7UT, United Kingdom",
  );
});
