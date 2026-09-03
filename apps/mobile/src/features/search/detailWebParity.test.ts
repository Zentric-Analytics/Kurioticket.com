import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = hotelSource.slice(hotelSource.indexOf("function HotelDetail"), hotelSource.indexOf("const detailIcons"));
const car = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

test("Hotel details follow the mobile Web identity, gallery, navigation, and compare hierarchy", () => {
  assert.match(hotel, />Back to hotel results</);
  assert.match(hotel, /pathname: "\/hotel-results"/);
  assert.ok(hotel.indexOf("d.hotelIdentity") < hotel.indexOf("d.hotelGallery"));
  assert.ok(hotel.indexOf("d.hotelGallery") < hotel.indexOf("d.hotelTabs"));
  for (const tab of ["compare", "about", "location", "reviews"]) assert.match(hotel, new RegExp(`"${tab}"`));
  assert.match(hotel, />Compare prices</);
  assert.match(hotel, /activeHotelTab === "about"/);
  assert.match(hotel, /activeHotelTab === "location"/);
  assert.match(hotel, /activeHotelTab === "reviews"/);
});

test("Hotel details preserve unavailable inventory truth and canonical provider handoff", () => {
  assert.match(hotel, /result\.inventoryKind === "discovery"/);
  assert.match(hotel, /"Price unavailable"/);
  assert.match(hotel, /result\.searchPolicy\.bookable && Boolean\(redirectUrl\)/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
  assert.match(hotel, /disabled=\{!bookable\}/);
});

test("Car details follow the mobile Web hero, specification, section navigation, and dock hierarchy", () => {
  assert.match(car, />Back to Cars results</);
  assert.match(car, /pathname:"\/car-results"/);
  assert.ok(car.indexOf("d.titleRow") < car.indexOf("<CarGallery"));
  assert.ok(car.indexOf("<CarGallery") < car.indexOf("d.carSpecGrid"));
  assert.ok(car.indexOf("d.carSpecGrid") < car.indexOf("d.carTabs"));
  for (const tab of ["compare", "pickup", "location"]) assert.match(car, new RegExp(`"${tab}"`));
  assert.match(car, />Compare prices</);
  assert.match(car, /activeTab==="pickup"/);
  assert.match(car, /activeTab==="location"/);
  assert.match(car, /d\.sticky/);
});

test("Car details retain canonical facts and never create a booking URL", () => {
  for (const field of ["passengers", "bags", "doors", "transmission", "airConditioning", "mileagePolicy", "fuelPolicy", "pickupLocation", "returnLocation"]) {
    assert.match(car, new RegExp(`result\\.${field}`));
  }
  assert.match(car, /canBookCarOffer\(result\.searchPolicy\.bookable,selected\)/);
  assert.match(car, /Linking\.openURL\(selected\.bookingUrl\)/);
  assert.match(car, /disabled=\{!bookable\}/);
});

test("Hotel and Car details use the shared semantic theme in dark mode", () => {
  for (const source of [hotel, car]) {
    assert.match(source, /useAppTheme\(\)/);
    assert.match(source, /theme\.background/);
    assert.match(source, /theme\.surface/);
    assert.match(source, /theme\.textPrimary/);
    assert.match(source, /theme\.textSecondary/);
    assert.match(source, /theme\.border/);
    assert.match(source, /theme\.icon/);
  }
});
