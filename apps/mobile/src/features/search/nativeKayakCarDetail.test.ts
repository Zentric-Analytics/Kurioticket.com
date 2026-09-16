import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/car-details.tsx", "utf8");
const sandboxDetail = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");
const normalDetail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const providerPresentation = readFileSync("src/features/search/nativeCarProviderPresentation.ts", "utf8");

test("native Cars details keep normal inventory on the approved surface and isolate KAYAK sandbox inventory", () => {
  assert.match(route, /NativeKayakCarDetailScreen/);
  assert.match(route, /ApprovedCarDetailScreen/);
  assert.match(route, /resultId\?\.startsWith\("kayak-sandbox:"\)/);
  assert.match(route, /parsed\.inventorySource === "kayak-sandbox"/);
  assert.match(route, /parsed\.searchPolicy\?\.source === "kayak-sandbox"/);
  assert.match(route, /\? <NativeKayakCarDetailScreen \/>[\s\S]*: <ApprovedCarDetailScreen \/>/);
  assert.doesNotMatch(normalDetail, /KAYAK sandbox · Simulated · Not bookable/);
});

test("native KAYAK Cars details recover only through the canonical server Cars API", () => {
  assert.match(sandboxDetail, /travelApi\.searchCars\(plan\.plan\.payload\)/);
  assert.match(sandboxDetail, /safeCanonicalCarResult\(item\)/);
  assert.match(sandboxDetail, /isKayakSandboxCar\(item\)/);
  assert.doesNotMatch(sandboxDetail, /api\/sandbox\/kayak|KAYAK_SANDBOX_API_KEY/);
});

test("native KAYAK Cars details use provider-owned specs and never display schema placeholder capacities directly", () => {
  assert.match(sandboxDetail, /nativeCarPrimarySpecLabels\(result\)/);
  assert.match(providerPresentation, /sandboxPresentation\?\.specs/);
  assert.match(providerPresentation, /Passengers not supplied/);
  assert.match(providerPresentation, /Baggage capacity not supplied/);
  assert.match(providerPresentation, /Doors not supplied/);
  assert.match(providerPresentation, /Transmission not supplied/);
  assert.doesNotMatch(sandboxDetail, /\$\{result\.passengers\} passengers|\$\{result\.bags\} bags|\$\{result\.doors\} doors/);
  assert.doesNotMatch(sandboxDetail, /nativeCarFuelPolicyLabel|nativeCarMileageLabel|result\.airConditioning|result\.fuelPolicy|result\.mileagePolicy/);
});

test("native KAYAK Cars details remain explicitly simulated and use only the allow-listed test handoff", () => {
  assert.match(sandboxDetail, /KAYAK sandbox · Simulated · Not bookable/);
  assert.match(sandboxDetail, /Simulated provider inventory for staging\. No real booking or payment is enabled\./);
  assert.match(sandboxDetail, /sandboxBookingUrl\(offer\?\.bookingUrl\)/);
  assert.match(sandboxDetail, /Open KAYAK test page/);
  assert.match(sandboxDetail, /Linking\.openURL\(sandboxHref\)/);
  assert.match(sandboxDetail, /Test page unavailable/);
  assert.doesNotMatch(sandboxDetail, /Continue deal|Continue booking|Book now/);
});

test("sandbox native results do not imply recommendation or saved-state support", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  assert.match(card, /rank === 0 && !sandbox/);
  assert.match(card, /!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(card, /KAYAK sandbox · Simulated · Not bookable/);
});
