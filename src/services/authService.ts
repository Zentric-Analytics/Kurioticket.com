import { promises as dns } from "node:dns";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { isStrictEmailAddress, signupSchema } from "@/lib/validation";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export class InvalidEmailError extends Error {
  constructor() {
    super("Enter a valid email address.");
    this.name = "InvalidEmailError";
  }
}

export async function createPasswordUser(input: { name: string; email: string; password: string }) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[signup:service-validation]", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid signup input.");
  }

  const { email, password } = parsed.data;
  if (!isStrictEmailAddress(email)) {
    console.error("[signup:service-email-validation]", { email });
    throw new InvalidEmailError();
  }

  if (!(await hasValidEmailHost(email))) {
    console.error("[signup:service-email-host-validation]", { domain: email.split("@")[1] });
    throw new InvalidEmailError();
  }

  const name = parsed.data.name.trim();
  const existing = await getPrisma().user.findUnique({ where: { email } });
  if (existing) throw new DuplicateEmailError();

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
    if (isUniqueEmailError(error)) throw new DuplicateEmailError();
    throw error;
  }
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Error && /Unique constraint failed|P2002|unique/i.test(error.message) && /email/i.test(error.message);
}

async function hasValidEmailHost(email: string) {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const records = await withTimeout(dns.resolveMx(domain), 3000);
    return records.some((record) => record.exchange && record.exchange.trim().length > 0);
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Email host validation timed out.")), timeoutMs);
    }),
  ]);
}
