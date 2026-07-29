import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelDetailsSections.tsx", import.meta.url),
  "utf8",
);

test("supports embedded and standalone presentations with a flat root", () => {
  assert.match(source, /embedded\?: boolean/);
  assert.match(source, /embedded = false/);
  assert.match(source, /if \(embedded\) return content/);
  assert.equal(source.match(/<Card\b/g)?.length, 1);
  const rootClass = source.match(
    /<div\s+className={`([^`]+\$\{gridColumns\})`}/,
  )?.[1];
  assert.ok(rootClass);
  assert.match(rootClass, /grid min-w-0 border-t border-border bg-surface/);
  for (const token of [
    "gap-3",
    "sm:gap-4",
    "bg-slate-50/70",
    "p-3",
    "sm:p-4",
  ]) {
    assert.ok(!rootClass.includes(token));
  }
  assert.match(source, /variant="flat"/);
});

test("omits empty details and preserves dynamic section order and xl layouts", () => {
  assert.match(
    source,
    /if \(!hasRoom && !hasCancellation && !hasAmenities\) return null/,
  );
  const room = source.indexOf('key: "room"');
  const cancellation = source.indexOf('key: "cancellation"', room);
  const amenities = source.indexOf('key: "amenities"', cancellation);
  assert.ok(room >= 0 && cancellation > room && amenities > cancellation);
  for (const className of [
    "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]",
    "xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
    "xl:grid-cols-2",
    "xl:grid-cols-1",
  ]) {
    assert.ok(source.includes(className));
  }
  assert.doesNotMatch(source, /lg:grid-cols-(?:\[|1|2)/);
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
  assert.match(source, /<ul className="min-w-0 space-y-1\.5" role="list">/);
  assert.equal(source.match(/role="list"/g)?.length, 2);
  assert.doesNotMatch(source, /key={index}|<hr|role="separator"/);
});

test("uses flat sections with responsive structural dividers", () => {
  assert.match(source, /sections\.map\(\(section, index\) =>/);
  assert.match(source, /className={`min-w-0 p-5 sm:p-6/);
  for (const token of [
    "border-t",
    "border-border",
    "xl:border-t-0",
    "xl:border-s",
  ]) {
    assert.ok(source.includes(token));
  }
  for (const token of [
    "rounded-xl",
    "shadow-[0_8px_24px_-20px_rgba(2,28,43,0.32)]",
  ]) {
    assert.ok(!source.includes(token));
  }
  assert.doesNotMatch(source, /(?:border-l|border-r)(?:\s|"|$)/);
});

test("renders decorative room and policy icons directly with clear text hierarchy", () => {
  const iconTile =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle shadow-sm";
  assert.ok(!source.includes(iconTile));
  assert.match(
    source,
    /<BedDouble\s+className="mt-0\.5 h-5 w-5 shrink-0 text-blue"\s+aria-hidden="true"/,
  );
  assert.match(
    source,
    /<FileText\s+className="mt-0\.5 h-5 w-5 shrink-0 text-blue"\s+aria-hidden="true"/,
  );
  for (const token of [
    "break-words",
    "font-semibold",
    "text-slate-950",
    "font-medium",
    "text-slate-600",
    "text-slate-900",
  ]) {
    assert.ok(source.includes(token));
  }
});

test("retains every amenity icon meaning in direct amenity rows", () => {
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
  assert.match(
    source,
    /flex min-w-0 items-start gap-2\.5 text-sm font-medium leading-5 text-slate-700/,
  );
  for (const token of ["bg-surface-subtle/70", "px-3", "py-2.5"]) {
    assert.ok(!source.includes(token));
  }
  assert.match(source, /mt-0\.5 h-4 w-4 shrink-0 text-blue/);
  assert.match(source, /<span className="min-w-0 break-words">/);
  assert.match(source, /key={item\.key}/);
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
