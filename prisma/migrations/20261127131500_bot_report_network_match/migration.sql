-- Report-only corroboration of a reported IP. Never used for authorization.
ALTER TABLE "BotActivity" ADD COLUMN "reportedNetworkMatch" TEXT;
