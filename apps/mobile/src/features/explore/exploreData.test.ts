import assert from "node:assert/strict";
import test from "node:test";
import { FEATURED_DESTINATIONS, INTERESTS } from "./exploreData";
test("featured and maintained interests remain a small curated set",()=>{assert.equal(FEATURED_DESTINATIONS.length,4);assert.equal(INTERESTS.length,4);for(const item of FEATURED_DESTINATIONS)assert.ok(item.destination.id);});
