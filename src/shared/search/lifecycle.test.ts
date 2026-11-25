import assert from "node:assert/strict";
import test from "node:test";
import { displayInventory, searchLifecycle, authorizedDisplayPhase } from "./lifecycle";
import { inventoryAccounting } from "./inventory";
import {searchRequestDeadline} from "./deadline";

test("shared lifecycle distinguishes progress, empty, unavailable and customer filters",()=>{
  for(const phase of ["resolving","invalid","unsupported","expired","cancelled"] as const) assert.equal(searchLifecycle({count:0,phase}),phase);
  assert.equal(searchLifecycle({count:0,phase:"searching"}),"searching");
  assert.equal(searchLifecycle({count:0,continuation:true}),"searching");
  assert.equal(searchLifecycle({count:0,status:"empty",completed:true}),"empty");
  assert.equal(searchLifecycle({count:0,status:"unavailable"}),"unavailable");
  assert.equal(searchLifecycle({count:1,status:"unavailable"}),"available");
  assert.equal(searchLifecycle({count:1,visibleCount:0}),"filter-empty");
  assert.equal(searchLifecycle({count:1,continuation:true}),"partial");
});

test("pending authorization cannot mean filter-empty and independent live rows survive revocation",()=>{
  const rows=[{id:"sandbox",sandboxDisplayOnly:true,sandboxRevision:"r1"}];
  const pending=displayInventory(rows,null,false);
  assert.deepEqual(pending.results,[]);
  assert.deepEqual(authorizedDisplayPhase(0,pending.authorization),{pending:true,unavailable:false});
  assert.equal(searchLifecycle({count:0,authorization:pending.authorization}),"pending-authorization");
  assert.equal(displayInventory(rows,{enabled:true,revision:"r1"},true).results.length,1);
  assert.equal(displayInventory(rows,{enabled:true,revision:"r2"},true).authorization,"restricted");
  const independent=displayInventory([...rows,{id:"live"}],{enabled:false,revision:"r2"},true);
  assert.deepEqual(independent.results.map(row=>row.id),["live"]);
  assert.deepEqual(authorizedDisplayPhase(1,independent.authorization),{pending:false,unavailable:false});
  assert.equal(displayInventory(rows,null,true).authorization,"unavailable");
});

test("inventory stage checks detect identity substitution even when counts match",()=>{
  assert.throws(()=>inventoryAccounting([{stage:"normalized",rows:[{id:"one"}]},{stage:"public",rows:[{id:"other"}]}]),/identity/);
  assert.deepEqual(inventoryAccounting([{stage:"normalized",rows:[{id:"one"},{id:"one"}]},{stage:"deduplicated",rows:[{id:"one"}]}]).map(stage=>stage.uniqueCount),[1,1]);
});

test("browser deadline aborts bounded transport and preserves parent cancellation",async()=>{
  const parent=new AbortController();
  const deadline=searchRequestDeadline(parent.signal,5);
  await new Promise<void>(resolve=>deadline.signal.addEventListener("abort",()=>resolve(),{once:true}));
  assert.equal(deadline.signal.reason,"search_timeout");deadline.dispose();
  const cancelled=searchRequestDeadline(parent.signal,100);parent.abort("navigation");
  assert.equal(cancelled.signal.reason,"navigation");cancelled.dispose();
});
