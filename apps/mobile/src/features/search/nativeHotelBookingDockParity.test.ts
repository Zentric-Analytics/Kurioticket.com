import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = detailSource.slice(
  detailSource.indexOf("function HotelDetail"),
  detailSource.indexOf("const detailIcons"),
);
const dock = hotel.slice(hotel.indexOf("d.hotelSticky"), hotel.indexOf("<HotelRoomOptionsModal"));
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
    : detailSource.indexOf("\n\n});", start);
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

test("native outer sheet mirrors rounded, padded, safe-area-aware web geometry", () => {
  const sticky = styleRule("hotelSticky", "hotelFactRow");
  assert.match(sticky, /borderTopLeftRadius: 22[\s\S]*borderTopRightRadius: 22/);
  assert.match(sticky, /paddingHorizontal: 16[\s\S]*paddingTop: 12/);
  assert.match(sticky, /shadowColor: "#0F172A"[\s\S]*shadowOffset: \{ width: 0, height: -8 \}[\s\S]*shadowOpacity: 0\.14[\s\S]*shadowRadius: 14[\s\S]*elevation: 12/);
  assert.doesNotMatch(sticky, /\bpadding: 10|\bminHeight: 92|justifyContent: "space-between"|overflow: "hidden"/);
  assert.match(dock, /paddingBottom: 12 \+ inset\.bottom/);
});

test("native dock owns a proportional two-column price and action layout", () => {
  assert.match(styleRule("hotelDockContent", "hotelDockPrice"), /width: "100%"[\s\S]*flexDirection: "row"[\s\S]*alignItems: "center"[\s\S]*gap: 12/);
  assert.match(styleRule("hotelDockPrice", "hotelDockLabel"), /flex: 1[\s\S]*minWidth: 0/);
  assert.match(styleRule("hotelDockAction", "hotelContinue"), /flex: 0\.9[\s\S]*minWidth: 132/);
  assert.match(styleRule("hotelContinue", "hotelContinuePressed"), /width: "100%"/);
  assert.match(dock, /<View style=\{d\.hotelDockContent\}>[\s\S]*<View style=\{d\.hotelDockPrice\}>[\s\S]*<View style=\{d\.hotelDockAction\}>/);
});

test("native dock price hierarchy matches mobile web and remains left aligned", () => {
  assert.match(styleRule("hotelDockLabel", "hotelDockEyebrow"), /gap: 4/);
  assert.match(styleRule("hotelDockEyebrow", "hotelDockTotal"), /fontSize: 11[\s\S]*lineHeight: 16[\s\S]*fontWeight: "600"[\s\S]*fontFamily: appFonts\.semibold/);
  assert.match(styleRule("hotelDockTotal", "hotelDockPerNight"), /fontSize: 24[\s\S]*lineHeight: 30[\s\S]*fontWeight: "800"[\s\S]*fontFamily: appFonts\.extraBold[\s\S]*textAlign: "left"/);
  assert.match(styleRule("hotelDockPerNight", "hotelDockAction"), /fontSize: 11[\s\S]*lineHeight: 16[\s\S]*fontWeight: "400"[\s\S]*fontFamily: appFonts\.regular[\s\S]*textAlign: "left"/);
  assert.match(dock, /<Info accessible=\{false\} size=\{12\} color=\{theme\.textSecondary\} \/>/);
  assert.match(dock, /minimumFontScale=\{0\.83\}[\s\S]*d\.hotelDockTotal/);
  assert.match(dock, /d\.hotelDockPerNight/);
  assert.doesNotMatch(dock, /d\.hotelPerNight/);
});

test("Compare prices keeps its distinct right-aligned per-night style", () => {
  assert.match(styleRule("hotelPerNight", "hotelAboutPanel"), /fontSize: 12[\s\S]*lineHeight: 16[\s\S]*fontWeight: "500"[\s\S]*fontFamily: appFonts\.medium[\s\S]*textAlign: "right"/);
  assert.match(hotel, /<Text numberOfLines=\{1\} style=\{\[d\.hotelPerNight, \{ color: hotelAccent \}\]\}>per night<\/Text>/);
});

test("native CTA matches web proportions without changing booking behavior", () => {
  assert.match(styleRule("hotelContinue", "hotelContinuePressed"), /width: "100%"[\s\S]*minHeight: 48[\s\S]*borderRadius: 8[\s\S]*backgroundColor: colors\.blue[\s\S]*paddingHorizontal: 12/);
  assert.match(styleRule("hotelContinuePressed", "hotelContinueDisabled"), /backgroundColor: "#003B91"/);
  assert.match(styleRule("hotelContinueDisabled", "hotelContinueText"), /opacity: 0\.5/);
  assert.match(styleRule("hotelContinueText"), /fontSize: 12[\s\S]*lineHeight: 16[\s\S]*fontWeight: "700"[\s\S]*fontFamily: appFonts\.bold[\s\S]*textAlign: "center"/);
  assert.match(dock, /accessibilityRole="button"[\s\S]*accessibilityState=\{\{ disabled: !canContinue \}\}[\s\S]*disabled=\{!canContinue\}[\s\S]*onPress=\{\(\) => void continueBooking\(\)\}/);
  assert.equal((dock.match(/Continue booking/g) ?? []).length, 1);
});

test("native dock displays existing formatted price truth without arithmetic", () => {
  assert.match(dock, /\{hasPrice \? \(totalPrice\?\.formatted \?\? "—"\) : "Price unavailable"\}/);
  assert.match(dock, /\{hasPrice[\s\S]*?nightlyPrice\?\.formatted[\s\S]*?per night[\s\S]*?: "No live price supplied"\}/);
  assert.doesNotMatch(dock, /totalPrice\s*[/*]|nightlyPrice\s*[/*]|\bnights\s*[/*]|\/[\s]*nights|\*[\s]*nights/);
});
