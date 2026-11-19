import assert from "node:assert/strict";
import test from "node:test";
import type { CarResult } from "../../api/travelApi";
import { isKayakSandboxCar, nativeCarPrimarySpecLabels } from "./nativeCarProviderPresentation";

const base = {
  id: "car-1",
  modelName: "Example Car",
  passengers: 5,
  bags: 3,
  doors: 4,
  transmission: "automatic",
  inventorySource: "kurioticket-static-cars",
  searchPolicy: { source: "kurioticket-static-cars", bookable: false, action: { kind: "internal-detail", href: "/cars/details/car-1", enabled: true } },
} as unknown as CarResult;

test("native static Cars specs keep canonical labels", () => {
  assert.equal(isKayakSandboxCar(base), false);
  assert.deepEqual(nativeCarPrimarySpecLabels(base), {
    passengers: "5 passengers",
    bags: "3 bags",
    doors: "4 doors",
    transmission: "Automatic",
  });
});

test("native KAYAK Cars specs use provider-owned sandbox presentation instead of legacy defaults", () => {
  const kayak = {
    ...base,
    passengers: 0,
    bags: 0,
    doors: 0,
    inventorySource: "kayak-sandbox",
    searchPolicy: { ...base.searchPolicy, source: "kayak-sandbox" },
    sandboxPresentation: {
      specs: ["7 passengers", "4 bags", "5 doors", "Manual"],
      pickupLabel: "Search pickup",
      filterOptions: ["manual", "seats7Plus", "bags4Plus"],
    },
  } as unknown as CarResult;
  assert.equal(isKayakSandboxCar(kayak), true);
  assert.deepEqual(nativeCarPrimarySpecLabels(kayak), {
    passengers: "7 passengers",
    bags: "4 bags",
    doors: "5 doors",
    transmission: "Manual",
  });
});

test("native KAYAK Cars omit authored missing-data labels instead of displaying them as provider facts", () => {
  const kayak = {
    ...base,
    passengers: 0,
    bags: 0,
    doors: 0,
    inventorySource: "kayak-sandbox",
    searchPolicy: { ...base.searchPolicy, source: "kayak-sandbox" },
    sandboxPresentation: {
      specs: ["Passengers not supplied", "Baggage capacity not supplied", "Doors not supplied", "Transmission not supplied"],
      pickupLabel: "Search pickup",
    },
  } as unknown as CarResult;
  assert.deepEqual(nativeCarPrimarySpecLabels(kayak), {
    passengers: "",
    bags: "",
    doors: "",
    transmission: "",
  });
});
