import assert from "node:assert/strict";
import test from "node:test";
import {currencySnapshotExpiry,CLIENT_FX_REVALIDATE_MS} from "./freshness";
test("FX honors source expiry, rejects stale payloads and bounds legacy-client caching",()=>{
 const now=Date.parse("2026-11-24T12:00:00Z"),fetchedAt=new Date(now).toISOString();
 assert.equal(currencySnapshotExpiry({fetchedAt},now),now+CLIENT_FX_REVALIDATE_MS);
 assert.equal(currencySnapshotExpiry({fetchedAt,cacheExpiresAt:new Date(now+1000).toISOString()},now),now+1000);
 assert.equal(currencySnapshotExpiry({fetchedAt,stale:true},now),now);
 assert.equal(currencySnapshotExpiry({fetchedAt:"invalid"},now),now);
 assert.equal(currencySnapshotExpiry({fetchedAt:new Date(now+120000).toISOString()},now),now);
});
