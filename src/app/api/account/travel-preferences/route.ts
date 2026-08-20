import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getPrisma } from "@/lib/prisma";
import { getTravelPreferencesForUser, patchTravelPreferencesForUser, travelPreferencesPatchSchema } from "@/services/travelPreferencesService";
export { mergeLegacyNotificationPreferences, travelPreferencesPatchSchema } from "@/services/travelPreferencesService";
export const runtime = "nodejs";
async function userId() { return (await requireWebApiSession())?.session?.user?.id ?? null; }
export async function GET() { const id = await userId(); if (!id) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await getTravelPreferencesForUser(getPrisma(), id)); } catch (error) { console.error("[account-travel-preferences:get]", error); return NextResponse.json({ error: "Unable to load travel preferences." }, { status: 500 }); } }
export async function PATCH(request: Request) { const id = await userId(); if (!id) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { const payload = travelPreferencesPatchSchema.parse(await request.json()); return NextResponse.json(await patchTravelPreferencesForUser(getPrisma(), id, payload)); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Please check your travel preferences and try again." }, { status: 400 }); console.error("[account-travel-preferences:patch]", error); return NextResponse.json({ error: "Unable to save travel preferences." }, { status: 500 }); } }
