import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = ["ApprovedCarDetailScreen.tsx", "NativeKayakCarDetailScreen.tsx"].map((name) => ({
  name,
  source: readFileSync(`src/features/search/${name}`, "utf8"),
}));

test("approved and KAYAK Cars adopt the Hotel scroll and sticky-safe-area contract", () => {
  for (const { name, source } of details) {
    assert.match(source, /const carStickyTabsTop = inset\.top \+ 72;/, name);
    for (const contract of [/stickyHeaderIndices=\{\[1\]\}/, /contentInsetAdjustmentBehavior="never"/, /bounces=\{false\}/, /alwaysBounceVertical=\{false\}/, /overScrollMode="never"/, /scrollEventThrottle=\{16\}/, /paddingTop:\s*carStickyTabsTop/, /marginTop:\s*1\s*-\s*carStickyTabsTop/, /backgroundColor:\s*carTabsPinned\s*\?\s*carCanvasColor\s*:\s*"transparent"/, /s\.carsTabsRow,\s*\{\s*backgroundColor:\s*carCanvasColor/, /carTabsStickyStartRef\.current = nativeEvent\.layout\.y/]) assert.match(source, contract, name);
  }
});

test("approved and KAYAK Cars preserve and restore independent tab positions", () => {
  for (const { name, source } of details) {
    for (const ref of ["activeCarTabRef", "carDetailScrollRef", "currentCarScrollOffset", "restoringCarTabScrollRef", "carTabsStickyStartRef", "carTabsPinnedRef", "carTabScrollOffsets"]) assert.match(source, new RegExp(`const ${ref} = useRef`), `${name}: ${ref}`);
    for (const contract of [/const selectCarTab = useCallback/, /onPress=\{\(\)\s*=>\s*selectCarTab\(tab\)\}/, /scrollTo\(\{ y: targetOffset, animated: false \}\)/, /carTabScrollOffsets\.current\[activeCarTabRef\.current\] = offset/, /carTabScrollOffsets\.current = \{ compare: 0, pickup: null, location: null \}/, /\}, \[result\.id\]\);/]) assert.match(source, contract, name);
  }
});

test("approved and KAYAK Cars retain safe responsive hero geometry while reducing only tab labels", () => {
  for (const { name, source } of details) {
    assert.match(source, /const heroControlSafeZoneHeight = inset\.top \+ 12 \+ 44 \+ 14/, name);
    assert.match(source, /const heroVehicleStageHeight = Math\.min\(224, Math\.max\(176, width \* 0\.5\)\)/, name);
    assert.match(source, /imageBox:\s*\{\s*width:\s*"100%",\s*overflow:\s*"hidden"\s*\}/, name);
    assert.match(source, /mediaStage:\s*\{\s*flex:\s*1,\s*paddingBottom:\s*12\s*\}/, name);
    assert.match(source, /resizeMode="contain"/, name);
    assert.match(source, /fontSize:\s*width\s*>=\s*390\s*\?\s*11\s*:\s*10/, name);
    for (const heading of ["compareHeading", "pickupHeading", "locationHeading"]) assert.match(source, new RegExp(`${heading}:\\s*\\{[^}]*fontSize:\\s*14[^}]*lineHeight:\\s*20[^}]*fontWeight:\\s*"700"[^}]*fontFamily:\\s*appFonts\\.bold`), `${name}: ${heading}`);
    assert.match(source, /const carInformationSurface\s*=\s*theme\.dark\s*\?\s*carCanvasColor\s*:\s*"#E7EBF1"/, name);
    assert.match(source, /style=\{\[s\.heroBack,\s*\{\s*top:\s*inset\.top\s*\+\s*12,\s*backgroundColor:\s*carInformationSurface\s*\}\]\}/, name);
    assert.match(source, /style=\{\[s\.heroActions,\s*\{\s*top:\s*inset\.top\s*\+\s*12,\s*backgroundColor:\s*carInformationSurface\s*\}\]\}/, name);
  }
});
