import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type DealsFlightInventoryRow = {
  tokenHash: string;
  schemaVersion: number;
  sourceSearchKey: string;
  searchPayload: unknown;
  inventoryPayload: unknown;
  expiresAt: Date;
  createdAt: Date;
};

export interface DealsFlightInventoryStore {
  create(row: DealsFlightInventoryRow): Promise<void>;
  find(tokenHash: string): Promise<DealsFlightInventoryRow | null>;
  delete(tokenHash: string): Promise<void>;
  deleteExpired(before: Date, limit: number): Promise<number>;
}

export const prismaDealsFlightInventoryStore: DealsFlightInventoryStore = {
  async create(row) {
    await getPrisma().dealsFlightInventorySession.create({
      data: {
        ...row,
        searchPayload: row.searchPayload as Prisma.InputJsonValue,
        inventoryPayload: row.inventoryPayload as Prisma.InputJsonValue,
      },
    });
  },
  async find(tokenHash) {
    return getPrisma().dealsFlightInventorySession.findUnique({
      where: { tokenHash },
    });
  },
  async delete(tokenHash) {
    await getPrisma().dealsFlightInventorySession.deleteMany({
      where: { tokenHash },
    });
  },
  async deleteExpired(before, limit) {
    const rows = await getPrisma().dealsFlightInventorySession.findMany({
      where: { expiresAt: { lte: before } },
      select: { id: true },
      take: limit,
    });
    if (!rows.length) return 0;
    return (
      await getPrisma().dealsFlightInventorySession.deleteMany({
        where: { id: { in: rows.map(({ id }) => id) } },
      })
    ).count;
  },
};
