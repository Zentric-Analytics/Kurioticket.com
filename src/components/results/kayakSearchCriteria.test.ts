import test from "node:test";
import assert from "node:assert/strict";
import { kayakSearchCriteria } from "./kayakSearchCriteria";
test("filter, sort and page changes preserve the provider search identity", () => {
  const search = {origin:"BOS", destination:"JFK", adults:"2", departureDate:"2026-10-12"};
  assert.deepEqual(kayakSearchCriteria({...search,fPrice:"500",fDuration:"90",sort:"fastest",page:"2"}),kayakSearchCriteria(search));
  assert.deepEqual(kayakSearchCriteria({destination:"JFK",origin:"BOS",adults:"2",departureDate:"2026-10-12"}),kayakSearchCriteria(search));
  assert.notDeepEqual(kayakSearchCriteria({...search,adults:"3"}),kayakSearchCriteria(search));
});
