import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { FlightLeg, FlightSearchParams, NormalizedFlightResult } from "./types";
import { getPrisma } from "./prisma";
import { createFlightResultCache, createPrismaFlightCacheBackend, toFlightDetailsOffer } from "./searchCache";
const testUrl = process.env.FLIGHT_CACHE_TEST_DATABASE_URL;
if (testUrl) {
 const target = new URL(testUrl);
 assert.ok(["localhost", "127.0.0.1", "postgres"].includes(target.hostname) && /(?:_test|_ci)(?:$|_)/.test(target.pathname), "Flight cache fixtures require an isolated local test database");
}
const oneWaySearch: FlightSearchParams = {
  tripType: "one-way",
  origin: "LHR",
  destination: "JFK",
  departureDate: "2027-01-01",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

function leg(origin: string, destination: string, date: string, index = 0): FlightLeg {
  const departureTime = `${date}T10:00:00Z`;
  const arrivalTime = `${date}T12:00:00Z`;
  return {
    direction: "leg",
    legIndex: index,
    originAirport: origin,
    destinationAirport: destination,
    departureTime,
    arrivalTime,
    duration: "2h",
    durationMinutes: 120,
    stops: 0,
    layovers: [],
    segments: [{
      originAirport: origin,
      destinationAirport: destination,
      departureTime,
      arrivalTime,
      airlineName: "Provider Air",
      flightNumber: `PA${100 + index}`,
    }],
  };
}

const flight = (
  id: string,
  expiresAt: number,
  legs: FlightLeg[] = [leg("LHR", "JFK", "2027-01-01")],
): NormalizedFlightResult => ({
  id,
  provider: "Duffel",
  providerOfferId: `offer-${id}`,
  providerExpiresAt: expiresAt,
  rawProviderReference: { providerResourceIds: ["must-not-be-persisted"] },
  airlineName: "Provider Air",
  originAirport: legs[0].originAirport,
  destinationAirport: legs.at(-1)!.destinationAirport,
  departureTime: legs[0].departureTime,
  arrivalTime: legs.at(-1)!.arrivalTime,
  duration: "2h",
  durationMinutes: 120 * legs.length,
  stops: 0,
  layovers: [],
  legs,
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "refund",
  price: 100,
  currency: "EUR",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});


test("complete flight cohorts certify and survive independent readers on disposable PostgreSQL", {skip: !testUrl}, async t => {
 const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = testUrl;
 const db = getPrisma(); const prefix = "f2-fixture-" + randomUUID() + "-";
 t.after(async () => {
  await db.flightResultCache.deleteMany({where:{publicResultId:{startsWith:prefix}}}); await db.$disconnect();
  if(previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
 });
 for(const count of [120,1000,2758,5000]) {
  const now = Date.now();
  const rows = Array.from({length:count}, (_,i)=>({...flight(prefix+count+"-"+i,now+1800000),price:100+i%450}));
  const writer = createFlightResultCache(createPrismaFlightCacheBackend()); const started = performance.now();
  const certificate = await writer.remember(rows,now,oneWaySearch); const publicationMs = performance.now()-started;
  assert.equal(certificate.persisted,true);
  assert.equal(await db.flightResultCache.count({where:{publicResultId:{startsWith:prefix+count+"-"}}}),count);
  const reader = createFlightResultCache(createPrismaFlightCacheBackend());
  for(const selected of [rows[0],rows.at(-1)!]) {
   const recovered = await reader.get(selected.id,now+1);
   const {rawProviderReference: _raw,...expected} = selected; void _raw;
   assert.deepEqual(recovered,expected); assert.deepEqual(await reader.getSearch(selected.id,now+1),oneWaySearch);
   assert.equal(toFlightDetailsOffer(recovered!).id,selected.id);
  }
  console.info("[flight-cache:isolated-profile]",{synthetic:true,count,publicationMs});
 }
});
