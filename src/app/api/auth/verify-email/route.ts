import { NextResponse } from "next/server";
import { signinSchema } from "@/lib/validation";
import { sendEmailVerificationCode, verifyEmailCode } from "@/services/emailVerificationService";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[verify-email:invalid-json]", error);
    return NextResponse.json({ error: "Unable to verify email right now." }, { status: 400 });
  }

  const input = parseVerifyEmailBody(body);
  if (!input) {
    return NextResponse.json({ error: "Unable to verify email right now." }, { status: 400 });
  }

  const verified = await verifyEmailCode(input);
  if (!verified) {
    return NextResponse.json({ error: "The verification code is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[verify-email-resend:invalid-json]", error);
    return NextResponse.json({ ok: true });
  }

  const email = parseEmail(body);
  if (email) {
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: { email: true, emailVerified: true, name: true },
    });
    if (user && !user.emailVerified) {
      await sendEmailVerificationCode({ email, name: user.name });
    }
  }

  return NextResponse.json({ ok: true });
}

function parseVerifyEmailBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const email = parseEmail(record);
  const code = String(record.code || "").trim();
  if (!email || !/^\d{6}$/.test(code)) return null;
  return { email, code };
}

function parseEmail(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const email = String((body as Record<string, unknown>).email || "");
  const parsed = signinSchema.shape.email.safeParse(email);
  return parsed.success ? parsed.data : "";
}
