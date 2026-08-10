import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { featureControlKeys } from "@/lib/feature-controls/registry";
import { listFeatureControls, mutateFeatureControl } from "@/lib/feature-controls/service";

const mutationSchema = z.object({ key: z.enum(featureControlKeys as [typeof featureControlKeys[number], ...typeof featureControlKeys[number][]]), environment: z.enum(["STAGING", "PRODUCTION"]), enabled: z.boolean(), reason: z.string().trim().max(500).optional() }).strict();

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ controls: await listFeatureControls() });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid feature control request.", issues: parsed.error.flatten() }, { status: 400 });
  const email = auth.session.user.email?.trim().toLowerCase() || "";
  if (parsed.data.environment === "PRODUCTION") {
    if (!getFeatureControlProductionAdmins().includes(email)) {
      console.warn("[feature-controls:production-denied]", { adminUserId: auth.session.user.id });
      return NextResponse.json({ error: "Production feature control permission required." }, { status: 403 });
    }
    if (!parsed.data.reason?.trim()) return NextResponse.json({ error: "A reason is required for production changes." }, { status: 400 });
  }
  try {
    const result = await mutateFeatureControl({ ...parsed.data, actor: { id: auth.session.user.id, email, ipAddress: getRequestIp(request), userAgent: request.headers.get("user-agent") || undefined } });
    return NextResponse.json({ changed: result.changed, key: parsed.data.key, environment: parsed.data.environment, enabled: result.state.enabled });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid feature control request." }, { status: 400 });
    console.error("[feature-controls:mutation-failed]", { key: parsed.data.key, environment: parsed.data.environment, errorName: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Feature control could not be changed. No change was applied." }, { status: 503 });
  }
}
