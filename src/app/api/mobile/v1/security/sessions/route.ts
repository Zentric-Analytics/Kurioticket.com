import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { activeSecuritySessions } from "@/lib/security-service";
type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; list: typeof activeSecuritySessions };
const defaults: Dependencies = { authenticate: requireMobileSecurity, list: activeSecuritySessions };
export function createSessionsHandler(dependencies: Dependencies = defaults) { return async function GET(request: Request) { try { const auth = await dependencies.authenticate(request); if (!auth) return mobileUnauthorized(); return NextResponse.json({ sessions: await dependencies.list(auth.user.id, auth.id) }); } catch { return NextResponse.json({ error: "Unable to load devices." }, { status: 503 }); } }; }
export const GET = createSessionsHandler();
