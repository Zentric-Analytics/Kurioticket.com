import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeApplicationMetadata } from "./nativeApplicationMetadata";
test("reads installed application constants from the native module", () => {
  let reads = 0;
  assert.deepEqual(nativeApplicationMetadata(() => { reads++; return { nativeApplicationVersion: "0.3.0", nativeBuildVersion: "53" }; }),
    { applicationVersion: "0.3.0", nativeBuildVersion: "53", nativeMetadataAvailable: true });
  assert.equal(reads, 1);
});
test("missing native metadata cannot be replaced with an OTA build claim", () => {
  for (const load of [() => null, () => { throw new Error("private diagnostic text"); }]) {
    assert.deepEqual(nativeApplicationMetadata(load), { applicationVersion: null, nativeBuildVersion: null, nativeMetadataAvailable: false });
  }
});
test("rejects arbitrary native text", () => {
  assert.deepEqual(nativeApplicationMetadata(() => ({ nativeBuildVersion: "https://private.example/token", nativeApplicationVersion: { secret: true } })),
    { nativeBuildVersion: null, applicationVersion: null, nativeMetadataAvailable: true });
});
