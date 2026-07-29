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
  for (const token of [
    "gap-3",
    "sm:gap-4",
    "border-t",
    "border-border",
    "bg-slate-50/70",
    "p-3",
    "sm:p-4",
  ]) {
    assert.ok(source.includes(token));
  }
  assert.doesNotMatch(
    source,
    /grid min-w-0 border-t border-border bg-surface/,
  );
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
  assert.match(source, /<ul className="min-w-0 space-y-1\.5" role="list">/);
  assert.equal(source.match(/role="list"/g)?.length, 2);
  assert.doesNotMatch(source, /key={index}|<hr|role="separator"/);
});

test("uses coordinated inner panels without shared responsive dividers", () => {
  const sectionClass = source.match(
    /<section[\s\S]*?className="([^"]+)"[\s\S]*?<h2/,
  )?.[1];
  assert.ok(sectionClass);
  for (const token of [
    "min-w-0",
    "rounded-xl",
    "border",
    "border-border",
    "bg-surface",
    "p-4",
    "sm:p-5",
    "shadow-[0_8px_24px_-20px_rgba(2,28,43,0.32)]",
  ]) {
    assert.ok(sectionClass.split(/\s+/).includes(token));
  }
  assert.doesNotMatch(sectionClass, /lg:border-s|lg:border-t-0/);
});

test("uses matching decorative icon tiles and clear text hierarchy", () => {
  const iconTile =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle shadow-sm";
  assert.equal(source.split(iconTile).length - 1, 2);
  assert.match(source, /<BedDouble[\s\S]*?aria-hidden="true"/);
  assert.match(source, /<FileText[\s\S]*?aria-hidden="true"/);
  assert.match(source, /font-semibold leading-5 text-slate-950/);
  assert.match(source, /font-medium leading-5 text-slate-600/);
  assert.match(source, /font-semibold leading-5 text-slate-900/);
});

test("retains all amenity icon meanings in refined amenity rows", () => {
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
  assert.match(source, /grid grid-cols-1 gap-x-3 gap-y-2\.5 sm:grid-cols-2/);
  for (const token of [
    "rounded-lg",
    "bg-surface-subtle/70",
    "px-3",
    "py-2.5",
    "gap-2.5",
  ]) {
    assert.ok(source.includes(token));
  }
  assert.match(source, /mt-0\.5 h-4 w-4 shrink-0 text-blue/);
  assert.match(source, /<span className="min-w-0 break-words">/);
});

test("does not introduce flight timeline semantics or a visible amenities heading", () => {
  for (const forbidden of [
    /timeline/i,
    /\bOutbound\b/,
    /\bReturn\b/,
    /\blayover\b/i,
    /airport code/i,
    /vertical guide/i,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
  assert.doesNotMatch(source, />Amenities</);
});
