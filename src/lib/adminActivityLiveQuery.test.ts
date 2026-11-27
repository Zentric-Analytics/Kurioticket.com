import assert from "node:assert/strict";
import test from "node:test";
import { liveActivityQueryParams, normalizeLiveUserActivityQuery } from "./adminActivityLiveQuery";
import { parseActivityFilters, encodeActivityCursor, decodeActivityCursor } from "./adminIdentityActivity";

const first = new Date("2026-11-26T23:59:50.000Z");
const later = new Date("2026-11-27T00:00:10.000Z");

test("newest all-time and preset activity advance their cutoff on an automatic refresh", () => {
  const all = normalizeLiveUserActivityQuery({range:"all",to:first.toISOString()},later,"UTC");
  assert.equal(all.from,undefined);
  assert.equal(all.to,later.toISOString());
  const today = normalizeLiveUserActivityQuery({range:"today",from:"2026-11-26T00:00:00.000Z",to:first.toISOString()},later,"UTC");
  assert.equal(today.from,"2026-11-27T00:00:00.000Z");
  assert.equal(today.to,later.toISOString());
  const seven = normalizeLiveUserActivityQuery({range:"7d",from:"2026-11-19T23:59:50.000Z",to:first.toISOString()},later,"UTC");
  assert.equal(seven.from,"2026-11-20T00:00:10.000Z");
  assert.equal(seven.to,later.toISOString());
});

test("older activity pages retain their exact seek scope across refresh and midnight", () => {
  const raw = normalizeLiveUserActivityQuery({range:"today"},first,"UTC");
  const parsed = parseActivityFilters(raw,"UTC");
  assert.ok(parsed.ok);
  const cursor = encodeActivityCursor({id:"s-qa-record-0001",at:new Date("2026-11-26T20:00:00.000Z")},"user","qa-account-0001",parsed.filters,"staging");
  const refreshed = normalizeLiveUserActivityQuery({...raw,cursor},later,"UTC");
  assert.equal(refreshed.from,raw.from);
  assert.equal(refreshed.to,raw.to);
  const next = parseActivityFilters(refreshed,"UTC");
  assert.ok(next.ok);
  assert.ok(decodeActivityCursor(cursor,"user","qa-account-0001",next.filters,"staging"));
});

test("custom windows and malformed windows are not broadened by live refresh", () => {
  const custom = {range:"custom",from:"2026-11-20",to:"2026-11-24",q:"Lagos"};
  assert.deepEqual(normalizeLiveUserActivityQuery(custom,later,"Africa/Lagos"),custom);
  const invalid = normalizeLiveUserActivityQuery({range:"all",from:"not-a-date",to:first.toISOString()},later,"UTC");
  assert.equal(invalid.from,"not-a-date");
  assert.equal(parseActivityFilters(invalid).ok,false);
});

test("newest navigation drops generated cutoffs while retaining the selected scope and safe return context", () => {
  const input = {range:"7d",from:"2026-11-19T23:59:50.000Z",to:first.toISOString(),tab:"searches",stage:"RESULTS_VIEWED",q:"Lagos",product:"FLIGHT",usersReturn:"/admin/users/online?platform=android&page=2"};
  assert.deepEqual(liveActivityQueryParams(input),{range:"7d",tab:"searches",stage:"RESULTS_VIEWED",q:"Lagos",product:"FLIGHT",usersReturn:input.usersReturn});
  assert.deepEqual(liveActivityQueryParams({...input,range:"custom"}),{...input,range:"custom"});
});
