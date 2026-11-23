import { NextResponse } from "next/server";

import { hasRecentReauthentication } from "@/lib/account-session";
import { getRequestIp, requireAdminApiSession } from "@/lib/admin";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { CmsContentError } from "@/services/cmsContentService";
import { initializeHomepageCms } from "@/services/homepageCmsService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  if (!isStagingEnvironment() && !hasRecentReauthentication(auth.accountSession)) {
    return NextResponse.json(
      {
        error: "Recent trusted authentication is required for production publishing.",
        errorCode: "recent_reauthentication_required",
      },
      { status: 403 },
    );
  }

  try {
    const result = await initializeHomepageCms({
      id: auth.session.user.id,
      email: auth.session.user.email || "",
      ipAddress: getRequestIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return NextResponse.json({ initialized: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof CmsContentError) {
      const status =
        error.code === "CONFLICT" ? 409 :
        error.code === "INVALID" ? 400 :
        503;
      return NextResponse.json(
        { error: error.message, errorCode: `cms_${error.code.toLowerCase()}` },
        { status },
      );
    }

    console.error("[admin-cms:homepage-initialize]", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Homepage CMS initialization is unavailable." },
      { status: 503 },
    );
  }
}
