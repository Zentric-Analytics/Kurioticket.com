import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthenticationAssurance } from "@/generated/prisma/enums";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { hasRecentReauthentication } from "@/lib/account-session";
import { getPrisma } from "@/lib/prisma";
import { mobileUnauthorized, requireMobileSecurity } from "@/lib/mobile-security-route";
import { disableTwoFactorForSession, getTwoFactorStatus, verifySecondFactor } from "@/services/twoFactorService";
import { deliverSecurityEvent } from "@/services/securityEventService";
export const runtime="nodejs";
const schema=z.object({code:z.string().min(6).optional(),password:z.string().min(1).optional()});
type Auth={id:string;reauthenticatedAt:Date|null;assuranceLevel:AuthenticationAssurance;user:{id:string;email:string}};
type Dependencies={authenticate:(r:Request)=>Promise<Auth|null>;rateLimit:typeof checkAuthRateLimit;verify:typeof verifySecondFactor;passwordHash:(id:string)=>Promise<string|null>;compare:(a:string,b:string)=>Promise<boolean>;disable:typeof disableTwoFactorForSession;status:typeof getTwoFactorStatus;notify:typeof deliverSecurityEvent};
const defaults:Dependencies={authenticate:requireMobileSecurity,rateLimit:checkAuthRateLimit,verify:verifySecondFactor,passwordHash:async id=>(await getPrisma().user.findUnique({where:{id},select:{passwordHash:true}}))?.passwordHash??null,compare:bcrypt.compare,disable:disableTwoFactorForSession,status:getTwoFactorStatus,notify:deliverSecurityEvent};
export function createDisableHandler(deps:Dependencies=defaults){return async(request:Request)=>{const auth=await deps.authenticate(request);if(!auth)return mobileUnauthorized();
 try{deps.rateLimit({action:"two-factor-disable",email:auth.user.email,request,limit:10,windowMs:15*60*1000});}catch(error){if(error instanceof AuthRateLimitError)return NextResponse.json({error:"Too many attempts. Please wait and try again."},{status:429,headers:{"Retry-After":String(error.retryAfterSeconds)}});throw error;}
 const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:"Verify this security change."},{status:400});
 try{let verified=hasRecentReauthentication(auth);if(!verified&&parsed.data.code)verified=await deps.verify({userId:auth.user.id,code:parsed.data.code});if(!verified&&parsed.data.password){const hash=await deps.passwordHash(auth.user.id);verified=Boolean(hash&&await deps.compare(parsed.data.password,hash));}if(!verified)return NextResponse.json({error:"Unable to verify that request."},{status:403});
 const event=await deps.disable({userId:auth.user.id,accountSessionId:auth.id,assuranceLevel:auth.assuranceLevel});await deps.notify({userId:auth.user.id,email:auth.user.email,securityEventId:event.id,title:"Two-factor authentication disabled",body:"Two-factor authentication was disabled for your Kurioticket account. If this wasn’t you, reset your password and contact Support immediately."}).catch(()=>undefined);return NextResponse.json({ok:true,twoFactor:await deps.status(auth.user.id)});}catch{return NextResponse.json({error:"Unable to disable two-factor authentication."},{status:503});}
};}
export const POST=createDisableHandler();
