import { NextResponse } from "next/server";

import { getPublishedFaqs } from "@/services/publicCmsContentService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");

  try {
    const result = await getPublishedFaqs(locale);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[public-cms:faqs]", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "FAQ content is unavailable." }, { status: 503 });
  }
}
