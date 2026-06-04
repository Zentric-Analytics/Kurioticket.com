import { NextResponse } from "next/server";
import { requireAdminApiSession, parsePositiveInt } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const requestedRole = url.searchParams.get("role") || "ALL";
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(requestedRole)
    ? requestedRole
    : "ALL";
  const status = url.searchParams.get("status") || "ALL";
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 1000);
  const take = parsePositiveInt(url.searchParams.get("take"), 25, 100);
  const skip = (page - 1) * take;

  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };

  const [users, total] = await Promise.all([
    getPrisma().user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    getPrisma().user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, take });
}
