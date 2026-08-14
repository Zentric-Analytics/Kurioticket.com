import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getMobileGoogleClientId } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { createMobileSession } from "@/lib/mobile-auth";
import { canUseStagingGoogle } from "@/lib/previewTesterAccess";
import { createMobileTwoFactorChallenge } from "@/lib/mobile-two-factor";
import {
  logMobileGoogleClaimsRejected,
  logMobileGoogleVerificationPassed,
  logMobileGoogleVerificationRejected,
} from "@/lib/mobileGoogleVerificationDiagnostics";

export const runtime = "nodejs";

const googleClient = new OAuth2Client();
const genericError = "Google sign-in could not be completed. Please try again.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  const nonce = typeof body?.nonce === "string" ? body.nonce.trim() : "";
  if (!idToken || idToken.length > 8192 || !/^[a-f0-9]{64}$/.test(nonce)) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  const audience = getMobileGoogleClientId();
  if (!audience) return NextResponse.json({ error: "Google sign-in is temporarily unavailable." }, { status: 503 });

  try {
    checkAuthRateLimit({ action: "mobile-google", request, limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json({ error: "Too many Google sign-in attempts. Please wait and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch (error) {
    logMobileGoogleVerificationRejected(error);
    return NextResponse.json({ error: genericError }, { status: 401 });
  }

  const email = payload?.email?.toLowerCase().trim();
  const claimChecks = {
    subjectPresent: Boolean(payload?.sub),
    emailPresent: Boolean(email),
    emailVerified: payload?.email_verified === true,
    noncePresent: typeof payload?.nonce === "string" && payload.nonce.length > 0,
    nonceMatches: payload?.nonce === nonce,
  };
  if (!payload?.sub || !email || payload.email_verified !== true || payload.nonce !== nonce) {
    logMobileGoogleClaimsRejected(claimChecks);
    return NextResponse.json({ error: genericError }, { status: 401 });
  }
  logMobileGoogleVerificationPassed();
  if (!(await canUseStagingGoogle(email, payload.email_verified === true))) {
    return NextResponse.json(
      { error: "Preview access is restricted.", code: "PREVIEW_ACCESS_REQUIRED" },
      { status: 403 },
    );
  }

  try {
    const user = await getOrCreateGoogleUser({
      providerAccountId: payload.sub,
      email,
      name: payload.name || null,
      image: payload.picture || null,
    });
    if (!user || !user.emailVerified || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "This account is not available. Please contact support." }, { status: 403 });
    }

    const settings = await getPrisma().userSecuritySettings.findUnique({ where: { userId: user.id }, select: { twoFactorEnabled: true } });
    if (settings?.twoFactorEnabled) {
      return NextResponse.json(await createMobileTwoFactorChallenge(user.id, "GOOGLE"), { status: 202 });
    }
    const session = await createMobileSession(user.id, "google");
    return NextResponse.json({
      session,
      user: { id: user.id, email: user.email, name: user.name, image: user.image },
    });
  } catch (error) {
    console.error("Mobile Google sign-in failed after token verification", error);
    return NextResponse.json({ error: "Google sign-in is temporarily unavailable." }, { status: 503 });
  }
}

async function getOrCreateGoogleUser(input: {
  providerAccountId: string;
  email: string;
  name: string | null;
  image: string | null;
}) {
  return getPrisma().$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: input.providerAccountId } },
      include: { user: true },
    });
    if (account) return account.user;

    const existing = await tx.user.findUnique({ where: { email: input.email } });
    if (existing) {
      if (existing.status !== "ACTIVE") return existing;
      await tx.account.create({
        data: { userId: existing.id, type: "oauth", provider: "google", providerAccountId: input.providerAccountId },
      });
      return tx.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: existing.emailVerified || new Date(),
          name: existing.name || input.name,
          image: existing.image || input.image,
        },
      });
    }

    return tx.user.create({
      data: {
        email: input.email,
        emailVerified: new Date(),
        name: input.name,
        image: input.image,
        accounts: {
          create: { type: "oauth", provider: "google", providerAccountId: input.providerAccountId },
        },
      },
    });
  });
}
