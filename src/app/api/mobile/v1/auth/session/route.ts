import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { validateMobileDeletionReactivationBearer } from "@/lib/account-session";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") {
    const recovery = await validateMobileDeletionReactivationBearer(request);
    if (!recovery) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    return NextResponse.json({ user: { id: recovery.user.id, email: recovery.user.email, name: recovery.user.name }, expires: recovery.expiresAt.toISOString(), recovery: { deadline: recovery.recoveryDeadline.toISOString() } });
  }
  return NextResponse.json({ user: session.user, expires: session.expiresAt.toISOString() });
}
