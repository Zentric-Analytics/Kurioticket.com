import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const securityPreferencesSchema = z.object({
  securityEmailAlerts: z.boolean(),
});

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const preferences = await getPrisma().userSecuritySettings.findUnique({
      where: { userId },
      select: { securityEmailAlerts: true },
    });

    return NextResponse.json({ preferences: { securityEmailAlerts: preferences?.securityEmailAlerts ?? true } });
  } catch (error) {
    console.error("[account-security-preferences:get]", error);
    return NextResponse.json({ error: "Unable to load security preferences." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = securityPreferencesSchema.parse(await request.json());
    const preferences = await getPrisma().userSecuritySettings.upsert({
      where: { userId },
      create: { userId, securityEmailAlerts: payload.securityEmailAlerts },
      update: { securityEmailAlerts: payload.securityEmailAlerts },
      select: { securityEmailAlerts: true },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Please check the security preference and try again." }, { status: 400 });
    }

    console.error("[account-security-preferences:patch]", error);
    return NextResponse.json({ error: "Unable to save security preferences." }, { status: 500 });
  }
}
