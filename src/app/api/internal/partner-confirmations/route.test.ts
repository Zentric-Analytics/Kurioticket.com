import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { MyTripIngestionOwnershipError } from "@/services/myTripService";
import { createPartnerConfirmationHandler } from "./route";

const secret = "this-is-a-test-only-partner-confirmation-secret";
const now = Date.parse("2026-10-22T15:30:00.000Z");

test("partner confirmation requires an explicitly configured shared secret", async () => {
  const POST = createPartnerConfirmationHandler({ secret: () => "", now: () => now, ingest: async () => neverIngested() });
  const response = await POST(new Request("https://kurioticket.test/api/internal/partner-confirmations", { method: "POST" }));
  assert.equal(response.status, 503);
});

test("signature verification happens before payload parsing or trip ingestion", async () => {
  let ingested = false;
  const POST = createPartnerConfirmationHandler({
    secret: () => secret,
    now: () => now,
    ingest: async () => { ingested = true; return { id: "trip-1" } as never; },
  });
  const response = await POST(new Request("https://kurioticket.test/api/internal/partner-confirmations", {
    method: "POST",
    headers: { "x-kt-confirmation-timestamp": String(Math.floor(now / 1_000)), "x-kt-confirmation-signature": "sha256=00" },
    body: "not-json",
  }));
  assert.equal(response.status, 401);
  assert.equal(ingested, false);
});

test("a chunked body exceeding 64 KiB is rejected before it is buffered or ingested", async () => {
  let ingested = false;
  const POST = createPartnerConfirmationHandler({
    secret: () => secret,
    now: () => now,
    ingest: async () => { ingested = true; return { id: "trip-1" } as never; },
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(64 * 1024 + 1)));
      controller.close();
    },
  });
  const timestamp = String(Math.floor(now / 1_000));
  const init = {
    method: "POST",
    headers: {
      "x-kt-confirmation-timestamp": timestamp,
      "x-kt-confirmation-signature": `sha256=${"0".repeat(64)}`,
    },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" };
  const response = await POST(new Request("https://kurioticket.test/api/internal/partner-confirmations", init));
  assert.equal(response.status, 413);
  assert.equal(ingested, false);
});

test("a valid signed confirmation is ingested and exposes only an acknowledgement", async () => {
  let received: unknown;
  const POST = createPartnerConfirmationHandler({
    secret: () => secret,
    now: () => now,
    ingest: async input => { received = input; return { id: "trip-accepted" } as never; },
  });
  const rawBody = JSON.stringify(payload());
  const response = await POST(request(rawBody));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, tripId: "trip-accepted" });
  assert.deepEqual(received, expectIngestion());
});

test("a signed malformed payload is rejected without trip ingestion", async () => {
  let ingested = false;
  const POST = createPartnerConfirmationHandler({
    secret: () => secret,
    now: () => now,
    ingest: async () => { ingested = true; return { id: "trip-1" } as never; },
  });
  const rawBody = JSON.stringify({ ...payload(), travelerCount: 0 });
  const response = await POST(request(rawBody));
  assert.equal(response.status, 400);
  assert.equal(ingested, false);
});

test("a partner conversion linked to another account fails closed", async () => {
  const POST = createPartnerConfirmationHandler({
    secret: () => secret,
    now: () => now,
    ingest: async () => { throw new MyTripIngestionOwnershipError(); },
  });
  const response = await POST(request(JSON.stringify(payload())));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "The confirmation is already linked to a different account.",
    errorCode: "partner_confirmation_ownership_mismatch",
  });
});

function request(rawBody: string) {
  const timestamp = String(Math.floor(now / 1_000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return new Request("https://kurioticket.test/api/internal/partner-confirmations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kt-confirmation-timestamp": timestamp,
      "x-kt-confirmation-signature": `sha256=${signature}`,
    },
    body: rawBody,
  });
}

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
    currency: "USD",
    totalAmount: 425.5,
  };
}

function expectIngestion() {
  return {
    userId: "user-123", partnerConversionId: "partner-conversion-123", providerName: "Example Provider",
    providerConfirmationCode: "ABC-123", providerTripId: "provider-trip-456", providerManageUrl: "https://provider.example/manage/ABC-123",
    tripType: "FLIGHT", status: "UPCOMING", source: "PARTNER_CONFIRMATION", origin: "LOS", destination: "LHR",
    departureDate: new Date("2026-11-01T09:00:00.000Z"), returnDate: new Date("2026-11-12T11:00:00.000Z"),
    travelerCount: 2, currency: "USD", totalAmount: 425.5, confirmationOccurredAt: new Date("2026-10-22T15:29:00.000Z"),
  };
}

function neverIngested(): never { throw new Error("The test should not ingest a trip."); }
