import { Resend } from "resend";
import type { ErrorResponse } from "resend";
import { canSendOptionalEmail, type OptionalEmailCategory } from "@/services/emailPreferencesService";

import {
  createEmailDeliveryRecord,
  escapeHtml,
  htmlToText,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
  type EmailTemplateKey,
} from "@/services/emailDeliveryService";

let resendClient: Resend | null = null;
let sendTransactionalEmailForTesting: typeof sendTransactionalEmail | null = null;

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
  text?: string;
  template?: EmailTemplateKey;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  requireConfigured?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const resend = getResend();
  const from = input.from || process.env.RESEND_FROM_EMAIL || "";
  const template = input.template || "notification";
  const strictDelivery = input.requireConfigured || process.env.NODE_ENV === "production";
  const deliveryId = from
    ? await createEmailDeliveryRecord({
        toEmail: input.to,
        fromEmail: from,
        subject: input.subject,
        template,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
      })
    : null;

  if (!resend || !from) {
    const message = !resend
      ? "Resend API key is not configured."
      : "Resend sender email is not configured.";

    await markEmailDeliveryFailed({ deliveryId, message });

    if (strictDelivery) {
      throw new EmailDeliveryError(message);
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
      text: input.text || htmlToText(input.html),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    },
    input.idempotencyKey
      ? { headers: { "Idempotency-Key": input.idempotencyKey } }
      : undefined,
  );

  if (error) {
    const statusCode = getResendStatusCode(error);
    await markEmailDeliveryFailed({
      deliveryId,
      message: error.message,
      statusCode,
    });
    throw new EmailDeliveryError(error.message, statusCode);
  }

  await markEmailDeliverySent({ deliveryId, providerMessageId: data?.id });
  return { id: data?.id };
}

export async function sendOptionalEmail(input: {
  userId: string;
  category: OptionalEmailCategory;
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: EmailTemplateKey;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  requireConfigured?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const allowed = await canSendOptionalEmail(input.userId, input.category);

  if (!allowed) {
    console.info("[email:optional-skipped]", {
      userId: input.userId,
      category: input.category,
      template: input.template || "notification",
    });
    return { skipped: true as const, reason: "preferences_disabled" as const };
  }

  const sendEmail = sendTransactionalEmailForTesting ?? sendTransactionalEmail;
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    template: input.template,
    from: input.from,
    replyTo: input.replyTo,
    idempotencyKey: input.idempotencyKey,
    requireConfigured: input.requireConfigured,
    metadata: {
      ...(input.metadata || {}),
      optionalEmailCategory: input.category,
    },
  });

  return { skipped: false as const, ...result };
}

function getResendStatusCode(error: ErrorResponse) {
  return typeof error.statusCode === "number" ? error.statusCode : null;
}

export function priceAlertEmail(input: {
  name?: string | null;
  route: string;
  price: string;
  url: string;
}) {
  const name = escapeHtml(input.name);
  const route = escapeHtml(input.route);
  const price = escapeHtml(input.price);
  const url = escapeHtml(input.url);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">A meaningful price change was found</h1>
      <p>${name ? `Hi ${name},` : "Hi,"} Kurioticket found an option for ${route} at ${price}.</p>
      <p>Review the route on Kurioticket, then confirm current price, availability, and fare rules on the external provider site.</p>
      <p><a href="${url}" style="color:#0f766e">View alert</a></p>
    </div>
  `;
}

export function supportTicketEmail(input: { ticketId: string; subject: string }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">We received your request</h1>
      <p>Your Kurioticket support ticket is open.</p>
      <p><strong>Ticket:</strong> ${escapeHtml(input.ticketId)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <p>Our team can help with Kurioticket searches, alerts, account tools, and travel guidance. External providers handle purchases, check-in, changes, cancellations, and refunds.</p>
    </div>
  `;
}

