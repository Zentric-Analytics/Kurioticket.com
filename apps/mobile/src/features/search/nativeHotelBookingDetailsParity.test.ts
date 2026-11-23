import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import {
  buildNativeHotelAboutCopy,
  buildNativeHotelAmenityGroups,
} from "./nativeHotelBookingDetailsModel";

const route = readFileSync("app/hotel-details.tsx", "utf8");
const screen = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const details = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");

const property: PublicHotelPropertyDetails = {
  description:
    "A technology-led Tower Hill hotel with compact smart rooms, shared living spaces and a rooftop bar overlooking central London landmarks.",
  propertyType: "Hotel",
  latitude: 51.5107,
  longitude: -0.0765,
  streetAddress: "40 Trinity Square, London EC3N 4DJ",
  city: "London",
  country: "United Kingdom",
  neighbourhood: "Tower Hill",
  roomSummary: "Smart king room options",
  bedSummary: "XL king bed",
  interestTags: ["sightseeing"],
  familySuitable: false,
  businessSuitable: true,
  accessibility: ["Accessible accommodation features are available"],
};

test("hotel-details route uses the composed booking details screen with Profile text tokens", () => {
  assert.match(route, /import \{ HotelDetailsScreen \} from "\.\.\/src\/features\/search\/HotelDetailsScreen"/);
  assert.match(route, /import \{ ProfileThemeProvider \} from "\.\.\/src\/theme\/AppTheme"/);
  assert.match(route, /return \([\s\S]*?<ProfileThemeProvider>[\s\S]*?<HotelDetailsScreen \/>[\s\S]*?<\/ProfileThemeProvider>[\s\S]*?\);/);
  assert.doesNotMatch(route, /ApprovedDetailScreen/);
  assert.match(screen, /activeHotelTab === "details"[\s\S]*?<NativeHotelBookingDetails/);
});

test("Details follows a compact booking-page order with Location directly after About", () => {
  const about = details.indexOf(">About this hotel<");
  const amenities = details.indexOf(">Popular amenities<");
  const location = details.indexOf("<NativeHotelLocationSection");
  const room = details.indexOf(">Room &amp; comfort<");
  const accessibility = details.indexOf(">Accessibility<");
  const related = details.indexOf("<NativeRelatedHotelsSection");
  for (const index of [about, location, amenities, room, accessibility, related]) {
    assert.notEqual(index, -1);
  }
  assert.ok(about < location);
  assert.ok(location < amenities);
  assert.ok(amenities < room);
  assert.ok(room < accessibility);
  assert.ok(accessibility < related);
  assert.doesNotMatch(details, />Hotel information<|width: "48%"|width: "45%"|flexWrap: "wrap"/);
});

test("popular amenities stay one per row and the all-amenities action remains in the same section", () => {
  assert.match(details, /const popularAmenities = amenityItems\.slice\(0, 4\)/);
  assert.match(details, /buildHotelAmenityPresentation\([\s\S]*?result\.amenities,[\s\S]*?result\.amenities\.length/);
  assert.match(details, /accessibilityLabel="See all amenities"/);
  assert.match(details, />See all amenities<\/Text>/);
  assert.match(details, /style=\{\(\{ pressed \}\) => \[s\.seeAllLink, pressed && s\.pressed\]\}/);
  assert.doesNotMatch(details, /ChevronRight|seeAllRow|borderTopColor: theme\.border/);
  assert.match(details, /<Modal[\s\S]*?visible=\{amenitiesOpen\}[\s\S]*?>All amenities<\/Text>/);
  assert.match(details, /amenityGroups\.map/);

  const items = buildHotelAmenityPresentation(
    ["Wi-Fi", "Restaurant", "Bar", "Workspaces", "Fitness centre", "Parking"],
    6,
  );
  const groups = buildNativeHotelAmenityGroups(items);
  assert.equal(groups.reduce((count, group) => count + group.items.length, 0), items.length);
  assert.ok(groups.some((group) => group.title === "Internet"));
  assert.ok(groups.some((group) => group.title === "Food & drink"));
});

test("About this hotel explains the existing facts instead of replacing them", () => {
  const copy = buildNativeHotelAboutCopy({
    name: "citizenM Tower of London",
    property,
    classification: 4,
  });
  assert.match(copy, /^citizenM Tower of London is a 4-star hotel in Tower Hill, London\./);
  assert.match(copy, /The hotel is a technology-led Tower Hill hotel with compact smart rooms, shared living spaces and a rooftop bar overlooking central London landmarks\./);
  assert.match(copy, /Room information currently lists Smart king room options, with XL king bed\./);
  assert.doesNotMatch(copy, /perfect|best|luxury|guaranteed/i);
});

test("Details keeps room, accessibility and related-hotel information without a redundant Hotel information block", () => {
  assert.match(details, /const providerRoomName = providerDetails\?\.rate\?\.roomName\?\.trim\(\) \?\? ""/);
  assert.match(details, /\[property\?\.roomSummary, property\?\.bedSummary, providerRoomName\][\s\S]*?\.map/);
  assert.match(details, /property\.accessibility\.map/);
  assert.match(details, /<NativeRelatedHotelsSection/);
  assert.doesNotMatch(details, />Hotel information<|<Award\b|Hotel classification is not available\./);
});

test("Details uses a tightened divider-free Profile-style mobile rhythm", () => {
  assert.match(details, /section: \{ paddingVertical: 0 \}/);
  assert.match(details, /sectionGap: \{ height: 8 \}/);
  assert.match(details, /description: \{ marginTop: 3,/);
  assert.match(details, /rowList: \{ marginTop: 4, gap: 3 \}/);
  assert.match(details, /seeAllLink: \{ alignSelf: "flex-start", marginTop: 4, paddingVertical: 4 \}/);
  assert.doesNotMatch(details, /function SectionDivider|s\.divider|divider: \{|borderTopWidth: StyleSheet\.hairlineWidth/);
  assert.match(details, /heading: \{ fontSize: 16, lineHeight: 22, fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(details, /rowText: \{[^}]*fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: appFonts\.regular/);
  assert.match(details, /const iconColor = theme\.dark \? theme\.icon : "#1A1A1A"/);
  assert.match(details, /strokeWidth=\{1\.3\}/);
});
