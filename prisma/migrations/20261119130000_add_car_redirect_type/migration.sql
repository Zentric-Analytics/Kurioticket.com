-- Expand the canonical provider handoff enum without modifying existing records.
ALTER TYPE "RedirectType" ADD VALUE IF NOT EXISTS 'CAR';
