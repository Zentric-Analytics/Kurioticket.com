import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export async function createPasswordUser(input: { name: string; email: string; password: string }) {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    console.error("[signup:service-validation]", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid signup input.");
  }

  const { email, password } = parsed.data;
  const name = parsed.data.name.trim();

  const existing = await getPrisma().user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new DuplicateEmailError();
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await getPrisma().user.create({
      data: {
        name,
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
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw new DuplicateEmailError();
    }

    throw error;
  }
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Error && /Unique constraint failed|P2002|unique/i.test(error.message) && /email/i.test(error.message);
}