import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function createPasswordUser(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await getPrisma().user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await getPrisma().user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
    },
  });

  await trackAnalyticsEvent({
    userId: user.id,
    type: "SIGNUP",
    name: "password_signup",
  });

  return user;
}
