import { NextResponse } from "next/server";
import { z } from "zod";
import { validateMobileDeletionReactivationBearer } from "@/lib/account-session";
import { mobileUnauthorized } from "@/lib/mobile-security-route";
import { reactivateAccount } from "@/services/accountDeletionService";
export const runtime="nodejs";
type Auth={id:string;tokenHash:string|null;user:{id:string;email:string}};
type Dependencies={authenticate:(r:Request)=>Promise<Auth|null>;reactivate:typeof reactivateAccount};
const confirmation = z.object({ confirmed: z.literal(true) });
export function createReactivateHandler(deps: Dependencies = { authenticate: validateMobileDeletionReactivationBearer, reactivate: reactivateAccount }) {
  return async (request: Request) => {
    const auth = await deps.authenticate(request);
    if (!auth?.tokenHash) return mobileUnauthorized();
    if (!confirmation.safeParse(await request.json().catch(() => null)).success) return NextResponse.json({ error: "Confirm that you want to keep your account." }, { status: 400 });
    try {
      const value = await deps.reactivate(auth.user.id, auth.user.email, undefined, { sessionId: auth.id, tokenHash: auth.tokenHash });
      return NextResponse.json({ success: true, request: { id: value.id, status: value.status, cancelledAt: value.cancelledAt?.toISOString() ?? null } });
    } catch (error) {
      const expired = error instanceof Error && error.message === "GracePeriodExpired";
      const missing = error instanceof Error && error.message === "NoPendingRequest";
      const denied = error instanceof Error && ["RecoveryAuthorizationRequired", "AccountUnavailable"].includes(error.message);
      return NextResponse.json({ error: expired ? "The 7-day reactivation window has expired. Contact support." : missing ? "No pending deletion request was found." : "Unable to reactivate account." }, { status: denied ? 401 : expired ? 410 : missing ? 404 : 503 });
    }
  };
}
export const POST=createReactivateHandler();
