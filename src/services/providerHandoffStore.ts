import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { journeySourcePath } from "@/lib/search-journey";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";

export type ProviderHandoffActivity = {
  type: "flight" | "hotel";
  provider: string;
  route?: string;
  price?: number;
  currency?: string;
  destinationUrl: string;
  sourcePage: string;
  resultId: string;
  requestId?: string;
  handoffId?: string;
};
export type AttributedHandoff = ProviderHandoffActivity & { userId: string | null; visitorId: string | null };
export type HandoffReceipt = {
  id: string;
  created: boolean;
  visitorId: string | null;
  userId: string | null;
  searchHistoryId: string | null;
  correlation: "linked" | "pending" | "unavailable" | "rejected";
};
type HandoffDatabase = Pick<PrismaClient, "$transaction">;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Optional analytics fields must never turn a valid provider handoff into an error. */
export function handoffTrackingId(value: unknown): string | undefined {
  return typeof value === "string" && uuidPattern.test(value) ? value.toLowerCase() : undefined;
}

export function providerHandoffKey(input: Pick<AttributedHandoff, "handoffId" | "visitorId" | "userId">) {
  const id = handoffTrackingId(input.handoffId);
  if (!id) return null;
  const owner = input.visitorId ? `visitor:${input.visitorId}` : input.userId ? `user:${input.userId}` : "anonymous";
  return createHash("sha256").update(JSON.stringify(["provider-handoff-v1", owner, id])).digest("hex");
}

function metadataObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function correlate(tx: Prisma.TransactionClient, input: AttributedHandoff, visitorId: string | null) {
  const requestId = handoffTrackingId(input.requestId);
  if (!requestId || !visitorId) return { searchHistoryId: null, correlation: "unavailable" as const };
  const search = await tx.searchHistory.findUnique({
    where: { requestId }, select: { id: true, visitorId: true, userId: true, type: true },
  });
  if (!search) return { searchHistoryId: null, correlation: "pending" as const };
  if (search.visitorId !== visitorId || (search.userId && search.userId !== input.userId)
    || search.type !== (input.type === "flight" ? "FLIGHT" : "HOTEL")) {
    return { searchHistoryId: null, correlation: "rejected" as const };
  }
  return { searchHistoryId: search.id, correlation: "linked" as const };
}

/** Persist optional attribution under its consent lock; retries never rewrite the original attempt. */
export function createProviderHandoffStore(
  getDatabase: () => HandoffDatabase | null,
  pause: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
) {
  async function recordRedirect(input: AttributedHandoff): Promise<HandoffReceipt | null> {
    try {
      const db = getDatabase();
      if (!db) return null;
      const requestId = handoffTrackingId(input.requestId);
      let correlationInput = { ...input, requestId };
      let receipt = await db.$transaction(async tx => {
        const visitorId = input.visitorId && await lockConsentedVisitor(tx, input.visitorId, input.userId)
          ? input.visitorId : null;
        const handoffKey = providerHandoffKey({ ...input, visitorId });
        // The visitor lock serializes consenting activity; this key also covers
        // unconsented/anonymous retries without inventing a visitor identity.
        if (handoffKey) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('provider-handoff'), hashtext(${handoffKey}))`;
        const existing = handoffKey ? await tx.redirectLog.findUnique({ where: { handoffKey } }) : null;
        if (existing) {
          const metadata = metadataObject(existing.metadata);
          if (existing.visitorId !== visitorId || (existing.userId && existing.userId !== input.userId)
            || existing.type !== (input.type === "flight" ? "FLIGHT" : "HOTEL")
            || existing.provider !== input.provider || metadata.resultId !== input.resultId
            || (visitorId && requestId && metadata.requestId !== requestId)) return null;
          // Context changes may omit optional correlation on a retry. Preserve
          // the original attempt's reference, then recheck its current owner.
          correlationInput = { ...input, requestId: handoffTrackingId(metadata.requestId) };
          return { id: existing.id, created: false, visitorId, userId: input.userId,
            ...await correlate(tx, correlationInput, visitorId) };
        }
        const redirect = await tx.redirectLog.create({ data: {
          handoffKey, userId: input.userId, visitorId,
          type: input.type === "flight" ? "FLIGHT" : "HOTEL",
          provider: input.provider, route: input.route, price: input.price, currency: input.currency,
          destinationUrl: input.destinationUrl, userType: input.userId ? "user" : "guest",
          sourcePage: journeySourcePath(input.sourcePage) ?? "unknown",
          metadata: withEnvironmentMetadata({ resultId: input.resultId, ...(requestId && visitorId ? { requestId } : {}) }),
        }, select: { id: true } });
        return { id: redirect.id, created: true, visitorId, userId: input.userId,
          ...await correlate(tx, input, visitorId) };
      });

      // History is saved after the search response. Wait only in this background
      // task, outside transactions, then recheck consent and ownership each time.
      for (const delay of [120, 350, 900]) {
        if (!receipt || receipt.correlation !== "pending") break;
        await pause(delay);
        const previous: HandoffReceipt = receipt;
        receipt = await db.$transaction(async tx => {
          if (!previous.visitorId || !(await lockConsentedVisitor(tx, previous.visitorId, input.userId))) {
            return { ...previous, visitorId: null, searchHistoryId: null, correlation: "unavailable" as const };
          }
          const saved = await tx.redirectLog.findUnique({ where: { id: previous.id }, select: { visitorId: true, userId: true } });
          if (!saved || saved.visitorId !== previous.visitorId || (saved.userId && saved.userId !== input.userId)) return null;
          return { ...previous, ...await correlate(tx, correlationInput, previous.visitorId) };
        });
      }
      if (receipt?.correlation === "pending") console.warn("[journey:handoff]", { outcome: "history_retry_exhausted" });
      return receipt;
    } catch {
      // No URLs, tokens, account identifiers, or database error payloads in diagnostics.
      console.warn("[journey:handoff]", { outcome: "storage_unavailable" });
      return null;
    }
  }
  return { recordRedirect };
}

export const { recordRedirect: recordProviderRedirect } = createProviderHandoffStore(getOptionalPrisma);
