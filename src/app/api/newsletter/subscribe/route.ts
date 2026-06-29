import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { newsletterSubscribeSchema } from "@/lib/validation";
import { newsletterWelcomeEmail, sendTransactionalEmail } from "@/services/emailService";

export const runtime = "nodejs";

const maxEmailLength = 254;
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxAttempts = 5;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const newsletterConsentTextVersion = "newsletter-homepage-v1";

const nonSendableStatuses = new Set<NewsletterSubscriptionStatus>([
  "BOUNCED",
  "COMPLAINED",
  "SUPPRESSED",
]);

type NewsletterSubscriptionStatus =
  | "PENDING_CONFIRMATION"
  | "SUBSCRIBED"
  | "UNSUBSCRIBED"
  | "BOUNCED"
  | "COMPLAINED"
  | "SUPPRESSED"
  | "NOT_FOUND";

type NewsletterSubscriberRow = {
  id: string;
  email: string;
  status: Exclude<NewsletterSubscriptionStatus, "NOT_FOUND">;
  unsubscribeTokenHash: string | null;
  suppressionReason: string | null;
  suppressedAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
};

type SubscribeResponse = {
  ok: boolean;
  message: string;
  status?: NewsletterSubscriptionStatus;
  email?: string;
};

function jsonResponse(body: SubscribeResponse, status: number) {
  return NextResponse.json(body, { status });
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

function getRateLimitKey(request: NextRequest) {
  return getClientIp(request) || "anonymous";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  existing.count += 1;
  return existing.count > rateLimitMaxAttempts;
}

function pruneRateLimitBuckets() {
  const now = Date.now();
  for (const [key, value] of rateLimitBuckets.entries()) {
    if (value.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function hashIp(ip: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!ip || !secret) return null;

  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

function trimMetadata(value: string | null, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function createNewsletterToken() {
  return randomBytes(32).toString("base64url");
}

function hashNewsletterToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

function buildNewsletterUrl(path: string, request: NextRequest, email: string, token: string) {
  const url = new URL(path, getAppBaseUrl(request));
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

async function getAuthenticatedEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase().trim() || null;
}

async function findNewsletterSubscriber(email: string) {
  const rows = await getPrisma().$queryRaw<NewsletterSubscriberRow[]>`
    SELECT id, email, status, "unsubscribeTokenHash", "suppressionReason", "suppressedAt", "bouncedAt", "complainedAt"
    FROM "NewsletterSubscriber"
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] || null;
}

function hasDeliveryBlock(subscriber: NewsletterSubscriberRow) {
  return Boolean(
    nonSendableStatuses.has(subscriber.status) ||
    subscriber.suppressionReason ||
    subscriber.suppressedAt ||
    subscriber.bouncedAt ||
    subscriber.complainedAt,
  );
}

async function upsertSubscribedNewsletterSubscriber(input: {
  email: string;
  source: string;
  locale?: string;
  regionCode?: string;
  ipHash: string | null;
  userAgent: string | null;
  tokenHash: string;
  now: Date;
  preserveSubscribedAt: boolean;
}) {
  await getPrisma().$executeRaw`
    INSERT INTO "NewsletterSubscriber" (
      id,
      email,
      status,
      source,
      locale,
      "regionCode",
      "ipHash",
      "userAgent",
      "subscribedAt",
      "unsubscribeTokenHash",
      "createdAt",
      "updatedAt",
      "consentTextVersion",
      "consentSource",
      "consentedAt",
      "confirmedAt",
      "unsubscribedAt",
      "suppressionReason",
      "suppressedAt",
      "bouncedAt",
      "complainedAt",
      "lastDeliveryEventAt"
    ) VALUES (
      ${randomUUID()},
      ${input.email},
      'SUBSCRIBED'::"NewsletterSubscriberStatus",
      ${input.source},
      ${input.locale || null},
      ${input.regionCode || null},
      ${input.ipHash},
      ${input.userAgent},
      ${input.now},
      ${input.tokenHash},
      ${input.now},
      ${input.now},
      ${newsletterConsentTextVersion},
      ${input.source},
      ${input.now},
      ${input.now},
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (email) DO UPDATE SET
      status = 'SUBSCRIBED'::"NewsletterSubscriberStatus",
      source = EXCLUDED.source,
      locale = EXCLUDED.locale,
      "regionCode" = EXCLUDED."regionCode",
      "ipHash" = EXCLUDED."ipHash",
      "userAgent" = EXCLUDED."userAgent",
      "subscribedAt" = CASE
        WHEN ${input.preserveSubscribedAt} THEN "NewsletterSubscriber"."subscribedAt"
        ELSE EXCLUDED."subscribedAt"
      END,
      "unsubscribeTokenHash" = EXCLUDED."unsubscribeTokenHash",
      "updatedAt" = EXCLUDED."updatedAt",
      "consentTextVersion" = EXCLUDED."consentTextVersion",
      "consentSource" = EXCLUDED."consentSource",
      "consentedAt" = EXCLUDED."consentedAt",
      "confirmedAt" = EXCLUDED."confirmedAt",
      "unsubscribedAt" = NULL,
      "suppressionReason" = NULL,
      "suppressedAt" = NULL,
      "bouncedAt" = NULL,
      "complainedAt" = NULL,
      "lastDeliveryEventAt" = NULL
  `;
}

async function sendWelcomeEmail(input: {
  email: string;
  source: string;
  preferencesUrl: string;
}) {
  try {
    await sendTransactionalEmail({
      to: input.email,
      subject: "You’re subscribed to Kurioticket updates",
      html: newsletterWelcomeEmail({
        preferencesUrl: input.preferencesUrl,
      }),
      from: process.env.NEWSLETTER_FROM_EMAIL || undefined,
      replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
      idempotencyKey: `newsletter-welcome-${input.email}`,
      template: "newsletter_welcome",
      metadata: { source: input.source, consentTextVersion: newsletterConsentTextVersion },
    });
  } catch (error) {
    console.error("[newsletter:welcome-email-failed]", error);
  }
}

export async function GET() {
  const email = await getAuthenticatedEmail();

  if (!email) {
    return NextResponse.json({ authenticated: false, status: "NOT_FOUND" });
  }

  try {
    const subscriber = await findNewsletterSubscriber(email);

    return NextResponse.json({
      authenticated: true,
      email,
      status: subscriber?.status || "NOT_FOUND",
    });
  } catch (error) {
    console.error("[newsletter:status-failed]", error);
    return NextResponse.json(
      { authenticated: true, email, status: "NOT_FOUND", error: "Unable to load newsletter status." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  pruneRateLimitBuckets();

  const rateLimitKey = getRateLimitKey(request);
  if (isRateLimited(rateLimitKey)) {
    return jsonResponse(
      { ok: false, message: "Too many subscription attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "Enter a valid email address." }, 400);
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return jsonResponse({ ok: false, message: "Enter a valid email address." }, 400);
  }

  const authenticatedEmail = await getAuthenticatedEmail();
  const payloadEmail = typeof (payload as { email?: unknown }).email === "string"
    ? (payload as { email: string }).email.trim()
    : "";
  const resolvedEmail = authenticatedEmail || payloadEmail;

  if (!resolvedEmail || resolvedEmail.length > maxEmailLength) {
    return jsonResponse({ ok: false, message: "Enter a valid email address." }, 400);
  }

  const parsed = newsletterSubscribeSchema.safeParse({
    ...(payload as Record<string, unknown>),
    email: resolvedEmail,
    source: authenticatedEmail ? "homepage_logged_in" : (payload as { source?: unknown }).source,
  });

  if (!parsed.success) {
    return jsonResponse({ ok: false, message: "Enter a valid email address." }, 400);
  }

  const { email, locale, regionCode } = parsed.data;
  const now = new Date();
  const ipHash = hashIp(getClientIp(request));
  const userAgent = trimMetadata(request.headers.get("user-agent"), 512);
  const source = parsed.data.source || "homepage";
  const newsletterToken = createNewsletterToken();
  const unsubscribeTokenHash = hashNewsletterToken(newsletterToken);

  try {
    const existing = await findNewsletterSubscriber(email);

    if (existing && hasDeliveryBlock(existing)) {
      return jsonResponse(
        {
          ok: false,
          message: "Newsletter updates are paused for this email because of a delivery safety signal. Please contact support if this is a mistake.",
          status: existing.status,
          email,
        },
        409,
      );
    }

    const shouldSendWelcome = !existing || existing.status === "UNSUBSCRIBED";

    await upsertSubscribedNewsletterSubscriber({
      email,
      source,
      locale,
      regionCode,
      ipHash,
      userAgent,
      tokenHash: unsubscribeTokenHash,
      now,
      preserveSubscribedAt: existing?.status === "SUBSCRIBED",
    });

    if (shouldSendWelcome) {
      await sendWelcomeEmail({
        email,
        source,
        preferencesUrl: buildNewsletterUrl("/email/preferences", request, email, newsletterToken),
      });
    }

    return jsonResponse(
      {
        ok: true,
        message: existing?.status === "SUBSCRIBED"
          ? "You’re already subscribed to Kurioticket updates."
          : "Thanks! You’re subscribed to Kurioticket updates.",
        status: "SUBSCRIBED",
        email,
      },
      200,
    );
  } catch (error) {
    console.error("[newsletter:subscribe-failed]", error);
    return jsonResponse(
      { ok: false, message: "We couldn’t subscribe you right now. Please try again soon." },
      500,
    );
  }
}
