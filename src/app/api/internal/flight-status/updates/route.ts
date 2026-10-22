import { NextResponse } from "next/server";

import {
  PartnerFlightStatusPayloadError,
  parsePartnerFlightStatus,
  recordPartnerFlightStatus,
} from "@/services/flightStatusService";
import {
  PartnerWebhookBodyTooLargeError,
  hasFreshPartnerConfirmationEnvelope,
  isConfiguredPartnerConfirmationSecret,
  readBoundedPartnerWebhookBody,
  verifiesPartnerConfirmationSignature,
} from "@/services/partnerBookingConfirmation";

export const runtime = "nodejs";

type Dependencies = {
  secret: () => string | undefined;
  now: () => number;
  record: typeof recordPartnerFlightStatus;
};

/** A provider-only status feed. It cannot create a trip or expose trip ownership. */
export function createFlightStatusUpdateHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    const secret = dependencies.secret()?.trim();
    if (!isConfiguredPartnerConfirmationSecret(secret)) {
      return NextResponse.json(
        { error: "Flight status updates are not configured.", errorCode: "flight_status_not_configured" },
        { status: 503 },
      );
    }

    const timestamp = request.headers.get("x-kt-flight-status-timestamp");
    const signature = request.headers.get("x-kt-flight-status-signature");
    if (!hasFreshPartnerConfirmationEnvelope({ timestamp, signature, now: dependencies.now() })) {
      return NextResponse.json(
        { error: "Invalid flight status signature.", errorCode: "flight_status_unauthorized" },
        { status: 401 },
      );
    }

    let rawBody: string;
    try {
      rawBody = await readBoundedPartnerWebhookBody(request);
    } catch (error) {
      if (error instanceof PartnerWebhookBodyTooLargeError) {
        return NextResponse.json(
          { error: "Flight status payload is too large.", errorCode: "flight_status_payload_too_large" },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "Invalid flight status payload.", errorCode: "flight_status_invalid_payload" },
        { status: 400 },
      );
    }

    if (!verifiesPartnerConfirmationSignature({ rawBody, timestamp, signature, secret, now: dependencies.now() })) {
      return NextResponse.json(
        { error: "Invalid flight status signature.", errorCode: "flight_status_unauthorized" },
        { status: 401 },
      );
    }

    try {
      const input = parsePartnerFlightStatus(JSON.parse(rawBody));
      const result = await dependencies.record(input);
      return NextResponse.json({ accepted: true, applied: result.applied });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof PartnerFlightStatusPayloadError) {
        return NextResponse.json(
          { error: "Invalid flight status payload.", errorCode: "flight_status_invalid_payload" },
          { status: 400 },
        );
      }
      console.error("[flight-status:update]", { outcome: "storage_unavailable" });
      return NextResponse.json(
        { error: "Unable to record the flight status update.", errorCode: "flight_status_unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createFlightStatusUpdateHandler({
  secret: () => process.env.FLIGHT_STATUS_WEBHOOK_SECRET,
  now: () => Date.now(),
  record: recordPartnerFlightStatus,
});
