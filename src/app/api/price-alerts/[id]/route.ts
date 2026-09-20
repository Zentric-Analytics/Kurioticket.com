import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWebApiSession } from "@/lib/web-api-auth";
import {
  InvalidPriceAlertTransitionError,
  PriceAlertNotFoundError,
  PriceAlertUnavailableError,
  updateUserPriceAlertStatus,
} from "@/services/priceTrackingService";

const idSchema = z.string().trim().min(1).max(128);
const patchSchema = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) }).strict();

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required to update price alerts." }, { status: 401 });
  }

  const id = idSchema.safeParse((await params).id);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = patchSchema.safeParse(body);

  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: "Please check the alert update." }, { status: 400 });
  }

  try {
    const alert = await updateUserPriceAlertStatus({
      id: id.data,
      userId: session.user.id,
      status: parsed.data.status,
    });
    return NextResponse.json({ alert });
  } catch (error) {
    if (error instanceof PriceAlertUnavailableError) {
      return NextResponse.json({ error: error.message, code: "FEATURE_DISABLED" }, { status: 503 });
    }
    if (error instanceof PriceAlertNotFoundError) {
      return NextResponse.json({ error: "Price alert not found." }, { status: 404 });
    }
    if (error instanceof InvalidPriceAlertTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update price alert." }, { status: 503 });
  }
}
