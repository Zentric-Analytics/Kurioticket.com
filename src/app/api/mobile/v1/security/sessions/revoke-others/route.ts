import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { revokeOtherSessions } from "@/lib/security-service";

type Auth = { id: string; user: { id: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; revokeOthers: typeof revokeOtherSessions };
const defaults: Dependencies = { authenticate: requireMobileSecurity, revokeOthers: revokeOtherSessions };

export function createRevokeOthersHandler(dependencies: Dependencies = defaults) {
  return async function POST(request: Request) {
    try {
      const auth = await dependencies.authenticate(request);
      if (!auth) return mobileUnauthorized();
      await dependencies.revokeOthers(auth.user.id, auth.id);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Unable to sign out other devices." }, { status: 503 });
    }
  };
}

export const POST = createRevokeOthersHandler();
