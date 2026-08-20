import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { securityActivity } from "@/lib/security-service";
type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; list: typeof securityActivity };
const defaults: Dependencies = { authenticate: requireMobileSecurity, list: securityActivity };
export function createActivityHandler(dependencies: Dependencies = defaults) { return async function GET(request: Request) { try { const auth = await dependencies.authenticate(request); if (!auth) return mobileUnauthorized(); return NextResponse.json({ events: await dependencies.list(auth.user.id) }); } catch { return NextResponse.json({ error: "Unable to load security activity." }, { status: 503 }); } }; }
export const GET = createActivityHandler();
