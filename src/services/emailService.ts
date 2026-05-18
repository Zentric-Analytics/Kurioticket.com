import { Resend } from "resend";
import type { ErrorResponse } from "resend";

let resendClient: Resend | null = null;

export class EmailDeliveryError extends Error {
  statusCode?: number | null;

  constructor(message: string, statusCode?: number | null) {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = statusCode;
  }
}

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  requireConfigured?: boolean;
}) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || "";

  if (!resend || !from) {
    if (input.requireConfigured) {
      throw new EmailDeliveryError(
        !resend ? "Resend API key is not configured." : "Resend sender email is not configured.",
      );
    }

    console.info("[email:fallback]", input.subject, input.to);
    return { id: "resend-not-configured" };
  }

  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    },
    input.idempotencyKey ? { headers: { "Idempotency-Key": input.idempotencyKey } } : undefined,
  );

  if (error) throw new EmailDeliveryError(error.message, getResendStatusCode(error));
  return { id: data?.id };
}

function getResendStatusCode(error: ErrorResponse) {
  return typeof error.statusCode === "number" ? error.statusCode : null;
}

export function priceAlertEmail(input: { name?: string | null; route: string; price: string; url: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">A meaningful price change was found</h1>
      <p>${input.name ? `Hi ${input.name},` : "Hi,"} Curioticket found an option for ${input.route} at ${input.price}.</p>
      <p>Review the route on Curioticket, then confirm current price, availability, and fare rules on the external provider site.</p>
      <p><a href="${input.url}" style="color:#0f766e">View alert</a></p>
    </div>
  `;
}

export function supportTicketEmail(input: { ticketId: string; subject: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">We received your request</h1>
      <p>Your Curioticket support ticket is open.</p>
      <p><strong>Ticket:</strong> ${input.ticketId}</p>
      <p><strong>Subject:</strong> ${input.subject}</p>
      <p>Our team can help with Curioticket searches, alerts, premium tools, and travel guidance. External providers handle purchases, check-in, changes, cancellations, and refunds.</p>
    </div>
  `;
}

export function verificationCodeEmail(input: { code: string; name?: string | null; expiresInMinutes: number; verifyUrl: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Verify your Curioticket email</h1>
      <p>${input.name ? `Hi ${input.name},` : "Hi,"} use this code to verify your email address:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f766e">${input.code}</p>
      <p>This code expires in ${input.expiresInMinutes} minutes.</p>
      <p><a href="${input.verifyUrl}" style="color:#0f766e">Enter verification code</a></p>
      <p>If you did not try to access Curioticket, you can ignore this email.</p>
    </div>
  `;
}
