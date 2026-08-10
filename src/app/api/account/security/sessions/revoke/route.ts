import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { revokeSession } from "@/lib/account-session";
const schema=z.object({sessionId:z.string().min(1)});
export async function PATCH(request: Request) {
 const auth=await requireWebApiSession(); if(!auth) return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success) return NextResponse.json({error:"Choose a valid device."},{status:400});
 if(parsed.data.sessionId===auth.accountSession.id) return NextResponse.json({error:"Use Sign out to end this device."},{status:400});
 const ok=await revokeSession(auth.userId,parsed.data.sessionId); return ok?NextResponse.json({ok:true}):NextResponse.json({error:"Device not found."},{status:404});
}
