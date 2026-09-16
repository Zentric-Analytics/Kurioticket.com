import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/car-details.tsx", "utf8");
const sandboxDetail = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");
const normalDetail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const providerPresentation = readFileSync("src/features/search/nativeCarProviderPresentation.ts", "utf8");

test("native Cars details keep provider detection while KAYAK mirrors the approved Cars Details structure", () => {
  assert.match(route, /NativeKayakCarDetailScreen/);
  assert.match(route, /ApprovedCarDetailScreen/);
  assert.match(route, /resultId\?\.startsWith\("kayak-sandbox:"\)/);
  assert.match(route, /parsed\.inventorySource === "kayak-sandbox"/);
  assert.match(route, /parsed\.searchPolicy\?\.source === "kayak-sandbox"/);
  assert.match(route, /\? <NativeKayakCarDetailScreen \/>[\s\S]*: <ApprovedCarDetailScreen \/>/);
  for (const marker of [
    /stickyHeaderIndices=\{\[1\]\}/,
    /Compare deals/,
    /Pickup and return/,
    /Location/,
    /carTabCompare/,
    /carTabPickup/,
    /carTabLocation/,
    /dockContent/,
  ]) {
    assert.match(normalDetail, marker);
    assert.match(sandboxDetail, marker);
  }
});

test("approved and KAYAK Cars details share the light canvas and vehicle image surface contract", () => {
  for (const detail of [normalDetail, sandboxDetail]) {
    assert.match(detail, /const CAR_DETAIL_LIGHT_CANVAS = "#F5F7FB"/);
    assert.match(detail, /const carCanvasColor\s*=\s*theme\.dark\s*\?\s*theme\.background\s*:\s*CAR_DETAIL_LIGHT_CANVAS/);
    assert.match(detail, /s\.safe,\s*\{\s*backgroundColor:\s*carCanvasColor\s*\}/);
    assert.match(detail, /style=\{\[s\.heroBack,\s*\{\s*top:\s*inset\.top\s*\+\s*12\s*\}\]\}/);
    assert.match(detail, /<ScrollView[^>]*style=\{\{\s*backgroundColor:\s*carCanvasColor\s*\}\}/);
    assert.match(detail, /s\.hero,\s*\{\s*backgroundColor:\s*carCanvasColor,\s*borderColor:\s*theme\.border\s*\}/);
    assert.match(detail, /s\.imageBox,\s*\{\s*backgroundColor:\s*theme\.surface\s*\}/);
  }
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
  assert.match(sandboxDetail, /Simulated KAYAK provider inventory for staging\. No real booking or payment is enabled\./);
  assert.match(sandboxDetail, /sandboxBookingUrl\(offer\?\.bookingUrl\)/);
  assert.match(sandboxDetail, /Open KAYAK test page/);
  assert.match(sandboxDetail, /Linking\.openURL\(sandboxHref\)/);
  assert.match(sandboxDetail, /Test page unavailable/);
  assert.doesNotMatch(sandboxDetail, /Continue deal|Continue booking|Book now/);
});

test("native KAYAK Cars details do not invent unsupported static-provider facts", () => {
  assert.doesNotMatch(sandboxDetail, /Kurioticket-logo|kurioticket-logo-primary-light-bg/);
  assert.doesNotMatch(sandboxDetail, /Free cancellation|Non-refundable|Unlimited mileage|Full-to-full|Same-to-same|Air conditioning|Valid driver's license/);
  assert.match(sandboxDetail, /Exact collection instructions were not supplied by the sandbox provider/);
  assert.match(sandboxDetail, /sandboxPickupLabel\(result\)/);
});

test("sandbox native results omit recommendations while retaining standard save and share actions", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  assert.match(card, /rank === 0 && !sandbox/);
  assert.doesNotMatch(card, /!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(card, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(card, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\}/);
  assert.match(card, /KAYAK sandbox · Simulated · Not bookable/);
});


test("native KAYAK Cars details use the standard accessible save and share contract", () => {
  assert.match(sandboxDetail, /const saved = useSavedCar\(result, params\)/);
  assert.match(sandboxDetail, /accessibilityLabel=\{saved\.saved \? "Remove car from saved" : "Save car"\}/);
  assert.match(sandboxDetail, /accessibilityState=\{\{ selected: saved\.saved \}\} onPress=\{saved\.toggle\}/);
  assert.match(sandboxDetail, /accessibilityLabel="Share car" onPress=\{\(\) => void Share\.share/);
  assert.match(sandboxDetail, /<Heart size=\{22\}/);
  assert.match(sandboxDetail, /<Share2 size=\{21\}/);
});

test("approved and KAYAK detail rails and content use the Cars canvas", () => {
  for (const detail of [normalDetail, sandboxDetail]) {
    assert.match(detail, /s\.carsTabsShell,\s*\{\s*backgroundColor:\s*carCanvasColor/);
    assert.match(detail, /s\.page,\s*\{\s*backgroundColor:\s*carCanvasColor/);
    assert.doesNotMatch(detail, /s\.carsTabsShell,\s*\{\s*backgroundColor:\s*theme\.surface/);
    assert.doesNotMatch(detail, /s\.pickupSection,\s*\{\s*backgroundColor:\s*theme\.surface/);
  }
});
