import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { mobileUnauthorized, requireMobileSecurity } from "@/lib/mobile-security-route";
import { createTotpSetup } from "@/services/twoFactorService";
export const runtime = "nodejs";
type Auth = { id: string; user: { id: string; email: string } };
type Dependencies = { authenticate:(request:Request)=>Promise<Auth|null>; rateLimit:typeof checkAuthRateLimit; setup:typeof createTotpSetup };
export function createSetupHandler(deps:Dependencies={authenticate:requireMobileSecurity,rateLimit:checkAuthRateLimit,setup:createTotpSetup}) { return async (request:Request) => {
  const auth=await deps.authenticate(request); if(!auth) return mobileUnauthorized();
  try { deps.rateLimit({action:"two-factor-setup",email:auth.user.email,request,limit:5,windowMs:15*60*1000}); }
  catch(error) { if(error instanceof AuthRateLimitError) return NextResponse.json({error:"Too many setup attempts. Please wait and try again."},{status:429,headers:{"Retry-After":String(error.retryAfterSeconds)}}); throw error; }
  try { return NextResponse.json({setup:await deps.setup({userId:auth.user.id,email:auth.user.email})}); }
  catch { return NextResponse.json({error:"Unable to start two-factor setup."},{status:503}); }
}; }
export const POST=createSetupHandler();