export function verificationCodeEmail(input: {
  code: string;
  name?: string | null;
  expiresInMinutes: number;
  verifyUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Your Kurioticket verification code</h1>
      <p>${input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,"} use this code to verify your email address:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p><a href="${escapeHtml(input.verifyUrl)}" style="color:#0f766e">Enter verification code</a></p>
      <p>If you did not request this Kurioticket email verification, you can ignore this email.</p>
    </div>
  `;
}

export function passwordResetEmail(input: {
  name?: string | null;
  expiresInMinutes: number;
  resetUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Reset your Kurioticket password</h1>
      <p>${input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,"} click the link below to reset your password.</p>
      <p><a href="${escapeHtml(input.resetUrl)}" style="color:#0f766e">Reset your password</a></p>
      <p>This link expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p>If you did not request a Kurioticket password reset, you can ignore this email.</p>
    </div>
  `;
}

export function loginVerificationCodeEmail(input: {
  code: string;
  name?: string | null;
  expiresInMinutes: number;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Your Kurioticket login verification code</h1>
      <p>${input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,"} use this code to finish logging in to Kurioticket:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p>If you did not try to log in to Kurioticket, you can ignore this email.</p>
    </div>
  `;
}

export function twoFactorCodeEmail(input: {
  code: string;
  name?: string | null;
  purpose: "enable" | "disable" | "login";
  expiresInMinutes: number;
}) {
  const action =
    input.purpose === "disable"
      ? "disable two-factor authentication"
      : input.purpose === "enable"
        ? "enable two-factor authentication"
        : "finish signing in";

  const safety =
    input.purpose === "disable"
      ? "If you did not request disabling two-factor authentication, keep 2FA enabled and contact support."
      : "If you did not request this code, you can ignore this email.";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Your Kurioticket two-factor authentication code</h1>
      <p>${input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,"} use this code to ${escapeHtml(action)}:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p>${safety}</p>
    </div>
  `;
}

export function newsletterWelcomeEmail(input?: { preferencesUrl?: string }) {
  const preferencesUrl = input?.preferencesUrl
    ? escapeHtml(input.preferencesUrl)
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">You’re subscribed to Kurioticket updates</h1>
      <p>Thanks for subscribing. We’ll send occasional Kurioticket updates to help you compare travel options more calmly.</p>
      <p>We will not ask you for payment details by email, and booking decisions should always be confirmed on Kurioticket or the provider site.</p>
      ${preferencesUrl ? `<p><a href="${preferencesUrl}" style="color:#0f766e">Manage your Kurioticket email preferences</a></p>` : ""}
      <p style="font-size:12px;color:#64748b">Opening the preferences page does not unsubscribe you. You can stop updates from that page whenever you choose.</p>
    </div>
  `;
}

export function newsletterUnsubscribedEmail(input?: { preferencesUrl?: string }) {
  const preferencesUrl = input?.preferencesUrl
    ? escapeHtml(input.preferencesUrl)
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">You’re unsubscribed from Kurioticket updates</h1>
      <p>You will no longer receive Kurioticket marketing newsletters, travel inspiration, or product update emails.</p>
      <p>Important account, security, password reset, login verification, and support emails may still be sent when needed.</p>
      ${preferencesUrl ? `<p><a href="${preferencesUrl}" style="color:#0f766e">Resubscribe or manage email preferences</a></p>` : ""}
    </div>
  `;
}

function getUsableGivenName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.includes("@")) return "";

  const firstToken = trimmed.split(/\s+/)[0]?.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, "") || "";
  if (!firstToken || !/\p{L}/u.test(firstToken) || /\d/u.test(firstToken)) return "";

  return firstToken
    .toLocaleLowerCase("en")
    .replace(/(^|[-'’])\p{L}/gu, (match) => match.toLocaleUpperCase("en"));
}

function formatEmailPreferenceChangedAt(changedAt: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(changedAt);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((datePart) => datePart.type === type)?.value || "";

  return `Changed ${part("month")} ${part("day")}, ${part("year")} at ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

function emailPreferenceStatusRows(labels: string[], status: "On" | "Off") {
  return labels
    .map(
      (label) => `
        <tr>
          <td style="padding:6px 0;color:#334155">${escapeHtml(label)}</td>
          <td align="right" style="padding:6px 0;font-weight:700;color:#0f172a">${status}</td>
        </tr>`,
    )
    .join("");
}

export function emailPreferencesUpdatedEmail(input: {
  name?: string | null;
  enabledLabels: string[];
  disabledLabels: string[];
  changedAt: Date;
  preferencesUrl: string;
  masterStatusChange?: "disabled" | "enabled";
  masterDisabled: boolean;
}) {
  const givenName = getUsableGivenName(input.name);
  const greeting = givenName ? `Hi ${escapeHtml(givenName)},` : "Hi,";
  const preferencesUrl = escapeHtml(input.preferencesUrl);
  const changedAt = escapeHtml(formatEmailPreferenceChangedAt(input.changedAt));
  const enabledRows = emailPreferenceStatusRows(input.enabledLabels, "On");
  const disabledRows = emailPreferenceStatusRows(input.disabledLabels, "Off");
  const changeRows = `${disabledRows}${enabledRows}`;
  const hasMasterChange = Boolean(input.masterStatusChange);
  const heading =
    input.masterStatusChange === "disabled"
      ? "You’re unsubscribed"
      : input.masterStatusChange === "enabled"
        ? "You’re resubscribed"
        : "Your email preferences were updated";
  const summary =
    input.masterStatusChange === "disabled"
      ? "You’ll no longer receive optional Kurioticket emails."
      : input.masterStatusChange === "enabled"
        ? "Optional emails are enabled again. You’ll receive only the categories you have turned on."
        : "We saved your latest optional email choices.";

  return `
    <div style="margin:0;background:#f8fafc;padding:16px;font-family:Arial,sans-serif;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;line-height:1.45">
        <h1 style="font-size:24px;line-height:1.2;margin:0 0 12px;color:#0f172a">${heading}</h1>
        <p style="margin:0 0 10px">${greeting}</p>
        <p style="margin:0 0 14px">${summary}</p>
        ${
          input.masterStatusChange === "disabled"
            ? '<p style="margin:0 0 14px">Your category choices are saved and will become active again if you resubscribe.</p>'
            : ""
        }
        ${
          changeRows
            ? `<h2 style="font-size:15px;margin:16px 0 6px;color:#0f172a">${hasMasterChange ? "Other changes" : "Changes"}</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px">${changeRows}</table>`
            : ""
        }
        <p style="margin:0 0 16px;font-size:12px;color:#64748b">${changedAt}</p>
        <p style="margin:0 0 16px"><a href="${preferencesUrl}" style="display:block;text-align:center;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;padding:11px 16px">Manage email preferences</a></p>
        <p style="margin:0;font-size:12px;line-height:1.4;color:#64748b">If you didn’t make this change, review your account security or contact Kurioticket support.</p>
      </div>
    </div>
  `;
}
export function accountDeletionRequestEmail(input: { deadline: Date }) {
  const deadline = escapeHtml(
    new Intl.DateTimeFormat("en", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(input.deadline),
  );

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Account deletion request received</h1>
      <p>We received your Kurioticket account deletion request.</p>
      <p>Your account is scheduled for permanent deletion review on <strong>${deadline}</strong>.</p>
      <p>You can reactivate your account by logging in before this deadline and choosing Reactivate account.</p>
      <p>Some records may be retained where legally required for tax, fraud prevention, booking, payment, support, security, or compliance obligations.</p>
    </div>
  `;
}

export function accountDeletionRequestAdminEmail(input: {
  userId: string;
  email: string;
  requestedAt: Date;
  deadline: Date;
  supportTicketId?: string | null;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Account deletion request</h1>
      <p><strong>User id:</strong> ${escapeHtml(input.userId)}</p>
      <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
      <p><strong>Requested:</strong> ${escapeHtml(input.requestedAt.toISOString())}</p>
      <p><strong>Scheduled deletion review:</strong> ${escapeHtml(input.deadline.toISOString())}</p>
      <p><strong>Support ticket:</strong> ${escapeHtml(input.supportTicketId || "not available")}</p>
      <p>Do not hard-delete before reviewing legal, tax, fraud, booking, payment, support, and compliance retention obligations.</p>
    </div>
  `;
}

export function accountDeletionCancelledEmail() {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Account deletion cancelled</h1>
      <p>Your Kurioticket account deletion request has been cancelled.</p>
      <p>Your account has been reactivated and access is restored.</p>
    </div>
  `;
}

export const __emailServiceTest = {
  setSendTransactionalEmailForTesting(sendEmail: typeof sendTransactionalEmail | null) {
    sendTransactionalEmailForTesting = sendEmail;
  },
};
