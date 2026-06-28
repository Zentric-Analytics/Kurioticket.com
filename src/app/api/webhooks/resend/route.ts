import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

import { recordProviderEmailEvent } from "@/services/emailDeliveryService";

export const runtime = "nodejs";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    message_id?: string;
    to?: string[];
    subject?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const strictWebhookVerification = process.env.NODE_ENV === "production";

  if (!webhookSecret && strictWebhookVerification) {
    console.error("[resend:webhook:missing-secret]");
    return new NextResponse("Webhook secret is not configured.", {
      status: 503,
    });
  }

  let event: ResendWebhookEvent;

  try {
    event = webhookSecret
      ? await verifyResendWebhook(payload, request, webhookSecret)
      : JSON.parse(payload);
  } catch (error) {
    console.error("[resend:webhook:invalid]", error);
    return new NextResponse("Invalid webhook", { status: 400 });
  }

  const eventType = typeof event.type === "string" ? event.type : "unknown";
  const createdAt =
    typeof event.created_at === "string" ? new Date(event.created_at) : null;
  const data = event.data || {};
  const providerMessageId =
    typeof data.email_id === "string" ? data.email_id : undefined;
  const providerEventId = request.headers.get("svix-id") || undefined;
  const toEmail =
    Array.isArray(data.to) && typeof data.to[0] === "string"
      ? data.to[0]
      : undefined;

  try {
    await recordProviderEmailEvent({
      providerEventId,
      providerMessageId,
      type: eventType,
      payload: event as Record<string, unknown>,
      occurredAt:
        createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt
          : undefined,
      toEmail,
    });
  } catch (error) {
    console.error("[resend:webhook:record-failed]", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function verifyResendWebhook(
  payload: string,
  request: NextRequest,
  webhookSecret: string
) {
  const resend = new Resend(
    process.env.RESEND_API_KEY || "re_webhook_verification_only"
  );

  const verifiedPayload = await Promise.resolve(
    resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") || "",
        timestamp: request.headers.get("svix-timestamp") || "",
        signature: request.headers.get("svix-signature") || "",
      },
      webhookSecret,
    })
  );

  return verifiedPayload as unknown as ResendWebhookEvent;
}