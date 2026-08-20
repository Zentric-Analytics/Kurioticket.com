import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { saveSecurityAlerts } from "@/lib/security-service";
const schema = z.object({ securityEmailAlerts: z.boolean() }).strict();
type Auth = { id: string; user: { id: string; email: string } } | null;
type Dependencies = { authenticate: (request: Request) => Promise<Auth>; save: typeof saveSecurityAlerts };
const defaults: Dependencies = { authenticate: requireMobileSecurity, save: saveSecurityAlerts };
export function createPreferencesHandler(dependencies: Dependencies = defaults) { return async function PATCH(request: Request) { let auth: Auth; try { auth = await dependencies.authenticate(request); } catch { return NextResponse.json({ error: "Unable to authenticate." }, { status: 500 }); } if (!auth) return mobileUnauthorized(); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please check the security preference." }, { status: 400 }); try { return NextResponse.json({ preferences: await dependencies.save(auth.user.id, parsed.data.securityEmailAlerts) }); } catch { return NextResponse.json({ error: "Unable to save security preferences." }, { status: 503 }); } }; }
export const PATCH = createPreferencesHandler();
