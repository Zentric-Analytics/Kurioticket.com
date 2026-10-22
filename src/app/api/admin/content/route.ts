import { NextResponse } from "next/server";

import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import {
  CmsContentError,
  cmsContentTypes,
  createCmsContent,
  listAdminCmsContent,
} from "@/services/cmsContentService";
import type { CmsContentStatus, CmsContentType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const statuses = new Set<CmsContentStatus>(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);
const types = new Set<CmsContentType>(cmsContentTypes);

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  if (type && !types.has(type as CmsContentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }
  if (status && !statuses.has(status as CmsContentStatus)) {
    return NextResponse.json({ error: "Invalid content status." }, { status: 400 });
  }

  try {
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    const result = await listAdminCmsContent({
      type: type as CmsContentType | undefined,
      status: status as CmsContentStatus | undefined,
      market: url.searchParams.get("market") || undefined,
      locale: url.searchParams.get("locale") || undefined,
      limit,
      cursor: url.searchParams.get("cursor") || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

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
    const item = await createCmsContent(body, actor(auth, request));
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

function actor(auth: Awaited<ReturnType<typeof requireAdminApiSession>>, request: Request) {
  if (auth.response) throw new Error("Admin session unavailable.");
  return {
    id: auth.session.user.id,
    email: auth.session.user.email || "",
    ipAddress: getRequestIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

function cmsErrorResponse(error: unknown) {
  if (!(error instanceof CmsContentError)) {
    console.error("[admin-cms]", { errorName: error instanceof Error ? error.name : "unknown" });
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
