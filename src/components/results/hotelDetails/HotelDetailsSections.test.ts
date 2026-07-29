import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelDetailsSections.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("uses one unified flat card instead of independent section cards", () => {
  assert.equal(source.match(/<Card\b/g)?.length, 1);
  assert.match(source, /variant="flat"/);
  assert.match(
    source,
    /className="overflow-hidden p-0 shadow-\[0_12px_32px_-26px_rgba\(2,28,43,0\.28\)\]"/,
  );
  assert.doesNotMatch(source, /StayDetailsSection|AmenitySection/);
  assert.doesNotMatch(source, /lg:grid-cols-2 lg:gap-8|className="h-full/);
});

test("normalizes text content and omits the panel when every section is empty", () => {
  assert.match(
    source,
    /const normalizedRoomItems = roomItems\s*\.map\(\(item\) => item\.trim\(\)\)\s*\.filter\(Boolean\);/,
  );
  assert.match(
    source,
    /const normalizedCancellationItems = cancellationItems\s*\.map\(\(item\) => item\.trim\(\)\)\s*\.filter\(Boolean\);/,
  );
  assert.match(source, /const hasRoom = normalizedRoomItems\.length > 0;/);
  assert.match(
    source,
    /const hasCancellation = normalizedCancellationItems\.length > 0;/,
  );
  assert.match(source, /const hasAmenities = amenityItems\.length > 0;/);
  assert.match(
    source,
    /if \(!hasRoom && !hasCancellation && !hasAmenities\) return null;/,
  );
  assert.match(
    source,
    /if \(hasRoom\) \{[\s\S]*if \(hasCancellation\) \{[\s\S]*if \(hasAmenities\) \{/,
  );
});

test("keeps stable Room, Cancellation, Amenities order and keys", () => {
  const room = source.indexOf('key: "room"');
  const cancellation = source.indexOf('key: "cancellation"', room);
  const amenities = source.indexOf('key: "amenities"', cancellation);
  assert.ok(room >= 0 && cancellation > room && amenities > cancellation);
  assert.match(source, /key={section\.key}/);
  assert.doesNotMatch(source, /key={index}/);
});

test("selects complete static desktop grids for every content combination", () => {
  for (const className of [
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]",
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
    "lg:grid-cols-2",
    "lg:grid-cols-1",
  ]) {
    assert.ok(source.includes(className), `${className} remains discoverable`);
  }
  assert.doesNotMatch(source, /`lg:grid-cols-\$\{/);
});

test("uses consistent section presentation and RTL-safe adjacent dividers", () => {
  assert.match(source, /min-w-0 p-5 sm:p-6/);
  assert.match(source, /border-t border-border lg:border-t-0 lg:border-s/);
  assert.match(source, /index > 0/);
  assert.match(source, /text-lg font-bold text-slate-950/);
  assert.match(
    source,
    /mt-3 space-y-2 text-sm font-medium leading-6 text-slate-700/,
  );
  assert.doesNotMatch(
    source,
    /divide-x|role="separator"|<hr|border-dashed|border-dotted/,
  );
});

test("preserves amenity icon meanings and icon-and-label list styling", () => {
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
  assert.match(source, /mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2/);
  assert.match(
    source,
    /flex min-w-0 items-start gap-2\.5 text-sm font-medium leading-5 text-slate-700/,
  );
  assert.match(source, /mt-0\.5 h-4 w-4 shrink-0 text-blue/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /<span className="min-w-0 break-words">/);
  assert.equal(source.match(/role="list"/g)?.length, 2);
});

test("Hotel Details integration continues to pass the existing presentation data", () => {
  const call = clientSource.slice(
    clientSource.indexOf("<HotelDetailsSections"),
    clientSource.indexOf("/>", clientSource.indexOf("<HotelDetailsSections")) +
      2,
  );
  assert.match(call, /roomTitle=/);
  assert.match(call, /roomItems={\[roomType, mealPlan\]}/);
  assert.match(call, /cancellationTitle=/);
  assert.match(call, /cancellationItems={\[cancellationText\]}/);
  assert.match(call, /amenitiesTitle=/);
  assert.match(call, /amenityItems={amenityItems}/);
});
