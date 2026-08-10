import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getPrisma } from "@/lib/prisma";
export async function GET() { const auth=await requireWebApiSession(); if(!auth)return NextResponse.json({error:"Authentication required."},{status:401}); const events=await getPrisma().securityEvent.findMany({where:{userId:auth.userId},orderBy:{occurredAt:"desc"},take:10,select:{id:true,type:true,occurredAt:true,deviceLabel:true}}); return NextResponse.json({events}); }
