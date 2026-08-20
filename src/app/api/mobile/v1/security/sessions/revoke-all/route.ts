import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { signOutEverywhere } from "@/lib/security-service";
type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; revokeAll: typeof signOutEverywhere };
const defaults: Dependencies = { authenticate: requireMobileSecurity, revokeAll: signOutEverywhere };
export function createRevokeAllHandler(dependencies: Dependencies = defaults) { return async function POST(request: Request) { try { const auth = await dependencies.authenticate(request); if (!auth) return mobileUnauthorized(); await dependencies.revokeAll(auth.user.id, auth.user.email); return NextResponse.json({ success: true }); } catch { return NextResponse.json({ error: "Unable to sign out every device." }, { status: 503 }); } }; }
export const POST = createRevokeAllHandler();
