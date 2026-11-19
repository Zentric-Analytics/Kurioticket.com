import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";

export const runtime = "nodejs";

// The per-admin acknowledged-warning display preference is retired. Keep the
// authenticated endpoint for old clients, but never silently mutate a setting
// that no longer affects the notification drawer. Existing audit records stay intact.
const retired = () => NextResponse.json(
  { error: "The acknowledged-warning display setting has been retired." },
  { status: 410, headers: { "Cache-Control": "no-store" } },
);

export async function GET() {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;
  return retired();
}

export async function PATCH() {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;
  return retired();
}
