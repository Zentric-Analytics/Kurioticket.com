import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { priceAlertSchema } from "@/lib/validation";
import { createPriceAlert } from "@/services/priceTrackingService";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required to create price alerts." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = priceAlertSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the alert details.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const alert = await createPriceAlert({
      userId: session.user.id,
      isPremium: session.user.isPremium,
      ...parsed.data,
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create alert.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
