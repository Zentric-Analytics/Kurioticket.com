import { NextResponse } from "next/server";

import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { hasRecentReauthentication } from "@/lib/account-session";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import {
  archiveCmsContent,
  CmsContentError,
  getAdminCmsContent,
  hideCmsContent,
  publishCmsContent,
  updateCmsContentDraft,
} from "@/services/cmsContentService";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    return NextResponse.json(await getAdminCmsContent(id));
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { action?: unknown }).action !== "string") {
    return NextResponse.json({ error: "CMS action is required." }, { status: 400 });
  }

  const { action, ...input } = body as Record<string, unknown>;
  const protectedTransition = action === "publish" || action === "hide" || action === "archive";
  if (protectedTransition && !isStagingEnvironment() && !hasRecentReauthentication(auth.accountSession)) {
    return NextResponse.json(
      { error: "Recent trusted authentication is required for production publishing.", errorCode: "recent_reauthentication_required" },
      { status: 403 },
    );
  }
  const actor = {
    id: auth.session.user.id,
    email: auth.session.user.email || "",
    ipAddress: getRequestIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  };

  try {
    const item =
      action === "save_draft" ? await updateCmsContentDraft(id, input, actor) :
      action === "publish" ? await publishCmsContent(id, input, actor) :
      action === "hide" ? await hideCmsContent(id, input, actor) :
      action === "archive" ? await archiveCmsContent(id, input, actor) :
      null;
    if (!item) return NextResponse.json({ error: "Unsupported CMS action." }, { status: 400 });
    return NextResponse.json({ item });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

function cmsErrorResponse(error: unknown) {
  if (!(error instanceof CmsContentError)) {
    console.error("[admin-cms:item]", { errorName: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "CMS operation is unavailable." }, { status: 503 });
  }
  const status =
    error.code === "INVALID" ? 400 :
    error.code === "NOT_FOUND" ? 404 :
    error.code === "CONFLICT" ? 409 :
    error.code === "ARCHIVED" ? 409 :
    503;
  return NextResponse.json(
    { error: error.message, errorCode: `cms_${error.code.toLowerCase()}`, ...(error.issues ? { issues: error.issues } : {}) },
    { status },
  );
}
