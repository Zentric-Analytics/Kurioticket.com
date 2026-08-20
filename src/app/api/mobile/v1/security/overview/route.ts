import { NextResponse } from "next/server";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { securityOverview } from "@/lib/security-service";

type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; load: typeof securityOverview };
const defaults: Dependencies = { authenticate: requireMobileSecurity, load: securityOverview };
export function createOverviewHandler(dependencies: Dependencies = defaults) { return async function GET(request: Request) { try { const auth = await dependencies.authenticate(request); if (!auth) return mobileUnauthorized(); return NextResponse.json({ overview: await dependencies.load(auth.user.id) }); } catch { return NextResponse.json({ error: "Unable to load security settings." }, { status: 503 }); } }; }
export const GET = createOverviewHandler();
