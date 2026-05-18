import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string; confirmPassword?: string; email?: string };
    const rawToken = String(body.token || "");
    const password = String(body.password || "");
    if (!rawToken || password !== String(body.confirmPassword || "")) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    const passwordCheck = signupSchema.shape.password.safeParse(password);
    if (!passwordCheck.success) return NextResponse.json({ error: "Password must meet minimum requirements." }, { status: 400 });
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetToken = await getPrisma().verificationToken.findUnique({ where: { token: hashedToken } });
    if (!resetToken || !resetToken.identifier.startsWith("password-reset:") || resetToken.expires <= new Date()) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    const email = resetToken.identifier.replace("password-reset:", "");
    const hash = await bcrypt.hash(password, 12);
    await getPrisma().user.update({ where: { email }, data: { passwordHash: hash } });
    await getPrisma().verificationToken.deleteMany({ where: { identifier: resetToken.identifier } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to reset password right now." }, { status: 503 });
  }
}
