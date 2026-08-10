import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
export async function GET() {
 const auth = await requireWebApiSession();
 if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
 const sessions = await getPrisma().accountSession.findMany({ where: { userId: auth.userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, select: { id:true, client:true, platform:true, deviceLabel:true, browser:true, os:true, maskedIp:true, locationLabel:true, createdAt:true, lastSeenAt:true, revokedAt:true } });
 return NextResponse.json({ sessions: sessions.map(item => ({ ...item, deviceLabel: item.deviceLabel || (item.client === "MOBILE" ? "Mobile device" : "Web browser"), browser: item.browser || (item.client === "MOBILE" ? "Kurioticket" : "Browser"), os: item.os || item.platform || "Unknown platform", isCurrent: item.id === auth.accountSession.id })) });
}
