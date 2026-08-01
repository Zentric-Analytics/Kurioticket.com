import { NextResponse } from "next/server";
import { getHotelFromCache, toPublicHotel } from "@/lib/searchCache";
export function GET(request:Request){const id=new URL(request.url).searchParams.get("id")?.trim();if(!id)return NextResponse.json({error:"Hotel id is required."},{status:400});const hotel=getHotelFromCache(id);return hotel?NextResponse.json({hotel:toPublicHotel(hotel)}):NextResponse.json({error:"This hotel quote is no longer available. Please search again for current prices."},{status:404});}
