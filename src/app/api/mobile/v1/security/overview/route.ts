import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { securityOverview } from "@/lib/security-service";
export async function GET(request: Request) { const auth=await requireMobileSecurity(request); if(!auth)return mobileUnauthorized(); try{return NextResponse.json({overview:await securityOverview(auth.user.id)});}catch{return NextResponse.json({error:"Unable to load security settings."},{status:503});} }
