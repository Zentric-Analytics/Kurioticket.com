import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { listPasskeys } from "@/services/passkeyService";
export async function GET(request:Request){const s=await requireMobileSecurity(request);if(!s)return mobileUnauthorized();return NextResponse.json({passkeys:await listPasskeys(s.user.id)});}
