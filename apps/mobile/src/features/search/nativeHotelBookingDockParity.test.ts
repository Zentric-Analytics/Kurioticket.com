import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const dock = detailSource.slice(
  detailSource.indexOf("<View\n        style={[\n          s.sticky"),
  detailSource.indexOf("<HotelRoomOptionsModal"),
);
const webSource = readFileSync(
  "../../src/components/results/hotelDetails/StandaloneHotelDetails.tsx",
  "utf8",
);
const webDock = webSource.slice(
  webSource.lastIndexOf("<section", webSource.indexOf("data-mobile-hotel-stay-dock")),
  webSource.indexOf("</section>", webSource.indexOf("data-mobile-hotel-stay-dock")),
);

function styleRule(name: string, nextName?: string) {
  const start = detailSource.indexOf(`  ${name}:`);
  const end = nextName
    ? detailSource.indexOf(`  ${nextName}:`, start)
    : detailSource.indexOf("\n});", start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName ?? "stylesheet end"} must follow ${name}`);
  return detailSource.slice(start, end);
}

test("mobile web reference retains the authoritative Hotel stay dock contract", () => {
  for (const token of [
    "rounded-t-[22px]",
    "px-4",
    "pt-3",
    "safe-area-inset-bottom",
    "gap-3",
    "grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)]",
    "text-[11px]",
    "font-semibold",
    "text-[clamp(1.25rem,6vw,1.5rem)]",
    "font-extrabold",
    "min-h-12",
    "w-full",
    "rounded-lg",
    "px-3",
    "text-xs",
    "font-bold",
    "leading-4",
  ]) assert.ok(webDock.includes(token), `mobile web dock must retain ${token}`);
  assert.ok((webDock.match(/text-\[11px\]/g) ?? []).length >= 2);
});

test("active native Hotel dock keeps safe-area behavior with compact padding", () => {
  const sticky = styleRule("sticky", "dockContent");
  assert.match(sticky, /borderTopLeftRadius: 18[\s\S]*borderTopRightRadius: 18/);
  assert.match(sticky, /paddingHorizontal: 16[\s\S]*paddingTop: 8/);
  assert.match(sticky, /shadowColor: "#0F172A"[\s\S]*shadowOffset: \{ width: 0, height: -4 \}[\s\S]*shadowOpacity: 0\.06[\s\S]*shadowRadius: 8[\s\S]*elevation: 6/);
  assert.doesNotMatch(sticky, /borderTopWidth|borderTopColor/);
  assert.match(dock, /paddingBottom: 8 \+ inset\.bottom/);
  assert.match(dock, /backgroundColor: hotelCanvasColor/);
});

test("active native dock owns the compact two-column price and action layout", () => {
  assert.match(styleRule("dockContent", "dockPrice"), /width: "100%"[\s\S]*flexDirection: "row"[\s\S]*alignItems: "center"[\s\S]*gap: 10/);
  assert.match(styleRule("dockPrice", "dockLabel"), /flex: 1[\s\S]*minWidth: 0/);
  assert.match(styleRule("dockAction", "continueButton"), /flex: 0\.9[\s\S]*minWidth: 132/);
  assert.match(styleRule("continueButton", "continuePressed"), /width: "100%"/);
  assert.match(dock, /<View style=\{s\.dockContent\}>[\s\S]*<View style=\{s\.dockPrice\}>[\s\S]*<View style=\{s\.dockAction\}>/);
});

test("active native dock price hierarchy remains left aligned", () => {
  assert.match(styleRule("dockLabel", "dockEyebrow"), /gap: 4/);
  assert.match(styleRule("dockEyebrow", "dockTotal"), /fontSize: 11[\s\S]*lineHeight: 16[\s\S]*fontWeight: "600"[\s\S]*fontFamily: appFonts\.semibold/);
  assert.match(styleRule("dockTotal", "dockPerNight"), /fontSize: 24[\s\S]*lineHeight: 30[\s\S]*fontWeight: "800"[\s\S]*fontFamily: appFonts\.extraBold[\s\S]*textAlign: "left"/);
  assert.match(styleRule("dockPerNight", "dockAction"), /fontSize: 11[\s\S]*lineHeight: 16[\s\S]*fontWeight: "400"[\s\S]*fontFamily: appFonts\.regular[\s\S]*textAlign: "left"/);
  assert.match(dock, /<Info accessible=\{false\} size=\{12\} color=\{theme\.textSecondary\} \/>/);
  assert.match(dock, /minimumFontScale=\{0\.83\}[\s\S]*s\.dockTotal/);
});

test("Deals keeps its distinct right-aligned per-night style", () => {
  assert.match(styleRule("perNight", "sectionLead"), /fontSize: 10[\s\S]*lineHeight: 14[\s\S]*fontWeight: "500"[\s\S]*fontFamily: appFonts\.medium[\s\S]*textAlign: "right"/);
  assert.match(detailSource, /<Text numberOfLines=\{1\} style=\{\[s\.perNight, \{ color: hotelAccent \}\]\}>per night<\/Text>/);
});

test("active native CTA preserves the 48dp booking touch target and behavior", () => {
  assert.match(styleRule("continueButton", "continuePressed"), /width: "100%"[\s\S]*minHeight: 48[\s\S]*borderRadius: 8[\s\S]*backgroundColor: colors\.blue[\s\S]*paddingHorizontal: 12/);
  assert.match(styleRule("continuePressed", "continueDisabled"), /backgroundColor: "#003B91"/);
  assert.match(styleRule("continueDisabled", "continueText"), /opacity: 0\.5/);
  assert.match(styleRule("continueText"), /fontSize: 12[\s\S]*lineHeight: 16[\s\S]*fontWeight: "700"[\s\S]*fontFamily: appFonts\.bold[\s\S]*textAlign: "center"/);
  assert.match(dock, /accessibilityRole="button"[\s\S]*accessibilityState=\{\{ disabled: !canContinue \}\}[\s\S]*disabled=\{!canContinue\}[\s\S]*onPress=\{\(\) => void continueBooking\(\)\}/);
  assert.equal((dock.match(/Continue booking/g) ?? []).length, 1);
});

test("active native dock displays formatted price truth without arithmetic", () => {
  assert.match(dock, /\{hasPrice \? \(totalPrice\?\.formatted \?\? "—"\) : "Price unavailable"\}/);
  assert.match(dock, /\{hasPrice \? `\$\{nightlyPrice\?\.formatted \?\? "—"\} per night` : "No live price supplied"\}/);
  assert.doesNotMatch(dock, /totalPrice\s*[/*]|nightlyPrice\s*[/*]|\bnights\s*[/*]|\/[\s]*nights|\*[\s]*nights/);
});
