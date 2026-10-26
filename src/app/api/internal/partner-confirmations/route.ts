import { NextResponse } from "next/server";

import { MyTripIngestionOwnershipError, upsertPartnerConfirmedMyTrip } from "@/services/myTripService";
import { getPartnerConfirmationBinding, recordConfirmationDelivery } from "@/services/partnerConfirmationDeliveryService";
import {
  PartnerConfirmationPayloadError,
  isConfiguredPartnerConfirmationSecret,
  hasFreshPartnerConfirmationEnvelope,
  parsePartnerBookingConfirmation,
  PartnerWebhookBodyTooLargeError,
  readBoundedPartnerWebhookBody,
  verifiesPartnerConfirmationSignature,
} from "@/services/partnerBookingConfirmation";

export const runtime = "nodejs";

type Dependencies = {
  secret: () => string | undefined;
  providerName: () => string | undefined;
  now: () => number;
  ingest: typeof upsertPartnerConfirmedMyTrip;
  recordDelivery?: typeof recordConfirmationDelivery;
};

/**
 * This is a server-to-server boundary for an approved partner callback. It is
 * not a customer trip-import API and must never be called by the frontend.
 */
export function createPartnerConfirmationHandler(dependencies: Dependencies) {
  return async function POST(request: Request) {
    const secret = dependencies.secret()?.trim();
    const configuredProvider = dependencies.providerName()?.trim();
    if (!isConfiguredPartnerConfirmationSecret(secret) || !configuredProvider) {
      return NextResponse.json(
        { error: "Partner confirmations are not configured.", errorCode: "partner_confirmation_not_configured" },
        { status: 503 },
      );
    }

    const timestamp = request.headers.get("x-kt-confirmation-timestamp");
    const signature = request.headers.get("x-kt-confirmation-signature");
    if (!hasFreshPartnerConfirmationEnvelope({ timestamp, signature, now: dependencies.now() })) {
      return NextResponse.json(
        { error: "Invalid partner confirmation signature.", errorCode: "partner_confirmation_unauthorized" },
        { status: 401 },
      );
    }

    let rawBody: string;
    try {
      rawBody = await readBoundedPartnerWebhookBody(request);
    } catch (error) {
      if (error instanceof PartnerWebhookBodyTooLargeError) {
        return NextResponse.json(
          { error: "Partner confirmation payload is too large.", errorCode: "partner_confirmation_payload_too_large" },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "Invalid partner confirmation payload.", errorCode: "partner_confirmation_invalid_payload" },
        { status: 400 },
      );
    }

    if (!verifiesPartnerConfirmationSignature({
      rawBody,
      timestamp,
      signature,
      secret,
      now: dependencies.now(),
    })) {
      return NextResponse.json(
        { error: "Invalid partner confirmation signature.", errorCode: "partner_confirmation_unauthorized" },
        { status: 401 },
      );
    }

    const audit = dependencies.recordDelivery ?? recordConfirmationDelivery;
    let confirmation;
    try {
      confirmation = parsePartnerBookingConfirmation(JSON.parse(rawBody), new Date(dependencies.now()));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof PartnerConfirmationPayloadError) {
        await audit({ providerName: configuredProvider, outcome: "REJECTED", reason: "invalid_payload" });
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

    if (confirmation.providerName !== configuredProvider) {
      await audit({ providerName: configuredProvider, outcome: "REJECTED", reason: "provider_mismatch" });
      return NextResponse.json(
        { error: "Confirmation provider does not match the authenticated feed.", errorCode: "partner_confirmation_provider_mismatch" },
        { status: 403 },
      );
    }

    const receipt = { providerName: configuredProvider, eventOccurredAt: confirmation.confirmationOccurredAt, reportedStatus: confirmation.status };
    try {
      const trip = await dependencies.ingest(confirmation);
      await audit({ ...receipt, myTripId: trip.id, outcome: "ACCEPTED", reason: "accepted" });
      return NextResponse.json({ accepted: true, tripId: trip.id });
    } catch (error) {
      if (error instanceof MyTripIngestionOwnershipError) {
        await audit({ ...receipt, outcome: "REJECTED", reason: "ownership_mismatch" });
        return NextResponse.json(
          { error: "The confirmation is already linked to a different account.", errorCode: "partner_confirmation_ownership_mismatch" },
          { status: 409 },
        );
      }
      if (error instanceof PartnerConfirmationPayloadError || error instanceof TypeError) {
        await audit({ ...receipt, outcome: "REJECTED", reason: "invalid_payload" });
        return NextResponse.json(
          { error: "Invalid partner confirmation payload.", errorCode: "partner_confirmation_invalid_payload" },
          { status: 400 },
        );
      }
      await audit({ ...receipt, outcome: "REJECTED", reason: "ingestion_unavailable" });
      console.error("[partner-confirmation]", { outcome: "ingestion_failed" });
      return NextResponse.json(
        { error: "Unable to record the partner confirmation.", errorCode: "partner_confirmation_unavailable" },
        { status: 503 },
      );
    }
  };
}

export const POST = createPartnerConfirmationHandler({
  secret: () => getPartnerConfirmationBinding().secret ?? undefined,
  providerName: () => getPartnerConfirmationBinding().providerName ?? undefined,
  now: () => Date.now(),
  ingest: upsertPartnerConfirmedMyTrip,
});
