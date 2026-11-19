import { NextResponse } from "next/server";

import { hasRecentReauthentication } from "@/lib/account-session";
import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { CmsContentError, cmsContentTypes } from "@/services/cmsContentService";
import {
  normalizeCmsDraftOrder,
  setCmsLegacyFallbackRetired,
} from "@/services/cmsHardeningService";
import type { CmsContentType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const action = typeof input.action === "string" ? input.action : "";
  const type =
    typeof input.type === "string" &&
    cmsContentTypes.includes(input.type as CmsContentType)
      ? input.type as CmsContentType
      : null;
  const market = typeof input.market === "string" ? input.market.trim().toUpperCase() : "";
  const locale = typeof input.locale === "string" ? input.locale.trim().toLowerCase() : "";
  const expectedScopeVersion = Number(input.expectedScopeVersion);

  if (
    !type ||
    !market ||
    !locale ||
    !Number.isInteger(expectedScopeVersion) ||
    expectedScopeVersion < 1
  ) {
    return NextResponse.json({ error: "Invalid CMS scope request." }, { status: 400 });
  }

  const protectedPolicyChange =
    action === "retire_legacy_fallback" ||
    action === "reactivate_legacy_fallback";

  if (
    protectedPolicyChange &&
    !isStagingEnvironment() &&
    !hasRecentReauthentication(auth.accountSession)
  ) {
    return NextResponse.json(
      {
        error: "Recent trusted authentication is required for production fallback policy changes.",
        errorCode: "recent_reauthentication_required",
      },
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
    if (action === "normalize_draft_order") {
      const result = await normalizeCmsDraftOrder(
        { type, market, locale, expectedScopeVersion },
        actor,
      );
      return NextResponse.json(result);
    }

    if (action === "retire_legacy_fallback") {
      const result = await setCmsLegacyFallbackRetired(
        {
          type,
          market,
          locale,
          expectedScopeVersion,
          retired: true,
        },
        actor,
      );
      return NextResponse.json(result);
    }

    if (action === "reactivate_legacy_fallback") {
      const result = await setCmsLegacyFallbackRetired(
        {
          type,
          market,
          locale,
          expectedScopeVersion,
          retired: false,
        },
        actor,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unsupported CMS scope action." }, { status: 400 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

function cmsErrorResponse(error: unknown) {
  if (!(error instanceof CmsContentError)) {
    console.error("[admin-cms:scope]", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "CMS scope operation is unavailable." }, { status: 503 });
  }

  const status =
    error.code === "INVALID" ? 400 :
    error.code === "NOT_FOUND" ? 404 :
    error.code === "CONFLICT" ? 409 :
    error.code === "ARCHIVED" ? 409 :
    503;

  return NextResponse.json(
    {
      error: error.message,
      errorCode: `cms_${error.code.toLowerCase()}`,
      ...(error.issues ? { issues: error.issues } : {}),
    },
    { status },
  );
}
