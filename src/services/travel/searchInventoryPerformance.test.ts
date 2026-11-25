import assert from "node:assert/strict";
import test from "node:test";
import {buildStaticHotelResults} from "./staticHotelResults";
import {buildStaticCarResults} from "./staticCarResults";
import {groupHotelOffers} from "@/lib/hotels/groupHotelOffers";
import {groupKayakCarResults,sortCarResults} from "@/lib/cars/carResults";
import {encodeCohort,decodeCohort} from "@/lib/search/cohortEncoding";
import {inventoryAccounting} from "@/shared/search/inventory";

test("large cohorts preserve rate/offer identities through grouping, serialization and cache encoding",async()=>{
 const query={destination:"New York",checkIn:"2026-12-25",checkOut:"2026-12-29",guests:2,rooms:1};
 const hotel=buildStaticHotelResults(query)[0];
 const rates=Array.from({length:10427},(_,index)=>({...hotel,id:`fixture:rate:${index}`,provider:"Fixture hotels",propertyGroupId:`fixture:property:${Math.floor(index/8)}`}));
 let started=performance.now();const json=JSON.stringify(rates);const stringifyMs=performance.now()-started;
 started=performance.now();const parsed=JSON.parse(json) as typeof rates;const parseMs=performance.now()-started;
 started=performance.now();const groups=groupHotelOffers(parsed);const hotelGroupMs=performance.now()-started;
 assert.equal(groups.length,1304);
 assert.deepEqual(new Set(groups.flatMap(group=>group.map(row=>row.id))),new Set(rates.map(row=>row.id)));
 started=performance.now();const encoded=await encodeCohort(rates,"00000000-0000-4000-8000-000000000001");const encodeMs=performance.now()-started;
 started=performance.now();const restored=await decodeCohort(encoded.manifest,encoded.chunks);const decodeMs=performance.now()-started;
 assert.equal(restored.length,rates.length);
 const carQuery={pickupLocation:"LHR",dropoffLocation:"LHR",pickupDate:"2026-12-25",dropoffDate:"2026-12-29",pickupTime:"10:00",dropoffTime:"10:00",driverAge:"25"};
 const car=buildStaticCarResults(carQuery)[0];
 const offers=Array.from({length:2547},(_,index)=>({...car,id:`fixture:car:${index%549}`,offers:[{...car.offers[0],id:`fixture:offer:${index}`,totalPrice:index+1}]}));
 started=performance.now();const cars=sortCarResults(groupKayakCarResults(offers),"lowestTotal");const carProcessingMs=performance.now()-started;
 assert.equal(cars.length,549);assert.equal(new Set(cars.flatMap(row=>row.offers.map(offer=>offer.id))).size,2547);
 inventoryAccounting([{stage:"normalized",rows:offers},{stage:"grouped",rows:cars}]);
 console.info("[fixture-performance]",{rates:rates.length,properties:groups.length,carGroups:cars.length,carOffers:2547,jsonBytes:Buffer.byteLength(json),stringifyMs,parseMs,hotelGroupMs,encodeMs,decodeMs,carProcessingMs,configuredCarInitialRowsBefore:549,configuredCarInitialRowsAfter:10});
});
