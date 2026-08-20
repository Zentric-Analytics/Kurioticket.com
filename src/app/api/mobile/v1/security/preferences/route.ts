import { NextResponse } from "next/server"; import { z } from "zod";
import { requireMobileSecurity,mobileUnauthorized } from "@/lib/mobile-security-route"; import { saveSecurityAlerts } from "@/lib/security-service";
const schema=z.object({securityEmailAlerts:z.boolean()}).strict();
export async function PATCH(request:Request){const auth=await requireMobileSecurity(request);if(!auth)return mobileUnauthorized();const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Please check the security preference."},{status:400});try{return NextResponse.json({preferences:await saveSecurityAlerts(auth.user.id,parsed.data.securityEmailAlerts)});}catch{return NextResponse.json({error:"Unable to save security preferences."},{status:503});}}
