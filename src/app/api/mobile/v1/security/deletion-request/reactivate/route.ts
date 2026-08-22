import { NextResponse } from "next/server";
import { validateMobileDeletionReactivationBearer } from "@/lib/account-session";
import { mobileUnauthorized } from "@/lib/mobile-security-route";
import { reactivateAccount } from "@/services/accountDeletionService";
export const runtime="nodejs";
type Auth={user:{id:string;email:string}};
type Dependencies={authenticate:(r:Request)=>Promise<Auth|null>;reactivate:typeof reactivateAccount};
export function createReactivateHandler(deps:Dependencies={authenticate:validateMobileDeletionReactivationBearer,reactivate:reactivateAccount}){return async(request:Request)=>{const auth=await deps.authenticate(request);if(!auth)return mobileUnauthorized();try{const value=await deps.reactivate(auth.user.id,auth.user.email);return NextResponse.json({success:true,request:{id:value.id,status:value.status,cancelledAt:value.cancelledAt?.toISOString()??null}});}catch(error){const expired=error instanceof Error&&error.message==="GracePeriodExpired";const missing=error instanceof Error&&error.message==="NoPendingRequest";return NextResponse.json({error:expired?"The 7-day reactivation window has expired. Contact support.":missing?"No pending deletion request was found.":"Unable to reactivate account."},{status:expired?410:missing?404:503});}};}
export const POST=createReactivateHandler();
