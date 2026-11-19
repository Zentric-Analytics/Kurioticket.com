import { NextResponse } from "next/server";

import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { CmsContentError } from "@/services/cmsContentService";
import { reorderCmsDraftCards } from "@/services/cmsHardeningService";

export const runtime = "nodejs";

/** Save draft order only. Publishing remains a separate, protected action. */
export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await reorderCmsDraftCards(body, {
      id: auth.session.user.id,
      email: auth.session.user.email || "",
      ipAddress: getRequestIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (!(error instanceof CmsContentError)) {
      console.error("[admin-cms:reorder]", { errorName: error instanceof Error ? error.name : "unknown" });
      return NextResponse.json({ error: "Unable to save the new order." }, { status: 503 });
    }
    const status =
      error.code === "INVALID" ? 400 :
      error.code === "NOT_FOUND" ? 404 :
      error.code === "CONFLICT" || error.code === "ARCHIVED" ? 409 : 503;
    return NextResponse.json({
      error: error.message,
      errorCode: `cms_${error.code.toLowerCase()}`,
    }, { status });
  }
}
