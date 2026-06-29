import { createHash } from "node:crypto";

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

type NewsletterSubscriptionStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "NOT_FOUND";

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

async function getAuthenticatedEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase().trim() || null;
}

async function sendWelcomeEmail(email: string, source: string) {
  try {
    await sendTransactionalEmail({
      to: email,
      subject: "You’re subscribed to Kurioticket updates",
      html: newsletterWelcomeEmail(),
      from: process.env.NEWSLETTER_FROM_EMAIL || undefined,
      replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
      idempotencyKey: `newsletter-welcome-${email}`,
      template: "newsletter_welcome",
      metadata: { source },
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
    const subscriber = await getPrisma().newsletterSubscriber.findUnique({
      where: { email },
      select: { status: true },
    });

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

  try {
    const db = getPrisma();
    const existing = await db.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    const shouldSendWelcome = !existing || existing.status === "UNSUBSCRIBED";

    await db.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        status: "SUBSCRIBED",
        source,
        locale,
        regionCode,
        ipHash,
        userAgent,
        subscribedAt: now,
      },
      update: {
        status: "SUBSCRIBED",
        source,
        locale,
        regionCode,
        ipHash,
        userAgent,
        ...(existing?.status === "SUBSCRIBED" ? {} : { subscribedAt: now }),
        unsubscribedAt: null,
      },
    });

    if (shouldSendWelcome) {
      await sendWelcomeEmail(email, source);
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
