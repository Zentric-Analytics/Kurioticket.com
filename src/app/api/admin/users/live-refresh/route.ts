import { requireAdminApiSession } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };

/** Permission/connectivity probe only. Actual records use the existing authorized page readers. */
export async function GET() {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) {
      for (const [name, value] of Object.entries(headers)) auth.response.headers.set(name, value);
      return auth.response;
    }
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
