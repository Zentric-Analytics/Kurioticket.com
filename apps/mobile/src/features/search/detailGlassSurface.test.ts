import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const surface = readFileSync("src/features/search/DetailGlassSurface.tsx", "utf8");
const approved = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const kayak = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");
const flight = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("Cars Liquid Glass is gated by platform and both native runtime capabilities", () => {
  assert.match(surface, /from "expo-glass-effect"/);
  assert.match(surface, /Platform\.OS === "ios"\s*&& isLiquidGlassAvailable\(\)\s*&& isGlassEffectAPIAvailable\(\)/);
  assert.match(surface, /if \(liquidGlassAvailable\) \{[\s\S]*<GlassView/);
  assert.match(surface, /glassEffectStyle="clear"/);
});

test("Flight and Cars keep the existing clear Liquid Glass material", () => {
  const clearStart = surface.indexOf("const glass = (");
  const glass = surface.slice(clearStart, surface.indexOf("/>", clearStart));
  assert.match(glass, /pointerEvents="none"/);
  assert.match(glass, /accessible=\{false\}/);
  assert.match(glass, /glassEffectStyle="clear"/);
  assert.match(glass, /tintColor="transparent"/);
  assert.match(glass, /style=\{variant === "carsOptical" \? StyleSheet\.absoluteFill : style\}/);
  assert.doesNotMatch(glass, /opacity|backgroundColor|borderColor|intensity|fallbackGlass/);
  assert.doesNotMatch(surface, /nativeGlass/);
});

test("Hotel light variant keeps its own native glass body across hero imagery", () => {
  const hotelStart = surface.indexOf('if (variant === "hotelLight")');
  const hotelGlass = surface.slice(hotelStart, surface.indexOf("const glass = (", hotelStart));
  assert.match(surface, /variant\?: "neutral" \| "carsOptical" \| "hotelLight"/);
  assert.match(hotelGlass, /<GlassView/);
  assert.match(hotelGlass, /glassEffectStyle="regular"/);
  assert.match(hotelGlass, /tintColor="rgba\(255, 255, 255, 0\.24\)"/);
  assert.match(surface, /fallbackGlassHotel:[\s\S]*backgroundColor: "rgba\(255, 255, 255, 0\.56\)"[\s\S]*borderColor: "rgba\(255, 255, 255, 0\.78\)"/);
});

test("unsupported iOS and non-iOS platforms retain the polished BlurView fallback", () => {
  assert.match(surface, /const fallback = \(\s*<BlurView/);
  assert.match(surface, /tint=\{dark \? "dark" : "light"\}/);
  assert.match(surface, /Platform\.OS === "android" \? "dimezisBlurView" : undefined/);
  assert.match(surface, /backgroundColor: "rgba\(255, 255, 255, 0\.36\)"/);
  assert.match(surface, /intensity=\{variant === "carsOptical" \? 14 : 28\}/);
  assert.match(surface, /fallbackGlassOptical:[\s\S]*backgroundColor: "rgba\(255, 255, 255, 0\.10\)"/);
});

test("Cars optical variant adds luminous depth without covering the clear material", () => {
  assert.match(surface, /function OpticalGlassFrame/);
  assert.match(surface, /styles\.opticalRim/);
  assert.match(surface, /styles\.opticalSpecular/);
  assert.match(surface, /borderColor: "rgba\(255, 255, 255, 0\.82\)"/);
  assert.doesNotMatch(surface, /setInterval|requestAnimationFrame/);
});

test("Approved and KAYAK Cars share exactly two full-footprint material surfaces", () => {
  for (const detail of [approved, kayak]) {
    assert.match(detail, /import \{ DetailGlassSurface \} from "\.\/DetailGlassSurface"/);
    assert.equal((detail.match(/<DetailGlassSurface /g) ?? []).length, 2);
    assert.doesNotMatch(detail, /<BlurView |<GlassView /);
    assert.match(detail, /<DetailGlassSurface dark=\{theme\.dark\} variant="carsOptical" style=\{s\.heroBackGlass\}/);
    assert.match(detail, /<DetailGlassSurface dark=\{theme\.dark\} variant="carsOptical" style=\{s\.heroActionsGlass\}/);
    assert.match(detail, /heroBackGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
    assert.match(detail, /heroActionsGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
    const actionsStart = detail.indexOf("heroActions:");
    const actionsEnd = detail.indexOf("heroActionsGlass:", actionsStart);
    assert.doesNotMatch(detail.slice(actionsStart, actionsEnd), /overflow|opacity:/);
  }
});

test("loaded and loading Flight controls use full-footprint Cars optical glass", () => {
  assert.match(flight, /import \{ DetailGlassSurface \} from "\.\/DetailGlassSurface"/);
  assert.equal((flight.match(/<DetailGlassSurface /g) ?? []).length, 4);
  assert.equal((flight.match(/variant="carsOptical"/g) ?? []).length, 4);
  assert.equal((flight.match(/<DetailGlassSurface dark=\{theme\.dark\} variant="carsOptical"/g) ?? []).length, 4);
  assert.doesNotMatch(flight, /import \{ BlurView \} from "expo-blur"|<BlurView |rgba\(255, 255, 255, 0\.68\)/);
  assert.match(flight, /heroIconGlass:\{\.\.\.StyleSheet\.absoluteFillObject,borderRadius:22\}/);
  assert.match(flight, /heroActionsGlass:\{\.\.\.StyleSheet\.absoluteFillObject,borderRadius:22\}/);
  assert.doesNotMatch(flight, /hero(?:Icon|Actions)Glass:\{[^}]*?(?:left|right|top|bottom):2/);
});
