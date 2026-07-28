import { NextResponse } from "next/server";
import { emailSchema } from "@/lib/validation";
import { getPrisma } from "@/lib/prisma";
import { createMobileSession } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = emailSchema.safeParse(body?.email);
  const name = String(body?.name || "").trim();
  const verificationToken = String(body?.verificationToken || "");
  if (!email.success || name.length < 2 || name.length > 120 || !/^[A-Za-z0-9_-]{40,60}$/.test(verificationToken)) {
    return NextResponse.json({ error: "Check your account details and try again." }, { status: 400 });
  }
  const identifier = `mobile-verified:${email.data}`;
  const proof = await getPrisma().verificationToken.findUnique({ where: { identifier_token: { identifier, token: verificationToken } } });
  if (!proof || proof.expires <= new Date()) return NextResponse.json({ error: "Verify your email again before creating an account." }, { status: 403 });
  const existing = await getPrisma().user.findUnique({ where: { email: email.data } });
  if (existing) return NextResponse.json({ error: "Unable to create this account." }, { status: 409 });
  const user = await getPrisma().user.create({ data: { email: email.data, name, emailVerified: new Date(), profile: body?.phone ? { create: { phoneNumber: String(body.phone) } } : undefined } });
  await getPrisma().verificationToken.deleteMany({ where: { identifier } });
  const session = await createMobileSession(user.id);
  return NextResponse.json({ session, user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}
