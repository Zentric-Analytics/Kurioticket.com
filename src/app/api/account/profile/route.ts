import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { serializeUserProfile, userProfileSchema } from "@/lib/userProfile";

export const runtime = "nodejs";

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  return userId || null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const profile = await getPrisma().userProfile.findUnique({
      where: { userId },
      select: {
        fullName: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        nationality: true,
        address: true,
      },
    });

    return NextResponse.json({ profile: serializeUserProfile(profile) });
  } catch (error) {
    console.error("[account-profile:get]", error);
    return NextResponse.json({ error: "Unable to load profile details." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = userProfileSchema.parse(await request.json());
    const fullNameWasSubmitted = Object.hasOwn(payload, "fullName");
    const prisma = getPrisma();
    const profile = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...payload },
        update: payload,
        select: {
          fullName: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          nationality: true,
          address: true,
        },
      });

      if (fullNameWasSubmitted) {
        await tx.user.update({
          where: { id: userId },
          data: { name: payload.fullName ?? null },
          select: { id: true },
        });
      }

      return savedProfile;
    });

    return NextResponse.json({ profile: serializeUserProfile(profile) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Please check the profile details and try again." }, { status: 400 });
    }

    console.error("[account-profile:patch]", error);
    return NextResponse.json({ error: "Unable to save profile details." }, { status: 500 });
  }
}
