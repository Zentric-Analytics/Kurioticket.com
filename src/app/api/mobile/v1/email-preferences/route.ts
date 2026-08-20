import { handleEmailPreferencesGet, handleEmailPreferencesPatch } from "@/app/api/account/email-preferences/route";
import { getMobileSession } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";

type Session = { user: { id: string; status: string } } | null;
type CanonicalPrisma = Parameters<typeof handleEmailPreferencesGet>[1];
export function createMobileEmailPreferencesHandlers(deps: { session: (request: Request) => Promise<Session>; prisma: CanonicalPrisma } = { session: getMobileSession, prisma: getPrisma() }) {
  async function id(request: Request) { const session = await deps.session(request); return session?.user.status === "ACTIVE" ? session.user.id : null; }
  return {
    GET: async (request: Request) => handleEmailPreferencesGet(await id(request), deps.prisma),
    PATCH: async (request: Request) => handleEmailPreferencesPatch(await id(request), request, deps.prisma),
  };
}
function production() { return createMobileEmailPreferencesHandlers({ session: getMobileSession, prisma: getPrisma() }); }
export async function GET(request: Request) { return production().GET(request); }
export async function PATCH(request: Request) { return production().PATCH(request); }
