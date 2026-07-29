import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelDetailsSections.tsx", import.meta.url),
  "utf8",
);

test("supports embedded and standalone presentations without nested cards", () => {
  assert.match(source, /embedded\?: boolean/);
  assert.match(source, /embedded = false/);
  assert.match(source, /if \(embedded\) return content/);
  assert.equal(source.match(/<Card\b/g)?.length, 1);
  assert.match(source, /grid min-w-0 border-t border-border bg-surface/);
  assert.match(source, /variant="flat"/);
});

test("omits empty details and preserves dynamic section order and layouts", () => {
  assert.match(
    source,
    /if \(!hasRoom && !hasCancellation && !hasAmenities\) return null/,
  );
  const room = source.indexOf('key: "room"');
  const cancellation = source.indexOf('key: "cancellation"', room);
  const amenities = source.indexOf('key: "amenities"', cancellation);
  assert.ok(room >= 0 && cancellation > room && amenities > cancellation);
  for (const className of [
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]",
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
    "lg:grid-cols-2",
    "lg:grid-cols-1",
  ]) {
    assert.ok(source.includes(className));
  }
});

test("uses hidden semantic headings and icon-led semantic lists", () => {
  assert.match(
    source,
    /aria-labelledby={`hotel-details-\$\{section\.key\}-heading`}/,
  );
  assert.match(
    source,
    /id={`hotel-details-\$\{section\.key\}-heading`} className="sr-only"/,
  );
  assert.doesNotMatch(source, /text-lg font-bold text-slate-950/);
  assert.match(source, /BedDouble/);
  assert.match(source, /FileText/);
  assert.match(source, /min-w-0 space-y-1\.5 text-sm font-medium leading-6/);
  assert.equal(source.match(/role="list"/g)?.length, 2);
  assert.doesNotMatch(source, /key={index}|<hr|role="separator"/);
});

test("retains responsive logical dividers and all amenity icon meanings", () => {
  assert.match(source, /min-w-0 p-5 sm:p-6/);
  assert.match(source, /border-t border-border lg:border-t-0 lg:border-s/);
  const mappings = {
    wifi: "Wifi",
    breakfast: "Coffee",
    pool: "Waves",
    spa: "Flower2",
    airportShuttle: "BusFront",
    parking: "CircleParking",
    fitness: "Dumbbell",
    workspace: "Laptop",
    quietRooms: "VolumeX",
    frontDesk: "ConciergeBell",
    lateCheckIn: "Clock3",
    kitchenette: "CookingPot",
    bikeStorage: "Bike",
    courtyard: "Trees",
    lounge: "Armchair",
    restaurant: "UtensilsCrossed",
    airConditioning: "AirVent",
    generic: "CircleDot",
  };
  for (const [key, icon] of Object.entries(mappings)) {
    assert.match(source, new RegExp(`${key}: ${icon},`));
  }
  assert.match(source, /grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2/);
  assert.match(source, /mt-0\.5 h-4 w-4 shrink-0 text-blue/);
  assert.match(source, /<span className="min-w-0 break-words">/);
});
