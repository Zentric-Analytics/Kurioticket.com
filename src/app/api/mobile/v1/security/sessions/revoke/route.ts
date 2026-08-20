import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { revokeSession } from "@/lib/security-service";
const schema = z.object({ sessionId: z.string().min(1) }).strict();
type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; revoke: typeof revokeSession };
const defaults: Dependencies = { authenticate: requireMobileSecurity, revoke: revokeSession };
export function createRevokeHandler(dependencies: Dependencies = defaults) { return async function PATCH(request: Request) { let auth: Auth; try { auth = await dependencies.authenticate(request); } catch { return NextResponse.json({ error: "Unable to authenticate." }, { status: 500 }); } if (!auth) return mobileUnauthorized(); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose a valid device." }, { status: 400 }); if (parsed.data.sessionId === auth.id) return NextResponse.json({ error: "Use Sign out to end this device." }, { status: 400 }); try { return await dependencies.revoke(auth.user.id, parsed.data.sessionId) ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Device not found." }, { status: 404 }); } catch { return NextResponse.json({ error: "Unable to remove device." }, { status: 503 }); } }; }
export const PATCH = createRevokeHandler();
