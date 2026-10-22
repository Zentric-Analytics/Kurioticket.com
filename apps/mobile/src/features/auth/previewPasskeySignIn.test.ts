import assert from "node:assert/strict";
import test from "node:test";
import { completePreviewPasskeySignIn, isIOSPreviewPasskeyEnabled, safePasskeyFailureDetails, previewPasskeyErrorMessage } from "./previewPasskeySignIn";
import { normalizePasskeyAssertion } from "../passkeys/passkeyAssertion";

const credential = {
  id: "_-AB", rawId: "_-AB", type: "public-key",
  response: { clientDataJSON: "Y2xpZW50", authenticatorData: "YXV0aA", signature: "_-8", userHandle: "dXNlcg" },
  authenticatorAttachment: "platform", clientExtensionResults: {},
};
const result = { session: { token: "test-token", expires: "2099-01-01T00:00:00Z" }, user: { id: "user", email: "test@example.test" } };

test("Fabric event metadata is removed, all assertion bytes survive JSON, and persistence precedes completion", async () => {
  const stages: string[] = [];
  const event = { nativeEvent: { ...credential, target: 73 }, target: 73 };
  const received = await completePreviewPasskeySignIn(event.nativeEvent, {
    trace: (stage) => stages.push(stage),
    verify: async (assertion) => {
      assert.deepEqual(JSON.parse(JSON.stringify(assertion)), credential);
      return result;
    },
    persist: async (session) => { assert.deepEqual(session, result); stages.push("storage_and_auth_event"); },
  });
  assert.equal(received, result);
  assert.deepEqual(stages, ["assertion_received", "assertion_normalized", "verification_succeeded", "session_persisting", "storage_and_auth_event", "session_persisted"]);
  assert.equal(event.nativeEvent.target, 73);
});

test("missing assertion fields fail before verification, including a missing bridge payload", async () => {
  for (const input of [undefined, {}, ...["clientDataJSON", "authenticatorData", "signature"].map((field) => ({ ...credential, response: { ...credential.response, [field]: "" } }))]) {
    await assert.rejects(completePreviewPasskeySignIn(input, {
      trace: () => {}, verify: async () => assert.fail("must not verify"), persist: async () => assert.fail("must not persist"),
    }), /credential|invalid/);
  }
});

test("backend rejection and storage rejection propagate rather than reporting success", async () => {
  const rejection = new Error("verification rejected");
  await assert.rejects(completePreviewPasskeySignIn(credential, {
    trace: () => {}, verify: async () => { throw rejection; }, persist: async () => assert.fail("must not persist"),
  }), (error) => error === rejection);
  const stages: string[] = [];
  await assert.rejects(completePreviewPasskeySignIn(credential, {
    trace: (stage) => stages.push(stage), verify: async () => result, persist: async () => { throw new Error("storage failed"); },
  }), /storage failed/);
  assert.equal(stages.at(-1), "session_persisting");
});

test("malformed successful responses cannot establish a session", async () => {
  for (const invalid of [{}, { ...result, session: { ...result.session, token: "" } }, { ...result, session: { ...result.session, expires: "invalid" } }]) {
    await assert.rejects(completePreviewPasskeySignIn(credential, {
      trace: () => {}, verify: async () => invalid as typeof result, persist: async () => assert.fail("must not persist"),
    }), /invalid session/);
  }
});

test("nullable and absent user handles serialize as null", async () => {
  for (const userHandle of [null, undefined]) {
    await completePreviewPasskeySignIn({ ...credential, response: { ...credential.response, userHandle } }, {
      trace: () => {}, verify: async (assertion) => { assert.equal(assertion.response.userHandle, null); return result; }, persist: async () => {},
    });
  }
});

test("only iOS Preview enables the new verification path", () => {
  for (const platform of ["ios", "android", "web"]) {
    for (const preview of [true, false, undefined, "true"]) {
      assert.equal(isIOSPreviewPasskeyEnabled(platform, preview), platform === "ios" && preview === true);
    }
  }
});

test("normalization preserves every supplied credential value and extension result without mutating the event", () => {
  const supplied = {
    ...credential,
    response: { ...credential.response, userHandle: "", signature: "Ab_09-zY" },
    clientExtensionResults: { target: "extension-value", appid: false, nested: { value: "unchanged" } },
  };
  const event = { ...supplied, target: 73 };
  const before = JSON.stringify(event);
  assert.deepEqual(normalizePasskeyAssertion(event), supplied);
  assert.equal(JSON.stringify(event), before);
  assert.deepEqual(normalizePasskeyAssertion(supplied), supplied);
});

test("diagnostics allowlist status/code and error UI uses fixed copy only", () => {
  const secret = "credential-token-signature-secret";
  assert.deepEqual(safePasskeyFailureDetails(401, "INVALID_ASSERTION"), { status: 401, code: "INVALID_ASSERTION" });
  assert.deepEqual(safePasskeyFailureDetails(secret, secret), { status: 0, code: "UNKNOWN" });
  assert.deepEqual(safePasskeyFailureDetails(NaN, { secret }), { status: 0, code: "UNKNOWN" });
  for (const status of [undefined, 0, 400, 401, 429, 503]) {
    assert.doesNotMatch(previewPasskeyErrorMessage(status), new RegExp(secret));
  }
  assert.match(previewPasskeyErrorMessage(429), /Too many/);
  assert.match(previewPasskeyErrorMessage(401), /use email/);
});
