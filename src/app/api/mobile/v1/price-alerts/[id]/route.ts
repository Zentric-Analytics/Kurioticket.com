import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileSession } from "@/lib/mobile-auth";
import { deleteUserPriceAlert, InvalidPriceAlertTransitionError, PriceAlertNotFoundError, updateUserPriceAlertStatus } from "@/services/priceTrackingService";

const idSchema = z.string().trim().min(1).max(128);
const patchSchema = z.object({ status: z.enum(["ACTIVE", "PAUSED"]) }).strict();
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request) {
  const session = await getMobileSession(request);
  return session?.user.status === "ACTIVE" ? session : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await authorize(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const id = idSchema.safeParse((await params).id);
  let body: unknown; try { body = await request.json(); } catch { body = null; }
  const parsed = patchSchema.safeParse(body);
  if (!id.success || !parsed.success) return NextResponse.json({ error: "Please check the alert update." }, { status: 400 });
  try { return NextResponse.json({ alert: await updateUserPriceAlertStatus({ id: id.data, userId: session.user.id, status: parsed.data.status }) }); }
  catch (error) {
    if (error instanceof PriceAlertNotFoundError) return NextResponse.json({ error: "Price alert not found." }, { status: 404 });
    if (error instanceof InvalidPriceAlertTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Unable to update price alert." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const session = await authorize(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Price alert not found." }, { status: 404 });
  try { return NextResponse.json(await deleteUserPriceAlert({ id: id.data, userId: session.user.id })); }
  catch (error) {
    if (error instanceof PriceAlertNotFoundError) return NextResponse.json({ error: "Price alert not found." }, { status: 404 });
    return NextResponse.json({ error: "Unable to delete price alert." }, { status: 503 });
  }
}
