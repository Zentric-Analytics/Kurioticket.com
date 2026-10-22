import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  PartnerConfirmationPayloadError,
  parsePartnerBookingConfirmation,
  verifiesPartnerConfirmationSignature,
} from "./partnerBookingConfirmation";

const secret = "this-is-a-test-only-partner-confirmation-secret";
const now = Date.parse("2026-10-22T15:30:00.000Z");

test("a signed partner confirmation maps only the trusted My Trips fields", () => {
  const result = parsePartnerBookingConfirmation(payload());
  assert.deepEqual(result, {
    userId: "user-123",
    partnerConversionId: "partner-conversion-123",
    providerName: "Example Provider",
    providerConfirmationCode: "ABC-123",
    providerTripId: "provider-trip-456",
    providerManageUrl: "https://provider.example/manage/ABC-123",
    tripType: "FLIGHT",
    status: "UPCOMING",
    source: "PARTNER_CONFIRMATION",
    origin: "LOS",
    destination: "LHR",
    departureDate: new Date("2026-11-01T09:00:00.000Z"),
    returnDate: new Date("2026-11-12T11:00:00.000Z"),
    travelerCount: 2,
    currency: "USD",
    totalAmount: 425.5,
    confirmationOccurredAt: new Date("2026-10-22T15:29:00.000Z"),
  });
});

test("partner confirmations reject malformed, unsafe, and impossible itinerary data", () => {
  for (const invalid of [
    { ...payload(), returnAt: "2026-10-01T11:00:00.000Z" },
    { ...payload(), providerManageUrl: "javascript:alert(1)" },
    { ...payload(), travelerCount: 0 },
    { ...payload(), currency: "US" },
    { ...payload(), customer: { userId: "user\u0000-123" } },
    { ...payload(), tripType: "train" },
    { ...payload(), departureAt: "2026-02-30T09:00:00.000Z" },
    { ...payload(), departureAt: "2026-11-01T24:00:00.000Z" },
  ]) {
    assert.throws(() => parsePartnerBookingConfirmation(invalid), PartnerConfirmationPayloadError);
  }
});

test("signature verification binds the exact body, timestamp, and configured secret", () => {
  const rawBody = JSON.stringify(payload());
  const timestamp = String(Math.floor(now / 1_000));
  const signature = signed(timestamp, rawBody);

  assert.equal(verifiesPartnerConfirmationSignature({ rawBody, timestamp, signature, secret, now }), true);
  assert.equal(verifiesPartnerConfirmationSignature({ rawBody: `${rawBody} `, timestamp, signature, secret, now }), false);
  assert.equal(verifiesPartnerConfirmationSignature({ rawBody, timestamp: String(Math.floor(now / 1_000) - 301), signature, secret, now }), false);
  assert.equal(verifiesPartnerConfirmationSignature({ rawBody, timestamp, signature: "sha256=00", secret, now }), false);
  const oversizedBody = "é".repeat(32_769);
  assert.equal(verifiesPartnerConfirmationSignature({ rawBody: oversizedBody, timestamp, signature: signed(timestamp, oversizedBody), secret, now }), false);
});


test("partner confirmation rejects occurredAt values beyond the request clock skew", () => {
  const value = { ...payload(), occurredAt: "2026-10-22T16:06:00.000Z" };
  assert.throws(
    () => parsePartnerBookingConfirmation(value, new Date("2026-10-22T16:00:00.000Z")),
    PartnerConfirmationPayloadError,
  );
});

function payload() {
  return {
    customer: { userId: "user-123" },
    occurredAt: "2026-10-22T15:29:00.000Z",
    partnerConversionId: "partner-conversion-123",
    providerName: "Example Provider",
    providerConfirmationCode: "ABC-123",
    providerTripId: "provider-trip-456",
    providerManageUrl: "https://provider.example/manage/ABC-123",
    tripType: "flight",
    status: "upcoming",
    origin: "LOS",
    destination: "LHR",
    departureAt: "2026-11-01T09:00:00.000Z",
    returnAt: "2026-11-12T11:00:00.000Z",
    travelerCount: 2,
    currency: "usd",
    totalAmount: 425.5,
  };
}

function signed(timestamp: string, rawBody: string) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}
