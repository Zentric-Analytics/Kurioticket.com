import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const list = readFileSync(
  new URL("./HotelAmenityList.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(new URL("./HotelCard.tsx", import.meta.url), "utf8");

test("the shared list maps every canonical amenity icon", () => {
  for (const contract of [
    "HotelAmenityIconKey",
    "HotelAmenityPresentationItem",
    "LucideIcon",
    "Record<HotelAmenityIconKey, LucideIcon>",
    "wifi: Wifi",
    "breakfast: Coffee",
    "pool: Waves",
    "spa: Flower2",
    "airportShuttle: BusFront",
    "parking: CircleParking",
    "fitness: Dumbbell",
    "workspace: Laptop",
    "quietRooms: VolumeX",
    "frontDesk: ConciergeBell",
    "lateCheckIn: Clock3",
    "kitchenette: CookingPot",
    "bikeStorage: Bike",
    "courtyard: Trees",
    "lounge: Armchair",
    "restaurant: UtensilsCrossed",
    "airConditioning: AirVent",
    "generic: CircleDot",
  ]) {
    assert.ok(list.includes(contract), `missing ${contract}`);
  }
});

test("the shared list preserves accessible amenity markup and styling", () => {
  for (const contract of [
    "if (items.length === 0) return null",
    "<ul",
    'role="list"',
    "<li",
    "items-start",
    "gap-1.5",
    "text-[12px]",
    "font-medium",
    "leading-4",
    "text-slate-600",
    "h-4 w-4 shrink-0 text-slate-500",
    "strokeWidth={1.8}",
    'aria-hidden="true"',
    "min-w-0 break-words",
  ]) {
    assert.ok(list.includes(contract), `missing ${contract}`);
  }

  for (const forbidden of ["<button", "<a ", "tabIndex", "focusable"]) {
    assert.ok(!list.includes(forbidden), `unexpected ${forbidden}`);
  }
});

test("the shared list translates labels and retains the original fallback", () => {
  assert.ok(list.includes("item.translationKey"));
  assert.ok(list.includes("t(item.translationKey)"));
  assert.ok(list.includes("translatedLabel.trim() || item.label"));
  assert.ok(list.includes("{label}"));
});

test("Hotel Results uses the shared list without changing its item limits", () => {
  assert.ok(card.includes("import { HotelAmenityList } from"));
  assert.ok(card.includes("buildHotelAmenityPresentation("));
  assert.ok(card.includes("hotel.amenities,\n    8,"));
  assert.ok(card.includes("expandedAmenityItems.slice(0, 4)"));
  assert.ok(card.includes("items={collapsedAmenityItems}"));
  assert.ok(card.includes("t={t}"));
  assert.ok(!card.includes("const hotelAmenityIcons"));
  assert.ok(!card.includes("function HotelAmenityList"));
  assert.ok(!card.includes("resolveAmenityLabels"));
});
