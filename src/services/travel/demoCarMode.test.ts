import assert from "node:assert/strict";
import test from "node:test";
import { getCarResultsMode } from "@/lib/env";
import type { CarSearchParams } from "@/lib/cars/types";
import { getCarDetails, searchCars } from "@/services/travel/carAggregator";
const search: CarSearchParams={pickupLocation:"Sample Airport",dropoffLocation:"Sample City",pickupDate:"2026-08-01",pickupTime:"10:00",dropoffDate:"2026-08-04",dropoffTime:"10:00",driverAge:"30"};
async function env<T>(value:string|undefined,fn:()=>T|Promise<T>){const old=process.env.CARS_RESULTS_MODE; if(value===undefined)delete process.env.CARS_RESULTS_MODE;else process.env.CARS_RESULTS_MODE=value;try{return await fn()}finally{if(old===undefined)delete process.env.CARS_RESULTS_MODE;else process.env.CARS_RESULTS_MODE=old}}
test("cars mode is live by default and only exact demo enables demo",async()=>{assert.equal(await env(undefined,getCarResultsMode),"live");assert.equal(await env("demo",getCarResultsMode),"demo");assert.equal(await env("DEMO",getCarResultsMode),"live");assert.equal(await env("unexpected",getCarResultsMode),"live")});
test("live mode never returns or falls back to demo",()=>env("live",async()=>{const result=await searchCars(search);assert.equal(result.mode,"live");assert.equal(result.status,"unavailable");assert.deepEqual(result.results,[])}));
test("demo mode is explicit and provider safe",()=>env("demo",async()=>{const result=await searchCars(search);assert.equal(result.mode,"demo");assert.equal(result.status,"available");assert.equal(result.results.length,11);assert.ok(result.results.every(car=>car.isDemo&&car.offers.every(offer=>!offer.bookingUrl)&&/Demo|Sample/.test(car.rentalCompanyName)&&car.offers.every(offer=>/Demo|Sample/.test(offer.bookingProviderName))))}));
test("details only returns an exact known demo id",()=>env("demo",async()=>{const result=await searchCars(search);assert.equal(await getCarDetails("unknown",search),null);const found=await getCarDetails(result.results[2].id,search);assert.equal(found?.id,result.results[2].id)}));
