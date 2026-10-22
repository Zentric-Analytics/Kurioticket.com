import { NextResponse } from "next/server";

import { MyTripIngestionOwnershipError, upsertPartnerConfirmedMyTrip } from "@/services/myTripService";
import {
  PartnerConfirmationPayloadError,
  isConfiguredPartnerConfirmationSecret,
  parsePartnerBookingConfirmation,
  verifiesPartnerConfirmationSignature,
} from "@/services/partnerBookingConfirmation";

export const runtime = "nodejs";

type Dependencies = {
  secret: () => string | undefined;
  now: () => number;
  ingest: typeof upsertPartnerConfirmedMyTrip;
};

/**
 * This is a server-to-server boundary for an approved partner callback. It is
 * not a customer trip-import API and must never be called by the frontend.
 */
export function createPartnerConfirmationHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    const secret = dependencies.secret()?.trim();
    if (!isConfiguredPartnerConfirmationSecret(secret)) {
      return NextResponse.json(
        { error: "Partner confirmations are not configured.", errorCode: "partner_confirmation_not_configured" },
        { status: 503 },
      );
    }

    const rawBody = await request.text();
    if (!verifiesPartnerConfirmationSignature({
      rawBody,
      timestamp: request.headers.get("x-kt-confirmation-timestamp"),
      signature: request.headers.get("x-kt-confirmation-signature"),
      secret,
      now: dependencies.now(),
    })) {
      return NextResponse.json(
        { error: "Invalid partner confirmation signature.", errorCode: "partner_confirmation_unauthorized" },
        { status: 401 },
      );
    }

    let confirmation;
    try {
      confirmation = parsePartnerBookingConfirmation(JSON.parse(rawBody));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof PartnerConfirmationPayloadError) {
        return NextResponse.json(
          { error: "Invalid partner confirmation payload.", errorCode: "partner_confirmation_invalid_payload" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Unable to verify the partner confirmation.", errorCode: "partner_confirmation_verification_failed" },
        { status: 500 },
      );
    }

    try {
      const trip = await dependencies.ingest(confirmation);
      return NextResponse.json({ accepted: true, tripId: trip.id });
    } catch (error) {
      if (error instanceof MyTripIngestionOwnershipError) {
        return NextResponse.json(
          { error: "The confirmation is already linked to a different account.", errorCode: "partner_confirmation_ownership_mismatch" },
          { status: 409 },
        );
      }
      if (error instanceof PartnerConfirmationPayloadError || error instanceof TypeError) {
        return NextResponse.json(
          { error: "Invalid partner confirmation payload.", errorCode: "partner_confirmation_invalid_payload" },
          { status: 400 },
        );
      }
      console.error("[partner-confirmation]", { outcome: "ingestion_failed" });
      return NextResponse.json(
        { error: "Unable to record the partner confirmation.", errorCode: "partner_confirmation_unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createPartnerConfirmationHandler({
  secret: () => process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET,
  now: () => Date.now(),
  ingest: upsertPartnerConfirmedMyTrip,
});
