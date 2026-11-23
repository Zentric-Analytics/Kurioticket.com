import { NextResponse } from "next/server";

import { cmsImageContentType } from "@/lib/cmsImageUploadRules";
import { loadCmsImage } from "@/services/cmsImageStorage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const mime = cmsImageContentType(filename);
  if (!mime) return new NextResponse(null, { status: 404 });

  let upstream: Response | null;
  try {
    upstream = await loadCmsImage(filename);
  } catch {
    return new NextResponse(null, { status: 503 });
  }
  if (!upstream) return new NextResponse(null, { status: 503 });
  if (upstream.status === 404) return new NextResponse(null, { status: 404 });
  if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: 503 });

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
