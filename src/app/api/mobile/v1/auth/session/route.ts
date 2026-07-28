import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Session expired." }, { status: 401 });
  return NextResponse.json({ user: session.user, expires: session.expires.toISOString() });
}
