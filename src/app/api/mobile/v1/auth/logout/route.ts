import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { revokeSession } from "@/lib/account-session";
export async function POST(request: Request) {
 const session = await getMobileSession(request);
 if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });
 await revokeSession(session.userId, session.id, "mobile_logout");
 return NextResponse.json({ ok: true });
}
