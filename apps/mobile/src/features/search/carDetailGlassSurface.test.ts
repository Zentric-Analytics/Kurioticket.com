import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const surface = readFileSync("src/features/search/CarDetailGlassSurface.tsx", "utf8");
const approved = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const kayak = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");

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
  assert.doesNotMatch(glass, /opacity|tintColor|0\.58/);
  assert.doesNotMatch(surface.slice(surface.indexOf("nativeGlass:"), surface.indexOf("fallbackGlass:")), /opacity|backgroundColor|0\.58/);
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
    assert.match(detail, /import \{ CarDetailGlassSurface \} from "\.\/CarDetailGlassSurface"/);
    assert.equal((detail.match(/<CarDetailGlassSurface /g) ?? []).length, 2);
    assert.doesNotMatch(detail, /<BlurView |<GlassView /);
    assert.match(detail, /heroBackGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
    assert.match(detail, /heroActionsGlass:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*borderRadius:\s*22\s*\}/);
  }
});
