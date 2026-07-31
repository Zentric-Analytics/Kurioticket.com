import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { destinationHref, flightsHref, priceAlertsHref } from "./destinationNavigation";

const nodeRequire = createRequire(import.meta.url);
const assetLoader = (module: { exports: unknown }, filename: string) => { module.exports = filename; };
nodeRequire.extensions[".jpg"] = assetLoader;
nodeRequire.extensions[".png"] = assetLoader;
const { DESTINATIONS, DESTINATION_SLUGS, getDestination, ILLUSTRATIVE_FARE_DISCLAIMER, slugForDestination } = await import("./destinationData");

test("all approved slugs resolve through one destination model", () => {
  assert.deepEqual(DESTINATION_SLUGS, ["paris", "bali", "santorini", "new-york"]);
  for (const slug of DESTINATION_SLUGS) assert.equal(getDestination(slug)?.slug, slug);
  assert.equal(getDestination("unknown"), undefined);
  assert.equal(getDestination(undefined), undefined);
});

test("destination names and routes map consistently", () => {
  for (const destination of DESTINATIONS) {
    assert.equal(slugForDestination(destination.name), destination.slug);
    assert.deepEqual(destinationHref(destination.slug), { pathname: "/destination/[slug]", params: { slug: destination.slug } });
    assert.deepEqual(flightsHref(destination), { pathname: "/flights", params: { destination: destination.name } });
    assert.deepEqual(priceAlertsHref(destination), { pathname: "/price-alerts", params: { destination: destination.name } });
  }
});

test("every guide uses its own local matching asset", () => {
  const expected = new Map([
    ["Paris", "assets/destinations/paris.jpg"], ["Bali", "assets/destinations/bali.jpg"],
    ["Santorini", "assets/heroes/home-santorini.png"], ["New York", "assets/destinations/new-york.jpg"],
  ]);
  for (const destination of DESTINATIONS) {
    assert.equal(destination.imageAsset, expected.get(destination.name));
    assert.doesNotMatch(destination.imageAsset, /^https?:\/\//);
  }
});

test("editorial data avoids live-fare and unsupported entry claims", () => {
  assert.equal(ILLUSTRATIVE_FARE_DISCLAIMER, "Illustrative fares only. Search to view current provider prices.");
  const data = JSON.stringify(DESTINATIONS);
  assert.doesNotMatch(data, /current lowest fare|live fare/i);
  assert.doesNotMatch(data, /visa (?:is|is not|required|not required)/i);
  for (const destination of DESTINATIONS) {
    assert.match(destination.nigeriaNotes.join(" "), /Check current visa and entry requirements before booking\./);
    assert.equal(destination.tags.length, 4);
  }
});

test("screen exposes unknown state, shared saved semantics and accessible actions", () => {
  const source = readFileSync("src/features/destination/DestinationDetailScreen.tsx", "utf8");
  const route = readFileSync("app/destination/[slug].tsx", "utf8");
  assert.match(route, /destination \? <DestinationDetailScreen destination=\{destination\} \/> : <DestinationNotFound \/>/);
  assert.match(source, /accessibilityRole="header"[^>]*>Destination not found/);
  assert.match(source, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(source, /useSavedDestination\(destination\.name\)/);
  assert.match(source, /accessibilityLabel=\{`Search flights to \$\{destination\.name\}`\}/);
  assert.match(source, /accessibilityHint="Opens Price Alerts"/);
  assert.match(source, /Share\.share/);
});

test("hero and sticky actions share the same prefilled flight handler", () => {
  const source = readFileSync("src/features/destination/DestinationDetailScreen.tsx", "utf8");
  assert.match(source, /const goFlights = \(\) => router\.push\(flightsHref\(destination\)\)/);
  assert.ok((source.match(/onPress=\{goFlights\}/g) ?? []).length >= 3);
});
