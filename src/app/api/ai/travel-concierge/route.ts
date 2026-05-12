import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { explainTravelOptions } from "@/services/aiTravelService";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isPremium) {
    return NextResponse.json({ error: "AI Travel Concierge is a premium feature." }, { status: 403 });
  }

  const body = (await request.json()) as { question?: string; flights?: unknown[]; hotels?: unknown[] };
  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Ask a travel optimization question." }, { status: 400 });
  }

  const analysis = await explainTravelOptions({
    userId: session.user.id,
    question: body.question,
    flights: body.flights as never,
    hotels: body.hotels as never,
  });

  return NextResponse.json(analysis);
}
