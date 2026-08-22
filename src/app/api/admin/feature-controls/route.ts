import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { featureControlKeys } from "@/lib/feature-controls/registry";
import { getRuntimeFeatureEnvironment, listFeatureControls, mutateFeatureControl } from "@/lib/feature-controls/service";
import { hasRecentReauthentication } from "@/lib/account-session";

export const featureControlMutationSchema = z.object({ key: z.enum(featureControlKeys as [typeof featureControlKeys[number], ...typeof featureControlKeys[number][]]), enabled: z.boolean(), reason: z.string().trim().max(500).optional() }).strict();
export function validateFeatureControlMutationAuthorization(environment: "STAGING" | "PRODUCTION", email: string, reason?: string) {
  if (environment === "STAGING") return null;
  if (!getFeatureControlProductionAdmins().includes(email.trim().toLowerCase())) return { error: "Production feature control permission required.", status: 403 } as const;
  if (!reason?.trim()) return { error: "A reason is required for production changes.", status: 400 } as const;
  return null;
}

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json(await listFeatureControls());
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = featureControlMutationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid feature control request.", issues: parsed.error.flatten() }, { status: 400 });
  const email = auth.session.user.email?.trim().toLowerCase() || "";
  const environment = getRuntimeFeatureEnvironment();
  const authorizationError = validateFeatureControlMutationAuthorization(environment, email, parsed.data.reason);
  if (authorizationError) {
    if (authorizationError.status === 403) {
      console.warn("[feature-controls:production-denied]", { adminUserId: auth.session.user.id });
    }
    return NextResponse.json({ error: authorizationError.error }, { status: authorizationError.status });
  }
  if (environment === "PRODUCTION" && !hasRecentReauthentication(auth.accountSession)) {
    return NextResponse.json({ error: "Recent trusted authentication is required for production changes.", code: "RECENT_REAUTHENTICATION_REQUIRED" }, { status: 403 });
  }
  try {
    const result = await mutateFeatureControl({ ...parsed.data, environment, actor: { id: auth.session.user.id, email, ipAddress: getRequestIp(request), userAgent: request.headers.get("user-agent") || undefined } });
    return NextResponse.json({ changed: result.changed, key: parsed.data.key, environment, enabled: result.state.enabled });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid feature control request." }, { status: 400 });
    console.error("[feature-controls:mutation-failed]", { key: parsed.data.key, environment, errorName: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Feature control could not be changed. No change was applied." }, { status: 503 });
  }
}
