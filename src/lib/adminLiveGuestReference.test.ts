import assert from "node:assert/strict";
import test from "node:test";
import { adminLiveGuestReference } from "./adminLiveGuestReference";

const secret = "synthetic-test-signing-secret-32-characters";
const a = "a".repeat(64);
const b = "b".repeat(64);

test("navigation reference is opaque, stable for a source, and distinct for another source",()=>{
  const ref = adminLiveGuestReference("staging",a,secret);
  assert.match(ref ?? "",/^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(ref,a);
  assert.equal(ref,adminLiveGuestReference("staging",a,secret));
  assert.notEqual(ref,adminLiveGuestReference("staging",b,secret));
  assert.notEqual(ref,adminLiveGuestReference("staging",a,secret+"rotated"));
});
test("only staging verified-source shape with a valid secret gets a reference",()=>{
  assert.equal(adminLiveGuestReference("production",a,secret),null);
  assert.equal(adminLiveGuestReference("staging","guest-1",secret),null);
  assert.equal(adminLiveGuestReference("staging","probe:synthetic",secret),null);
  assert.equal(adminLiveGuestReference("staging",a,undefined),null);
  assert.equal(adminLiveGuestReference("staging",a,"short"),null);
});
