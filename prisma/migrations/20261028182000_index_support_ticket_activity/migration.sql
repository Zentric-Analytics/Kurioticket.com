-- Support inbox uses updatedAt with an id tie-breaker for stable keyset pagination.
CREATE INDEX "SupportTicket_updatedAt_id_idx" ON "SupportTicket"("updatedAt", "id");
