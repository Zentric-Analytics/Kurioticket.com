import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const result = await prisma.accountDeletionRequest.updateMany({
    where: { status: "PENDING", deletionScheduledAt: { lte: new Date() }, cancelledAt: null, completedAt: null, user: { role: { not: "ADMIN" } } },
    data: { status: "READY_FOR_REVIEW", reviewNotes: "Grace period expired. Review retention obligations before permanent anonymization/deletion." },
  });
  console.log(`Marked ${result.count} account deletion requests ready for deletion review.`);
} finally {
  await prisma.$disconnect();
}
