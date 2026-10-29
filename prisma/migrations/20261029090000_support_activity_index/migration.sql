-- Historical SupportMessage inserts did not update the parent ticket.
-- Preserve a newer ticket status update, but advance older tickets to the
-- timestamp of their latest recorded message before switching inbox ordering.
UPDATE "SupportTicket" AS ticket
SET "updatedAt" = latest."lastMessageAt"
FROM (
  SELECT "ticketId", MAX("createdAt") AS "lastMessageAt"
  FROM "SupportMessage"
  GROUP BY "ticketId"
) AS latest
WHERE ticket."id" = latest."ticketId"
  AND ticket."updatedAt" < latest."lastMessageAt";

-- The inbox now sorts/paginates by last activity, then ticket ID.
CREATE INDEX IF NOT EXISTS "SupportTicket_updatedAt_id_idx" ON "SupportTicket"("updatedAt", "id");
