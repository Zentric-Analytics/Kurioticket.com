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

test("decorative native glass cannot intercept touch or accessibility", () => {
  const glass = surface.slice(surface.indexOf("<GlassView"), surface.indexOf("/>", surface.indexOf("<GlassView")));
  assert.match(glass, /pointerEvents="none"/);
  assert.match(glass, /accessible=\{false\}/);
  assert.match(glass, /style=\{style\}/);
  assert.doesNotMatch(glass, /opacity|tintColor|backgroundColor|borderColor|intensity|fallbackGlass/);
  assert.doesNotMatch(surface, /nativeGlass/);
});

test("unsupported iOS and non-iOS platforms retain the polished BlurView fallback", () => {
  assert.match(surface, /return \(\s*<BlurView/);
  assert.match(surface, /intensity=\{28\}/);
  assert.match(surface, /tint=\{dark \? "dark" : "light"\}/);
  assert.match(surface, /Platform\.OS === "android" \? "dimezisBlurView" : undefined/);
  assert.match(surface, /backgroundColor: "rgba\(255, 255, 255, 0\.36\)"/);
});

test("Approved and KAYAK Cars share exactly two full-footprint material surfaces", () => {
  for (const detail of [approved, kayak]) {
    assert.match(detail, /import \{ DetailGlassSurface \} from "\.\/DetailGlassSurface"/);
    assert.equal((detail.match(/<DetailGlassSurface /g) ?? []).length, 2);
    assert.doesNotMatch(detail, /<BlurView |<GlassView /);
    assert.match(detail, /heroBackGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
    assert.match(detail, /heroActionsGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
    const actionsStart = detail.indexOf("heroActions:");
    const actionsEnd = detail.indexOf("heroActionsGlass:", actionsStart);
    assert.doesNotMatch(detail.slice(actionsStart, actionsEnd), /overflow|opacity:/);
  }
});


test("loaded and loading Flight controls share the neutral detail glass material", () => {
  assert.match(flight, /import \{ DetailGlassSurface \} from "\.\/DetailGlassSurface"/);
  assert.equal((flight.match(/<DetailGlassSurface /g) ?? []).length, 4);
  assert.doesNotMatch(flight, /import \{ BlurView \} from "expo-blur"|<BlurView |rgba\(255, 255, 255, 0\.68\)/);
  assert.match(flight, /heroIconGlass:\{position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20\}/);
  assert.match(flight, /heroActionsGlass:\{position:"absolute",left:0,right:0,top:2,bottom:2,borderRadius:20\}/);
});
