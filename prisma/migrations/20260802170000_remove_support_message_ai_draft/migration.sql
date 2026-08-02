-- The product has no AI-assisted support drafting. Runtime code never reads or writes this field.
ALTER TABLE "SupportMessage" DROP COLUMN "isAiDraft";
