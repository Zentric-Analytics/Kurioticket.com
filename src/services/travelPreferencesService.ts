import type { InputJsonValue } from "@prisma/client/runtime/client";
import { z } from "zod";

export const travelNotificationDefaults = { emailUpdates: false, priceAlertEmails: false, travelInspirationEmails: false };
const notificationsSchema = z.object({
  emailUpdates: z.boolean().default(false),
  priceAlertEmails: z.boolean().default(false),
  travelInspirationEmails: z.boolean().default(false),
}).strict();
const notificationsReadSchema = notificationsSchema.partial();
export const travelPreferencesPatchSchema = z.object({
  homeAirport: z.string().trim().max(80).optional(),
  preferredAirlines: z.array(z.string().trim().min(1).max(80)).max(10).transform((values) => [...new Set(values)]).optional(),
  notificationPreferences: notificationsSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one preference must be provided.");
export type TravelPreferencesPatch = z.infer<typeof travelPreferencesPatchSchema>;

type Stored = { homeAirport: string | null; preferredAirlines: string[]; notificationPreferences: unknown };
export type TravelPreferencesPrisma = {
  travelPreferences: {
    findUnique(args: { where: { userId: string }; select: typeof select }): Promise<Stored | null>;
    upsert(args: { where: { userId: string }; create: { userId: string; homeAirport: string; preferredAirlines: string[]; notificationPreferences: InputJsonValue }; update: { homeAirport?: string; preferredAirlines?: string[]; notificationPreferences?: InputJsonValue }; select: typeof select }): Promise<Stored>;
  };
};
const select = { homeAirport: true, preferredAirlines: true, notificationPreferences: true } as const;
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export function mergeLegacyNotificationPreferences(existing: unknown, next: NonNullable<TravelPreferencesPatch["notificationPreferences"]>) {
  return { ...(record(existing) ? existing : {}), ...next };
}
export function serializeTravelPreferences(value: Stored) {
  const parsed = notificationsReadSchema.safeParse(value.notificationPreferences);
  return { homeAirport: value.homeAirport ?? "", preferredAirlines: value.preferredAirlines, notificationPreferences: parsed.success ? { ...travelNotificationDefaults, ...parsed.data } : travelNotificationDefaults };
}
export async function getTravelPreferencesForUser(prisma: TravelPreferencesPrisma, userId: string) {
  const value = await prisma.travelPreferences.findUnique({ where: { userId }, select });
  return { hasPreferences: Boolean(value), preferences: serializeTravelPreferences(value ?? { homeAirport: null, preferredAirlines: [], notificationPreferences: null }) };
}
export async function patchTravelPreferencesForUser(prisma: TravelPreferencesPrisma, userId: string, payload: TravelPreferencesPatch) {
  const existing = await prisma.travelPreferences.findUnique({ where: { userId }, select });
  const notifications = payload.notificationPreferences ? mergeLegacyNotificationPreferences(existing?.notificationPreferences, payload.notificationPreferences) : undefined;
  const value = await prisma.travelPreferences.upsert({
    where: { userId },
    create: { userId, homeAirport: payload.homeAirport ?? "", preferredAirlines: payload.preferredAirlines ?? [], notificationPreferences: (notifications ?? travelNotificationDefaults) as InputJsonValue },
    update: { ...(payload.homeAirport !== undefined ? { homeAirport: payload.homeAirport } : {}), ...(payload.preferredAirlines !== undefined ? { preferredAirlines: payload.preferredAirlines } : {}), ...(notifications ? { notificationPreferences: notifications as InputJsonValue } : {}) },
    select,
  });
  return { preferences: serializeTravelPreferences(value) };
}
