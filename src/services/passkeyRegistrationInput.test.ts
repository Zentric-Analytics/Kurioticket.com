import assert from "node:assert/strict";
import test from "node:test";
import { verifyRegistration } from "./passkeyService";

const principal = { userId: "input-test", email: "input@example.invalid", accountSessionId: "input-session" };

for (const [name, body] of Object.entries({
  missing: undefined,
  null: null,
  primitive: "invalid",
  array: [],
  missingResponse: {},
  arrayResponse: { response: [] },
  invalidClientData: { response: { clientDataJSON: 12 } },
  invalidAttachment: { response: { clientDataJSON: "", authenticatorAttachment: {} } },
  invalidTransports: { response: { clientDataJSON: "", transports: "usb" } },
  invalidTransportEntry: { response: { clientDataJSON: "", transports: [12] } },
  missingAuthenticatorData: { response: { clientDataJSON: "" } },
})) {
  test(`registration rejects ${name} before accessing persistence`, async () => {
    await assert.rejects(verifyRegistration(principal, body), /^Error: response$/);
  });
}
