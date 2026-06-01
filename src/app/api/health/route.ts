import { NextResponse } from "next/server";
import { getOptionalPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const db = getOptionalPrisma();
  let database: { configured: boolean; connected: boolean; error?: string } = {
    configured: isDatabaseConfigured(),
    connected: false,
  };

  if (db) {
    try {
      await db.$queryRaw`SELECT 1`;
      database = { configured: true, connected: true };
    } catch (error) {
      console.error("[health:database]", error);
      database = {
        configured: true,
        connected: false,
        error: "Database connection failed. Check DATABASE_URL and PostgreSQL availability.",
      };
    }
  }

  return NextResponse.json({
    ok: database.configured && database.connected,
    service: "kurioticket",
    time: new Date().toISOString(),
    database,
  });
}