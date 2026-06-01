import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  kurioticketPrisma?: PrismaClient;
};

const databaseUrlEnvNames = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"] as const;

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database access is not available. Check DATABASE_URL and run database migrations.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

export function getDatabaseUrl() {
  for (const name of databaseUrlEnvNames) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getPrisma() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new DatabaseUnavailableError("Database access is not available. Set DATABASE_URL for this deployment.");
  }

  if (!globalForPrisma.kurioticketPrisma) {
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.kurioticketPrisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.kurioticketPrisma;
}

export function getOptionalPrisma() {
  if (!isDatabaseConfigured()) return null;
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
