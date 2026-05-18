import { NextResponse } from "next/server";
import { parsePositiveInt, requireAdminApiSession } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim();
  const adminEmail = url.searchParams.get("adminEmail")?.trim();
  const targetEmail = url.searchParams.get("targetEmail")?.trim();
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 1000);
  const take = parsePositiveInt(url.searchParams.get("take"), 50, 100);
  const skip = (page - 1) * take;
  const where = {
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
    ...(adminEmail ? { adminEmail: { contains: adminEmail, mode: "insensitive" as const } } : {}),
    ...(targetEmail ? { targetEmail: { contains: targetEmail, mode: "insensitive" as const } } : {}),
  };

  const [logs, total] = await Promise.all([
    getPrisma().adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    getPrisma().adminAuditLog.count({ where }),
  ]);
  return NextResponse.json({ logs, total, page, take });
}
