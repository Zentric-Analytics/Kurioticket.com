import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sources = [
  "ApprovedCarDetailScreen.tsx",
  "NativeKayakCarDetailScreen.tsx",
].map(file => ({ file, source: readFileSync(`src/features/search/${file}`, "utf8") }));

function style(source: string, name: string): string {
  const match = source.match(new RegExp(`${name}:\\s*\\{([^}]+)\\}`));
  assert.ok(match, `missing ${name} style`);
  return match[1];
}

test("car detail timeline icons align to the first text line", () => {
  for (const { file, source } of sources) {
    assert.match(source, /<MapPin size=\{16\} color="#004BB8" style=\{s\.timelineInfoIcon\}/, file);
    assert.match(source, /<Clock3 size=\{16\}[^>]*style=\{s\.timelineInfoIcon\}/, file);
    assert.match(style(source, "timelineInfoIcon"), /marginTop:\s*2,\s*flexShrink:\s*0/, file);
    assert.match(style(source, "infoRow"), /alignItems:\s*"flex-start"/, file);
    assert.doesNotMatch(style(source, "infoRow"), /alignItems:\s*"center"/, file);
  }
});

test("approved car driver-license icon aligns to the first text line", () => {
  const source = sources[0].source;
  assert.match(source, /<IdCard size=\{19\}[^>]*style=\{s\.requirementIcon\}/);
  assert.match(style(source, "requirementIcon"), /marginTop:\s*1,\s*flexShrink:\s*0/);
  assert.match(style(source, "requirementRow"), /flexDirection:\s*"row"[^}]*alignItems:\s*"flex-start"[^}]*gap:\s*10/);
  assert.match(style(source, "requirementText"), /fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"500"[^}]*fontFamily:\s*appFonts\.medium/);
  assert.doesNotMatch(sources[1].source, /Pickup requirements|Valid driver's license|<IdCard/);
});

test("Location entries share the Pickup and return rail and dot geometry", () => {
  for (const { file, source } of sources) {
    const locationEntry = source.match(/function LocationTimelineEntry[\s\S]*?function (?:PickupReturn|PickupAndReturn)/)?.[0] ?? "";
    assert.match(locationEntry, /<View style=\{s\.timelineRail\}><View style=\{s\.timelineDot\}/, file);
    assert.doesNotMatch(source, /locationTimelineRail|locationConnector|connector\??(?:=|:)/, file);
    assert.match(style(source, "timelineRail"), /width:\s*14[^}]*borderLeftWidth:\s*2[^}]*borderLeftColor:\s*"#BFDBFE"[^}]*alignItems:\s*"center"/, file);
    assert.match(style(source, "timelineDot"), /left:\s*-7[^}]*top:\s*4[^}]*width:\s*12[^}]*height:\s*12[^}]*borderRadius:\s*6[^}]*backgroundColor:\s*"#004BB8"/, file);
  }
});
