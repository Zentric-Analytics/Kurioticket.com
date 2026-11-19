import { NextResponse } from "next/server";import { androidAssociation } from "@/lib/webauthn-associations";
export const dynamic="force-dynamic";export async function GET(){try{return NextResponse.json(androidAssociation(),{headers:{"Cache-Control":"public, max-age=300"}});}catch{return NextResponse.json({error:"Association is not configured."},{status:503});}}
