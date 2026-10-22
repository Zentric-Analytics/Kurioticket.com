import assert from "node:assert/strict";
import test from "node:test";
import { getAdminIdentityPagination } from "./adminIdentityPagination";

test("identities beyond the old 7,500-row ceiling remain reachable", () => {
  const result = getAdminIdentityPagination("501", 7500, 1);
  assert.equal(result.page, 501);
  assert.equal(result.pageCount, 501);
  assert.equal(result.userTake, 0);
  assert.equal(result.guestOffset, 0);
  assert.equal(result.guestsTake, 15);
});

test("pagination crosses from registered users to guests without skipping or duplicating rows", () => {
  const ids = Array.from({ length: 17 }, (_, i) => `user-${i}`);
  const guests = Array.from({ length: 22 }, (_, i) => `guest-${i}`);
  const visited: string[] = [];
  for (const page of ["1", "2", "3"]) {
    const p = getAdminIdentityPagination(page, ids.length, guests.length);
    visited.push(...ids.slice(p.userOffset, p.userOffset + p.userTake));
    visited.push(...guests.slice(p.guestOffset, p.guestOffset + p.guestsTake));
  }
  assert.deepEqual(visited, [...ids, ...guests]);
  assert.equal(new Set(visited).size, 39);
});

test("out-of-range and malformed page values yield valid bounded database offsets", () => {
  for (const value of [undefined, "", "0", "-10", "NaN", "1.5", "2x"]) {
    assert.equal(getAdminIdentityPagination(value, 17, 0).page, 1);
  }
  for (const value of ["999999999999999999999999999999999", "3"]) {
    assert.equal(getAdminIdentityPagination(value, 17, 0).page, 2);
  }
  const empty = getAdminIdentityPagination("99", 0, 0);
  assert.equal(empty.page, 1);
  assert.equal(empty.userOffset, 0);
  assert.equal(empty.guestOffset, 0);
});
