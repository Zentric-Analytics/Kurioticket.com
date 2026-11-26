import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityRow } from "./adminIdentityJourney";
import { mergeUnifiedActivityPage } from "./adminUnifiedActivityPage";

const at = new Date("2026-11-26T12:00:00Z");
const row = (id:string,secondsAgo:number): ActivityRow => ({
  id,at:new Date(+at-secondsAgo*1000),label:id,detail:id,
});
test("merges access and travel activity in chronology without changing the input",()=>{
  const events=[row("s-search-2",10),row("r-handoff-1",20)];
  const access=[row("d-access-1",15),row("d-access-2",10)];
  const merged=mergeUnifiedActivityPage(events,access,false,20);
  assert.deepEqual(merged.rows.map(r=>r.id),["d-access-2","s-search-2","d-access-1","r-handoff-1"]);
  assert.equal(merged.hasMore,false);
  assert.deepEqual(events.map(r=>r.id),["s-search-2","r-handoff-1"]);
  assert.deepEqual(access.map(r=>r.id),["d-access-1","d-access-2"]);
});
test("mixed pages return the exact next boundary, retaining events displaced by access",()=>{
  const events=Array.from({length:20},(_,i)=>row("s-event-"+String(i).padStart(2,"0"),i*2));
  const access=Array.from({length:21},(_,i)=>row("d-access-"+String(i).padStart(2,"0"),i*2+1));
  const first=mergeUnifiedActivityPage(events,access,false,20);
  assert.equal(first.rows.length,20);
  assert.equal(first.rows.at(-1)?.id,"d-access-09");
  assert.equal(first.hasMore,true);
  const boundary=first.rows.at(-1)!;
  const after=(r:ActivityRow)=>+r.at < +boundary.at || (+r.at===+boundary.at && r.id.localeCompare(boundary.id)>0);
  const second=mergeUnifiedActivityPage(events.filter(after),access.filter(after),false,20);
  assert.equal(second.rows[0].id,"s-event-10");
  assert.equal(second.hasMore,true);
  const ids=[...first.rows,...second.rows].map(r=>r.id);
  assert.equal(new Set(ids).size,40);
});
test("an exact terminal page does not invent a next page, but upstream continuation is preserved",()=>{
  const events=Array.from({length:20},(_,i)=>row("s-event-"+i,i));
  assert.equal(mergeUnifiedActivityPage(events,[],false,20).hasMore,false);
  assert.equal(mergeUnifiedActivityPage(events,[],true,20).hasMore,true);
  assert.deepEqual(mergeUnifiedActivityPage([],[],false,20),{rows:[],hasMore:false});
});
