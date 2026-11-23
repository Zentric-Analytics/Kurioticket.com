import assert from "node:assert/strict";
import test from "node:test";
import { authenticatorDataFromAttestationObject } from "./passkeys";

function attestationObjectWithAuthData(authenticatorData: Buffer) {
  if (authenticatorData.length >= 24) throw new Error("Test fixture only supports short byte strings.");
  return Buffer.concat([
    Buffer.from([0xa1, 0x68]),
    Buffer.from("authData"),
    Buffer.from([0x40 + authenticatorData.length]),
    authenticatorData,
  ]).toString("base64url");
}

test("extracts authenticator data from a native registration attestation object", () => {
  const authenticatorData = Buffer.from([1, 2, 3]);
  assert.equal(
    authenticatorDataFromAttestationObject(attestationObjectWithAuthData(authenticatorData)),
    authenticatorData.toString("base64url"),
  );
});

test("rejects malformed attestation objects and maps without authData", () => {
  assert.throws(
    () => authenticatorDataFromAttestationObject(Buffer.from([0x01]).toString("base64url")),
    /Invalid attestation object|Unsupported CBOR/,
  );
  const mapWithoutAuthData = Buffer.concat([
    Buffer.from([0xa1, 0x63]),
    Buffer.from("fmt"),
    Buffer.from([0x64]),
    Buffer.from("none"),
  ]).toString("base64url");
  assert.throws(() => authenticatorDataFromAttestationObject(mapWithoutAuthData), /Invalid attestation object/);
});
