import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";

export const runtime = "nodejs";

type PreferenceAction = "subscribe" | "unsubscribe";

function hashNewsletterToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isValidNewsletterToken(token: string, storedHash?: string | null) {
  return Boolean(token && storedHash && hashNewsletterToken(token) === storedHash);
}

async function getAuthenticatedEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase().trim() || null;
}

function parseEmail(value: string | null) {
  const parsed = emailSchema.safeParse(value || "");
  return parsed.success ? parsed.data : null;
}

function parseAction(value: unknown): PreferenceAction | null {
  return value === "subscribe" || value === "unsubscribe" ? value : null;
}

async function resolveSubscriber(input: { email: string | null; token: string | null }) {
  const authenticatedEmail = await getAuthenticatedEmail();
  const email = authenticatedEmail || input.email;

  if (!email) {
    return { ok: false as const, status: 401, message: "Sign in or use a valid newsletter preference link." };
  }

  const subscriber = await getPrisma().newsletterSubscriber.findUnique({
    where: { email },
    select: { email: true, status: true, unsubscribeTokenHash: true },
  });

  if (!subscriber) {
    return { ok: true as const, email, authenticated: Boolean(authenticatedEmail), status: "NOT_FOUND" as const };
  }

  if (!authenticatedEmail && !isValidNewsletterToken(input.token || "", subscriber.unsubscribeTokenHash)) {
    return { ok: false as const, status: 403, message: "This newsletter preference link is invalid or expired." };
  }

  return {
    ok: true as const,
    email: subscriber.email,
    authenticated: Boolean(authenticatedEmail),
    status: subscriber.status,
  };
}

export async function GET(request: NextRequest) {
  const email = parseEmail(request.nextUrl.searchParams.get("email"));
  const token = request.nextUrl.searchParams.get("token");

  try {
    const resolved = await resolveSubscriber({ email, token });

    if (!resolved.ok) {
      return NextResponse.json({ ok: false, message: resolved.message }, { status: resolved.status });
    }

    return NextResponse.json({
      ok: true,
      email: resolved.email,
      status: resolved.status,
      authenticated: resolved.authenticated,
    });
  } catch (error) {
    console.error("[newsletter:preferences-get-failed]", error);
    return NextResponse.json(
      { ok: false, message: "We couldn’t load your newsletter preferences right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const body = payload as { email?: unknown; token?: unknown; action?: unknown };
  const email = typeof body.email === "string" ? parseEmail(body.email) : null;
  const token = typeof body.token === "string" ? body.token : null;
  const action = parseAction(body.action);

  if (!action) {
    return NextResponse.json({ ok: false, message: "Choose a newsletter preference action." }, { status: 400 });
  }

  try {
    const resolved = await resolveSubscriber({ email, token });

    if (!resolved.ok) {
      return NextResponse.json({ ok: false, message: resolved.message }, { status: resolved.status });
    }

    const now = new Date();
    const db = getPrisma();

    if (action === "unsubscribe") {
      await db.newsletterSubscriber.update({
        where: { email: resolved.email },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: now,
        },
      });

      return NextResponse.json({
        ok: true,
        email: resolved.email,
        status: "UNSUBSCRIBED",
        message: "You’re unsubscribed from Kurioticket marketing emails.",
      });
    }

    await db.newsletterSubscriber.upsert({
      where: { email: resolved.email },
      create: {
        email: resolved.email,
        status: "SUBSCRIBED",
        source: "preferences",
        subscribedAt: now,
      },
      update: {
        status: "SUBSCRIBED",
        source: "preferences",
        subscribedAt: now,
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      email: resolved.email,
      status: "SUBSCRIBED",
      message: "You’re subscribed to Kurioticket updates.",
    });
  } catch (error) {
    console.error("[newsletter:preferences-post-failed]", error);
    return NextResponse.json(
      { ok: false, message: "We couldn’t update your newsletter preferences right now." },
      { status: 500 },
    );
  }
}
