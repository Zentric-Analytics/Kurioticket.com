import assert from "node:assert/strict";
import test from "node:test";
import { initializeFlightForm } from "./flightSearchModel";
const today=new Date(2026,7,1,12);
test("Flights resolves Explore destination and explicit destination precedence",()=>{ assert.equal(initializeFlightForm({destination:"Paris"},today).form.to?.code,"CDG"); assert.equal(initializeFlightForm({destination:"Paris",to:["JFK","LAX"]},today).form.to?.code,"JFK"); });
test("unknown destinations do not retain an unrelated default airport",()=>{ const result=initializeFlightForm({destination:"Unknown place"},today); assert.equal(result.form.to,undefined); assert.match(result.notice??"",/Choose a destination airport/); });
