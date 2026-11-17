import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type LinkedCasePreview =
  | {
      kind: "deletion";
      id: string;
      status: "PENDING" | "READY_FOR_REVIEW" | "CANCELLED" | "COMPLETED";
      requestedAt: string;
      deletionScheduledAt: string;
      cancelledAt: string | null;
      completedAt: string | null;
    }
  | {
      kind: "support";
      id: string;
      subject: string;
      category: string;
      status: "OPEN" | "WAITING_ON_USER" | "WAITING_ON_TEAM" | "RESOLVED" | "CLOSED";
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    };

export type LinkedCasePreviewResult =
  | { status: "ok"; data: LinkedCasePreview }
  | { status: "forbidden" | "not_found" | "unavailable" | "invalid" };

export type LinkedCaseOrigin = "support" | "deletion";

type Database = Pick<PrismaClient, "supportTicket" | "accountDeletionRequest">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => Database | null;
};

const CASE_ID = /^[A-Za-z0-9_-]{6,128}$/;

// Select ONLY the fields allowed in a cross-workspace preview. In particular,
// never select deletion review notes, account identity, or support messages.
const deletionPreviewSelect = {
  id: true,
  status: true,
  requestedAt: true,
  deletionScheduledAt: true,
  cancelledAt: true,
  completedAt: true,
} satisfies Prisma.AccountDeletionRequestSelect;

const supportPreviewSelect = {
  id: true,
  subject: true,
  category: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketSelect;

function printable(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

/**
 * Both reads are authorized independently from their source pages, and the
 * original case ID (not a caller-supplied target ID) is the relationship key.
 * This does not add departmental RBAC; it deliberately returns only limited
 * read-only case context under the existing ADMIN authorization.
 */
export function createAdminLinkedCasePreviewReader({ authorize, database }: Dependencies) {
  return async function read(origin: string, sourceId: string): Promise<LinkedCasePreviewResult> {
    try {
      if (!(await authorize())) return { status: "forbidden" };
      if ((origin !== "support" && origin !== "deletion") || !CASE_ID.test(sourceId)) {
        return { status: "invalid" };
      }

      const db = database();
      if (!db) return { status: "unavailable" };

      if (origin === "support") {
        // The source ticket must exist and be the account-deletion ticket.
        const ticket = await db.supportTicket.findUnique({
          where: { id: sourceId },
          select: { id: true, userId: true, category: true },
        });
        if (!ticket || ticket.category !== "account_deletion") return { status: "not_found" };

        // The database does not enforce uniqueness on supportTicketId. If
        // multiple deletion records point at one ticket, fail closed rather
        // than choosing an arbitrary customer's case.
        const matchingDeletions = await db.accountDeletionRequest.findMany({
          where: ticket.userId
            ? { supportTicketId: ticket.id, userId: ticket.userId }
            // Only a completed deletion can legitimately detach its Support
            // ticket. Do not treat any other orphaned record as linked.
            : { supportTicketId: ticket.id, status: "COMPLETED" },
          select: deletionPreviewSelect,
          take: 2,
        });
        if (matchingDeletions.length !== 1) return { status: "not_found" };
        const deletion = matchingDeletions[0];

        return {
          status: "ok",
          data: {
            kind: "deletion",
            id: deletion.id,
            status: deletion.status,
            requestedAt: deletion.requestedAt.toISOString(),
            deletionScheduledAt: deletion.deletionScheduledAt.toISOString(),
            cancelledAt: deletion.cancelledAt?.toISOString() ?? null,
            completedAt: deletion.completedAt?.toISOString() ?? null,
          },
        };
      }

      const deletion = await db.accountDeletionRequest.findUnique({
        where: { id: sourceId },
        select: { id: true, userId: true, supportTicketId: true, status: true },
      });
      if (!deletion?.supportTicketId) return { status: "not_found" };

      // The linked ticket must have the correct category and either match the
      // original account or have been detached by retention finalization.
      const ticket = await db.supportTicket.findFirst({
        where: {
          id: deletion.supportTicketId,
          category: "account_deletion",
          ...(deletion.status === "COMPLETED"
            ? { OR: [{ userId: deletion.userId }, { userId: null }] }
            : { userId: deletion.userId }),
        },
        select: supportPreviewSelect,
      });
      if (!ticket) return { status: "not_found" };

      return {
        status: "ok",
        data: {
          kind: "support",
          id: ticket.id,
          subject: printable(ticket.subject, 160),
          category: ticket.category,
          status: ticket.status,
          priority: ticket.priority,
          messageCount: ticket._count.messages,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        },
      };
    } catch {
      return { status: "unavailable" };
    }
  };
}
