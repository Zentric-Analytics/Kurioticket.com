import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  curioticketPrisma?: PrismaClient;
};

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  if (!globalForPrisma.curioticketPrisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    globalForPrisma.curioticketPrisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.curioticketPrisma;
}

export function getOptionalPrisma() {
  if (!process.env.DATABASE_URL) return null;
  return getPrisma();
}

export async function withOptionalDb<T>(task: (db: PrismaClient) => Promise<T>, fallback: T) {
  const db = getOptionalPrisma();
  if (!db) return fallback;

  try {
    return await task(db);
  } catch (error) {
    console.error("[database]", error);
    return fallback;
  }
}
