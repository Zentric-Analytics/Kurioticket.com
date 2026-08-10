import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { revokeAllSessions } from "@/lib/account-session";
export async function POST() { const auth=await requireWebApiSession(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401}); await revokeAllSessions(auth.userId); return NextResponse.json({ok:true}); }
