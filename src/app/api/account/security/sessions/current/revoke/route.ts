import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { revokeSession } from "@/lib/account-session";
export const runtime = "nodejs";
export async function POST() {
 const auth=await requireWebApiSession(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401});
 await revokeSession(auth.userId,auth.accountSession.id,"web_logout"); return NextResponse.json({ok:true});
}
