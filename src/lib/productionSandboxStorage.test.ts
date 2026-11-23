import assert from "node:assert/strict";
import test from "node:test";
import { displayOnlyInventory } from "@/shared/presentation/sandboxInventory";
import { writeFlightResultsSessionSnapshot, readFlightResultsSessionSnapshot } from "@/lib/flights/flightResultsSessionCache";
import { rememberHotelReturnSnapshot, readHotelReturnSnapshot } from "@/lib/hotels/hotelReturnSnapshot";
test("browser flight storage retains only live inventory in mixed results and never writes a sandbox-only snapshot",()=>{
 const entries=new Map<string,string>();let writes=0;const storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{writes++;entries.set(k,v)},removeItem:(k:string)=>{entries.delete(k)}};
 const sandbox=displayOnlyInventory({id:"sandbox:duffel:quote",provider:"Duffel"},"r1");
 writeFlightResultsSessionSnapshot("sandbox",[sandbox] as never,[],Date.now()+60000,storage);assert.equal(writes,0);
 writeFlightResultsSessionSnapshot("mixed",[{id:"live",provider:"Duffel"},sandbox] as never,[],Date.now()+60000,storage);assert.equal(writes,1);const row=readFlightResultsSessionSnapshot("mixed",storage);assert.equal(row?.results.length,1);assert.equal(row?.results[0].id,"live");assert.equal([...entries.values()].some(value=>value.includes('sandbox:duffel:quote')),false);
});
test("hotel return memory does not retain display-only inventory",()=>{const result=displayOnlyInventory({id:"kayak-sandbox:hotel",provider:"KAYAK sandbox"},"r1");rememberHotelReturnSnapshot("sandbox",[result] as never);assert.equal(readHotelReturnSnapshot("sandbox"),null);});
