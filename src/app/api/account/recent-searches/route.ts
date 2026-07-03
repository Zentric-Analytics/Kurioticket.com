import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  clearUserRecentSearches,
  deleteRecentSearchInputSchema,
  deleteUserRecentSearch,
  listUserRecentSearches,
  recentSearchInputSchema,
  upsertUserRecentSearch,
} from "@/services/recentSearchesService";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const items = await listUserRecentSearches(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[recent-searches:get]", error);
    return NextResponse.json({ error: "Unable to load recent searches." }, { status: 500 });
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
    return NextResponse.json({ error: "Invalid recent search payload." }, { status: 400 });
  }

  const parsed = recentSearchInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recent search payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const item = await upsertUserRecentSearch(session.user.id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[recent-searches:post]", error);
    return NextResponse.json({ error: "Unable to sync recent search." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clear = searchParams.get("clear");

  if (clear === "all") {
    try {
      await clearUserRecentSearches(session.user.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[recent-searches:clear]", error);
      return NextResponse.json({ error: "Unable to clear recent searches." }, { status: 500 });
    }
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid recent search delete request." }, { status: 400 });
  }

  const parsed = deleteRecentSearchInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recent search delete request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await deleteUserRecentSearch(session.user.id, parsed.data.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[recent-searches:delete]", error);
    return NextResponse.json({ error: "Unable to delete recent search." }, { status: 500 });
  }
}
