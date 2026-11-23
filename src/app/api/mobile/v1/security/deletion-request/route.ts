import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileUnauthorized, requireMobileSecurity } from "@/lib/mobile-security-route";
import { getCurrentDeletionRequest, requestAccountDeletion } from "@/services/accountDeletionService";
export const runtime="nodejs";
const schema=z.object({confirmed:z.literal(true)});
type Auth={user:{id:string;email:string}};
type Deletion={id:string;status:string;requestedAt:Date;deletionScheduledAt:Date;cancelledAt?:Date|null;completedAt?:Date|null};
type Dependencies={authenticate:(r:Request)=>Promise<Auth|null>;get:typeof getCurrentDeletionRequest;request:typeof requestAccountDeletion};
const serialize=(value:Deletion)=>({id:value.id,status:value.status,requestedAt:value.requestedAt.toISOString(),deletionScheduledAt:value.deletionScheduledAt.toISOString(),cancelledAt:value.cancelledAt?.toISOString()??null,completedAt:value.completedAt?.toISOString()??null,canReactivate:value.deletionScheduledAt>new Date()});
export function createDeletionHandlers(deps:Dependencies={authenticate:requireMobileSecurity,get:getCurrentDeletionRequest,request:requestAccountDeletion}){return {
 GET:async(request:Request)=>{const auth=await deps.authenticate(request);if(!auth)return mobileUnauthorized();try{const current=await deps.get(auth.user.id);return NextResponse.json({request:current?serialize(current):null});}catch{return NextResponse.json({error:"Unable to load account deletion status."},{status:503});}},
 POST:async(request:Request)=>{const auth=await deps.authenticate(request);if(!auth)return mobileUnauthorized();const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:"Confirm that you want to request account deletion."},{status:400});try{const result=await deps.request({userId:auth.user.id,email:auth.user.email});return NextResponse.json({request:serialize(result.request),created:result.created},{status:result.created?201:200});}catch(error){const admin=error instanceof Error&&error.message==="AdminDeletionBlocked";return NextResponse.json({error:admin?"Admin accounts cannot use self-service deletion.":"Unable to request account deletion."},{status:admin?403:503});}}
};}
export const {GET,POST}=createDeletionHandlers();
