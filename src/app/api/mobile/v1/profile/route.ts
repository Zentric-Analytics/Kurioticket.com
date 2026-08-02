import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";
import { serializeUserProfile, userProfileSchema } from "@/lib/userProfile";

const select = { fullName: true, phoneNumber: true, phoneCountryCode: true, dateOfBirth: true, gender: true, nationality: true, address: true } as const;
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const profile = await getPrisma().userProfile.findUnique({ where: { userId: session.user.id }, select });
    return NextResponse.json({ profile: serializeUserProfile(profile), user: session.user });
  } catch {
    return NextResponse.json({ error: "Unable to load profile." }, { status: 503 });
  }
}
export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = userProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the profile details." }, { status: 400 });
  try {
    const profile = await getPrisma().userProfile.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, ...parsed.data }, update: parsed.data, select });
    return NextResponse.json({ profile: serializeUserProfile(profile) });
  } catch {
    return NextResponse.json({ error: "Unable to save profile." }, { status: 503 });
  }
}
