import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value ? value : null));

const profileUpdateSchema = z.object({
  name: nullableTrimmedString(120),
  phone: nullableTrimmedString(40),
  dateOfBirth: nullableTrimmedString(32),
  gender: nullableTrimmedString(40),
  nationality: nullableTrimmedString(120),
  address: nullableTrimmedString(1200),
});

function profileResponse(user: Awaited<ReturnType<typeof getUserProfile>>) {
  return {
    profile: {
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.profile?.phone ?? "",
      dateOfBirth: user.profile?.dateOfBirth ?? "",
      gender: user.profile?.gender ?? "",
      nationality: user.profile?.nationality ?? "",
      address: user.profile?.address ?? "",
    },
  };
}

async function getUserProfile(userId: string) {
  return getPrisma().user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  }

  try {
    const user = await getUserProfile(session.user.id);
    return NextResponse.json(profileResponse(user));
  } catch (error) {
    console.error("[account-profile:get]", error);
    return NextResponse.json({ error: "We could not load your profile details." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check your profile details." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your profile details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const db = getPrisma();
    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        profile: {
          upsert: {
            create: {
              phone: parsed.data.phone,
              dateOfBirth: parsed.data.dateOfBirth,
              gender: parsed.data.gender,
              nationality: parsed.data.nationality,
              address: parsed.data.address,
            },
            update: {
              phone: parsed.data.phone,
              dateOfBirth: parsed.data.dateOfBirth,
              gender: parsed.data.gender,
              nationality: parsed.data.nationality,
              address: parsed.data.address,
            },
          },
        },
      },
      include: { profile: true },
    });

    return NextResponse.json(profileResponse(user));
  } catch (error) {
    console.error("[account-profile:put]", error);
    return NextResponse.json({ error: "We could not save your profile details." }, { status: 503 });
  }
}
