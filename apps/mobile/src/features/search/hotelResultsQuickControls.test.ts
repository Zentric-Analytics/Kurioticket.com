import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");
test("Hotel rail matches Filter Price Stars Amenities",()=>{const rail=screen.slice(screen.indexOf("const filterRail"),screen.indexOf("const resultContent"));const labels=["Filter","Price","Stars","Amenities"].map(x=>rail.indexOf(`label=\"${x}\"`));assert.ok(labels.every(x=>x>=0)&&labels.every((x,i)=>i===0||labels[i-1]<x));assert.match(rail,/hotelOptions\.price \?/);assert.match(rail,/openHotelQuickFilter\("price"\)/);assert.match(rail,/starRatings\.length \|\| undefined/);assert.match(rail,/facilities\.length \|\| undefined/);assert.doesNotMatch(rail,/hotelSortLabel|Cheapest/)});
test("anchored plumbing is removed and default sorting remains",()=>{for(const stale of ["measureInWindow","hotelShortcutAnchor","sortShortcutRef","starsShortcutRef","amenitiesShortcutRef","HotelResultsShortcutAnchor"])assert.doesNotMatch(screen,new RegExp(stale));assert.match(screen,/sortHotelsForResults\([\s\S]*defaultHotelSort/);assert.match(screen,/function FlightSortModal|<FlightSortModal/)});
