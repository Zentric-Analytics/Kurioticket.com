import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { mobileUnauthorized, requireMobileSecurity } from "@/lib/mobile-security-route";
import { confirmTotpSetup, getTwoFactorStatus } from "@/services/twoFactorService";
import { deliverSecurityEvent } from "@/services/securityEventService";
export const runtime="nodejs";
const schema=z.object({code:z.string().regex(/^\d{6}$/)});
type Auth={id:string;user:{id:string;email:string}};
type Dependencies={authenticate:(request:Request)=>Promise<Auth|null>;rateLimit:typeof checkAuthRateLimit;confirm:typeof confirmTotpSetup;status:typeof getTwoFactorStatus;notify:typeof deliverSecurityEvent};
export function createConfirmHandler(deps:Dependencies={authenticate:requireMobileSecurity,rateLimit:checkAuthRateLimit,confirm:confirmTotpSetup,status:getTwoFactorStatus,notify:deliverSecurityEvent}) { return async(request:Request)=>{
 const auth=await deps.authenticate(request);if(!auth)return mobileUnauthorized();
 try{deps.rateLimit({action:"two-factor-confirm",email:auth.user.email,request,limit:10,windowMs:15*60*1000});}catch(error){if(error instanceof AuthRateLimitError)return NextResponse.json({error:"Too many attempts. Please wait and try again."},{status:429,headers:{"Retry-After":String(error.retryAfterSeconds)}});throw error;}
 const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:"Enter the 6-digit authenticator code."},{status:400});
 try{const result=await deps.confirm({userId:auth.user.id,accountSessionId:auth.id,code:parsed.data.code});if(!result)return NextResponse.json({error:"The authenticator code is invalid or setup expired."},{status:400});
 await deps.notify({userId:auth.user.id,email:auth.user.email,securityEventId:result.securityEvent.id,title:"Two-factor authentication enabled",body:"Two-factor authentication was enabled for your Kurioticket account. If this wasn’t you, secure your account and contact Support immediately."}).catch(()=>undefined);
 return NextResponse.json({ok:true,twoFactor:await deps.status(auth.user.id),recoveryCodes:result.recoveryCodes});}catch{return NextResponse.json({error:"Unable to enable two-factor authentication."},{status:503});}
};}
export const POST=createConfirmHandler();
