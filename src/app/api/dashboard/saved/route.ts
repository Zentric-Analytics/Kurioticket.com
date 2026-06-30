import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import {
  createSavedItemInputSchema,
  createUserSavedItem,
  deleteSavedItemInputSchema,
  deleteUserSavedItem,
  DuplicateSavedItemError,
  isSavedItemType,
  listUserSavedItems,
  SavedItemNotFoundError,
} from "@/services/savedTripsService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type && !isSavedItemType(type)) {
    return NextResponse.json(
      { error: "Invalid saved item type.", allowedTypes: ["trip", "flight", "hotel", "search"] },
      { status: 400 },
    );
  }

  const itemType = type && isSavedItemType(type) ? type : undefined;

  try {
    const result = await listUserSavedItems(session.user.id, { type: itemType });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[dashboard-saved:get]", error);
    return NextResponse.json({ error: "Unable to load saved items." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid saved item payload." }, { status: 400 });
  }

  const parsed = createSavedItemInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid saved item payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await createUserSavedItem(session.user.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateSavedItemError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[dashboard-saved:post]", error);
    return NextResponse.json({ error: "Unable to save item." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid saved item delete request." }, { status: 400 });
  }

  const parsed = deleteSavedItemInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid saved item delete request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await deleteUserSavedItem(session.user.id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SavedItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid saved item delete request.", issues: error.flatten() },
        { status: 400 },
      );
    }

    console.error("[dashboard-saved:delete]", error);
    return NextResponse.json({ error: "Unable to delete saved item." }, { status: 500 });
  }
}
