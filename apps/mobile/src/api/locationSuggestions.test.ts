import assert from "node:assert/strict";
import test from "node:test";
import { parseCarLocationSuggestions, parseFlightPlaceSuggestions, searchFlightPlaces } from "./locationSuggestions";

test("flight parser validates types, normalizes codes, deduplicates, and caps results",()=>{
  const rows=Array.from({length:10},(_,index)=>({code:`A${String.fromCharCode(65+Math.floor(index/26))}${String.fromCharCode(65+index%26)}`,airport:`Airport ${index}`,city:"City",type:index===1?"city":"airport"}));
  const result=parseFlightPlaceSuggestions({suggestions:[{code:"los",airport:"Lagos",city:"Lagos",country:"Nigeria",type:"airport"},{code:"LOS",airport:"duplicate",city:"Lagos",type:"airport"},{code:"LON",airport:"All airports",city:"London",type:"city"},{code:"BAD",airport:"Bad",city:"Bad",type:"region"},...rows]});
  assert.deepEqual(result.slice(0,2),[{code:"LOS",airport:"Lagos",city:"Lagos",country:"Nigeria",type:"airport"},{code:"LON",airport:"All airports",city:"London",type:"city"}]);
  assert.equal(result.length,8); assert.throws(()=>parseFlightPlaceSuggestions([]),/Invalid airport/);
});

test("flight request encodes context and preserves AbortSignal",async()=>{
  process.env.EXPO_PUBLIC_API_BASE_URL="https://example.test";const controller=new AbortController();let url="";let signal:AbortSignal|null|undefined;
  await searchFlightPlaces("Lagos & Ikeja",{context:"destination",signal:controller.signal,fetcher:async(input,init)=>{url=String(input);signal=init?.signal;return new Response(JSON.stringify({suggestions:[]}));}});
  assert.equal(url,"https://example.test/api/flights/places?context=destination&q=Lagos+%26+Ikeja");assert.equal(signal,controller.signal);assert.doesNotMatch(url,/duffel/i);
});

test("car parser permits only verified valid rows, deduplicates, and caps results",()=>{
  const valid=Array.from({length:10},(_,i)=>({id:`city-${i}`,kind:"city",value:`City ${i}`,primaryText:`City ${i}`,secondaryText:"Country"}));
  const result=parseCarLocationSuggestions({suggestions:[{id:"airport-los",kind:"airport",value:"LOS",primaryText:"Lagos",secondaryText:"Nigeria",airportCode:"los"},{id:"custom",kind:"custom",value:"x",primaryText:"Use x",secondaryText:"Unverified typed location"},...valid]});
  assert.equal(result[0].airportCode,"LOS");assert.equal(result.length,8);assert.ok(result.every(row=>row.kind!=="custom"));assert.throws(()=>parseCarLocationSuggestions({}),/Invalid car/);
});
