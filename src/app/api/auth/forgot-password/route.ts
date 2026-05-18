import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { sendTransactionalEmail } from "@/services/emailService";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    const parsed = emailSchema.safeParse(String(email || ""));
    if (!parsed.success) return NextResponse.json({ ok: true });
    const normalized = parsed.data;
    const user = await getPrisma().user.findUnique({ where: { email: normalized } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const token = crypto.createHash("sha256").update(rawToken).digest("hex");
      const identifier = `password-reset:${normalized}`;
      const expires = new Date(Date.now() + 1000 * 60 * 30);
      await getPrisma().verificationToken.deleteMany({ where: { identifier } });
      await getPrisma().verificationToken.create({ data: { identifier, token, expires } });
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const url = `${base}/auth/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalized)}`;
      await sendTransactionalEmail({ to: normalized, subject: "Reset your Curioticket password", html: `<div style='font-family:Arial,sans-serif;color:#0f172a'><h1>Reset your password</h1><p>Use the secure link below to create a new password. It expires in 30 minutes.</p><p><a href='${url}'>Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>` });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}
