-- Reverse the support activity index added in PR #6550 while preserving migration history.
DROP INDEX IF EXISTS "SupportTicket_updatedAt_id_idx";
