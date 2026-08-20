import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";
import { getTravelPreferencesForUser, patchTravelPreferencesForUser, travelPreferencesPatchSchema } from "@/services/travelPreferencesService";
type Session = { user: { id: string; status: string } } | null;
export function createMobileTravelPreferencesHandlers(deps = { session: getMobileSession, prisma: getPrisma() }) {
  async function id(request: Request) { const session = await deps.session(request) as Session; return session?.user.status === "ACTIVE" ? session.user.id : null; }
  return {
    GET: async (request: Request) => { const userId = await id(request); if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); try { return NextResponse.json(await getTravelPreferencesForUser(deps.prisma, userId)); } catch { return NextResponse.json({ error: "Unable to load travel preferences." }, { status: 503 }); } },
    PATCH: async (request: Request) => { const userId = await id(request); if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 }); const parsed = travelPreferencesPatchSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please check your travel preferences and try again." }, { status: 400 }); try { return NextResponse.json(await patchTravelPreferencesForUser(deps.prisma, userId, parsed.data)); } catch { return NextResponse.json({ error: "Unable to save travel preferences." }, { status: 503 }); } },
  };
}
function production() { return createMobileTravelPreferencesHandlers({ session: getMobileSession, prisma: getPrisma() }); }
export async function GET(request: Request) { return production().GET(request); }
export async function PATCH(request: Request) { return production().PATCH(request); }
