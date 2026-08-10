import { NextResponse } from "next/server";
import { getPublicFeatureAvailability } from "@/lib/feature-controls/service";
export async function GET() { return NextResponse.json(await getPublicFeatureAvailability(), { headers: { "Cache-Control": "private, max-age=5" } }); }
