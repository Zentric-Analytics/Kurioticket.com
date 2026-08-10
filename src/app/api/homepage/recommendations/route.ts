import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { z } from "zod";

import { buildHomepageRecommendationOrder } from "@/lib/recommendations/homepagePersonalization";
import { getHomepagePersonalizationSignals } from "@/services/homepageRecommendationService";

export const runtime = "nodejs";

const homepageRecommendationCardSchema = z.object({
  id: z.string().trim().min(1).max(256),
  destinationCode: z.string().trim().min(1).max(16),
});

const homepageRecommendationRequestSchema = z.object({
  surfaces: z.record(
    z.string().trim().min(1).max(64),
    z.array(homepageRecommendationCardSchema).max(100),
  ),
});

export async function POST(request: Request) {
  const session = (await resolveOptionalWebApiSession())?.session;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ order: {} });
  }

  const parsed = homepageRecommendationRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ order: {} });

  if (!session?.user?.id) return NextResponse.json({ order: {} });

  const destinationCodes = await getHomepagePersonalizationSignals(session.user.id);
  if (!destinationCodes.length) return NextResponse.json({ order: {} });

  return NextResponse.json({
    order: buildHomepageRecommendationOrder(parsed.data.surfaces, destinationCodes),
  });
}
