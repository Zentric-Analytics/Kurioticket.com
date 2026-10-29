-- Support inbox pagination by last activity.
CREATE INDEX "SupportTicket_updatedAt_id_idx" ON "SupportTicket"("updatedAt", "id");
