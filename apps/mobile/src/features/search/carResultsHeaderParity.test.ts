import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const hotels = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const carHeader = cars.slice(cars.indexOf("function CarResultsHeader"), cars.indexOf("function CarSkeletons"));
const hotelHeader = hotels.slice(hotels.indexOf("function HotelResultsHeader"), hotels.indexOf("const HotelResultsShortcut"));

test("Cars Results replaces branded chrome with two Hotel-style header targets", () => {
  assert.doesNotMatch(cars, /import[^\n]*\bTopBar\b|<TopBar(?:\s|\/|>)/);
  assert.doesNotMatch(cars, /import \{ BottomNav \}|<BottomNav(?:\s|\/|>)/);
  assert.doesNotMatch(carHeader, /Logo|Kurioticket|Bell|Notifications|notification badge|profile|menu/i);
  assert.match(carHeader, /accessibilityLabel="Go back"[^]*?onPress=\{\(\)=>router\.back\(\)\}[^]*?<ArrowLeft/);
  assert.match(carHeader, /accessibilityLabel=\{`Edit car search\. \$\{destination\}\. \$\{secondaryLine\}`\} onPress=\{onEdit\}/);
  assert.equal((carHeader.match(/<Pressable/g) ?? []).length, 2);
});

test("Cars header copies the current Hotel header geometry", () => {
  for (const contract of [
    /carHeader:\{paddingTop:12,paddingHorizontal:12,paddingBottom:12\}/,
    /carHeaderMainRow:\{width:"100%",flexDirection:"row",alignItems:"center"\}/,
    /carHeaderSide:\{width:52,flexShrink:0\}/,
    /carHeaderBack:\{width:44,height:44,alignItems:"center",justifyContent:"center"\}/,
    /carSummaryCard:\{flex:1,minWidth:0,minHeight:64,borderWidth:1,borderRadius:13,paddingLeft:16,flexDirection:"row",alignItems:"center",overflow:"hidden"\}/,
    /carSummaryEditSlot:\{width:44,height:44,flexShrink:0,alignItems:"center",justifyContent:"center"\}/,
  ]) assert.match(cars, contract);
  for (const hotelStyle of ["paddingTop: 12", "paddingHorizontal: 12", "paddingBottom: 12", "width: 52", "minHeight: 64", "borderRadius: 13"]) {
    assert.ok(hotels.includes(hotelStyle), `Hotel reference no longer contains ${hotelStyle}`);
  }
});

test("Cars summary typography and pencil match Hotel Results", () => {
  assert.match(cars, /carSummaryDestination:\{fontSize:16,lineHeight:20,fontWeight:"700",fontFamily:appFonts\.bold\}/);
  assert.match(cars, /carSummarySecondary:\{marginTop:3,fontSize:12\.5,lineHeight:17,fontWeight:"600",fontFamily:appFonts\.semibold\}/);
  assert.equal((carHeader.match(/numberOfLines=\{1\} ellipsizeMode="tail"/g) ?? []).length, 2);
  assert.match(carHeader, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(hotelHeader, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.doesNotMatch(carHeader, /FlowIcon name="document"/);
});

test("Cars summary remains derived from canonical search data", () => {
  assert.match(cars, /payload\.pickupLocation/);
  assert.match(cars, /payload\.pickupDate/);
  assert.match(cars, /payload\.dropoffDate/);
  assert.match(cars, /payload\.driverAge/);
  assert.match(cars, /driverAge === "18-70" \? "Any age"/);
  assert.doesNotMatch(cars, /Paris, France|Sep 6|20 years old/);
});

test("Cars render the full filtered result set without pagination", () => {
  assert.match(cars, /\{filtered\.length\} results found/);
  assert.match(cars, /filtered\.map\(\(result,index\)/);
  assert.match(cars, /rank=\{index\}/);
  assert.doesNotMatch(cars, /const \[page|pageSize|totalPages|filtered\.slice|Page \{page\}|label="Previous"|label="Next"/);
});

test("Cars use one truthful compact price alert before the result count", () => {
  assert.equal((cars.match(/<CarPriceAlert\/>/g) ?? []).length, 1);
  assert.ok(cars.indexOf("<CarPriceAlert/>") < cars.indexOf("results found"));
  const alert = cars.slice(cars.indexOf("function CarPriceAlert"));
  assert.match(alert, /<Bell/); assert.match(alert, /<Switch/); assert.match(alert, /Track rental car prices/);
  assert.match(alert, /disabled value=\{false\}/);
  assert.doesNotMatch(alert, /Rental car price alerts<|label="Track prices"|alertIcon/);
});
