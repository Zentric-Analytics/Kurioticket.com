import {productionSandboxInventory} from "@/lib/productionSandboxPolicy";
import { z } from "zod";
import { resolveSavedFlightTime } from "@/shared/flights/savedFlightTime";
import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { writeOperationalAccountAudit } from "@/services/operationalAccountAuditService";
import { confirmedSavedActivityMetadata } from "@/lib/savedActivityMetadata";
import type { ApplicationAttribution } from "@/lib/application-source";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export const savedItemTypes = ["flight", "hotel", "car", "search"] as const;
export type SavedItemType = (typeof savedItemTypes)[number];
const money = z.coerce.number().finite().nonnegative();
const text = z.string().trim().min(1).max(256);
const date = z.string().datetime({ offset: true });
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const json = z.record(z.string(), z.unknown());
export const createSavedItemInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("flight"), provider: text, airlineName: text, flightNumber: z.string().max(64).nullish(), originAirport: text, destinationAirport: text, departureTime: z.string().max(64), arrivalTime: z.string().max(64), price: money, currency: z.string().length(3).transform(v => v.toUpperCase()).default("USD"), payload: json.default({}) }).transform((input, ctx) => {
    try {
      const departure = resolveSavedFlightTime(input.departureTime, input.originAirport);
      let arrival: ReturnType<typeof resolveSavedFlightTime>;
      try { arrival = resolveSavedFlightTime(input.arrivalTime, input.destinationAirport); }
      catch (error) {
        ctx.addIssue({ code: "custom", path: ["arrivalTime"], message: error instanceof Error ? error.message : "Unable to resolve arrival timezone." });
        return z.NEVER;
      }
      // Existing offset-qualified records retain their payload and meaning.
      const resolvedLocal = departure.timeZone || arrival.timeZone;
      return { ...input, departureTime: departure.instant, arrivalTime: arrival.instant,
        payload: resolvedLocal ? { ...input.payload, flightTime: { version: 1, departure, arrival } } : input.payload };
    } catch (error) {
      ctx.addIssue({ code: "custom", path: ["departureTime"], message: error instanceof Error ? error.message : "Unable to resolve flight timezone." });
      return z.NEVER;
    }
  }),
  z.object({ type: z.literal("hotel"), provider: text, hotelName: text, destination: text, checkIn: date, checkOut: date, totalPrice: money, currency: z.string().length(3).transform(v => v.toUpperCase()).default("USD"), payload: json.default({}) }),
  z.object({ type: z.literal("car"), resultId: text, provider: text, modelName: text, categoryLabel: text, pickupLocation: text, dropoffLocation: text, pickupDate: calendarDate, pickupTime: clockTime, dropoffDate: calendarDate, dropoffTime: clockTime, driverAge: z.union([z.literal("18-70"), z.coerce.number().int().min(18).max(70)]).transform(String), totalPrice: money, currency: z.string().length(3).transform(v => v.toUpperCase()), payload: json.default({}) }),
  z.object({ type: z.literal("search"), searchType: z.enum(["flight", "hotel", "car", "package"]), label: z.string().max(256).nullish(), origin: z.string().max(128).nullish(), destination: z.string().max(256).nullish(), checkIn: date.nullish(), checkOut: date.nullish(), query: json }),
]);
export const deleteSavedItemInputSchema = z.object({ type: z.enum(savedItemTypes), id: z.string().trim().min(1).max(128) });
export type CreateSavedItemInput = z.infer<typeof createSavedItemInputSchema>;
export type DeleteSavedItemInput = z.infer<typeof deleteSavedItemInputSchema>;
export class DuplicateSavedItemError extends Error {}
export class SavedItemNotFoundError extends Error {}
export function isSavedItemType(value: string): value is SavedItemType { return (savedItemTypes as readonly string[]).includes(value); }
const db = () => getPrisma();
const iso = (value: Date | null) => value?.toISOString() ?? null;
export async function listUserSavedItems(userId: string, options: { type?: SavedItemType } = {}) {
  const [flights, hotels, cars, searches] = await Promise.all([
    !options.type || options.type === "flight" ? db().savedFlight.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) : [],
    !options.type || options.type === "hotel" ? db().savedHotel.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) : [],
    !options.type || options.type === "car" ? db().savedCar.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) : [],
    !options.type || options.type === "search" ? db().savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }) : [],
  ]);
  const items = [
    ...flights.map(x => ({ ...x, type: "flight" as const, price: Number(x.price), departureTime: iso(x.departureTime), arrivalTime: iso(x.arrivalTime), createdAt: iso(x.createdAt) })),
    ...hotels.map(x => ({ ...x, type: "hotel" as const, totalPrice: Number(x.totalPrice), checkIn: iso(x.checkIn), checkOut: iso(x.checkOut), createdAt: iso(x.createdAt) })),
    ...cars.map(x => ({ ...x, type: "car" as const, totalPrice: Number(x.totalPrice), createdAt: iso(x.createdAt) })),
    ...searches.map(x => ({ ...x, type: "search" as const, searchType: x.type.toLowerCase(), checkIn: iso(x.checkIn), checkOut: iso(x.checkOut), createdAt: iso(x.createdAt) })),
  ];
  const summary = { flights: flights.length, hotels: hotels.length, cars: cars.length, searches: searches.length, total: items.length };
  return { items, summary };
}
function stableSavedValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSavedValue).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableSavedValue(child)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Exact retry identity, not a merge of distinct itineraries or historical rows. */
export function savedRetryKey(userId: string, input: CreateSavedItemInput) {
  return createHash("sha256").update(stableSavedValue([userId, input])).digest("hex");
}
function carSavedSignature(input: Extract<CreateSavedItemInput, { type: "car" }>) {
  return createHash("sha256").update(JSON.stringify([
    input.resultId, input.provider.toLowerCase(), input.modelName.toLowerCase(),
    input.pickupLocation.toLowerCase(), input.dropoffLocation.toLowerCase(),
    input.pickupDate, input.pickupTime, input.dropoffDate, input.dropoffTime, input.driverAge,
  ])).digest("hex");
}
function savedActivityProduct(input: CreateSavedItemInput) {
  return (input.type === "search" ? input.searchType : input.type).toUpperCase() as "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
}
function savedActivityEventMetadata(input: CreateSavedItemInput, itemId: string, attribution: ApplicationAttribution) {
  return confirmedSavedActivityMetadata({
    product: savedActivityProduct(input),
    savedType: input.type,
    savedItemId: itemId,
    payload: input.type !== "search" ? input.payload : undefined,
    resultId: input.type === "car" ? input.resultId : undefined,
  }, attribution);
}
/** Transactional save + audit. The public writer accepts the same inputs as the
 * existing sync contract; an explicit opt-in creates the account event in the
 * *same transaction* only for a newly created saved item.
 */
export function createSavedItemWriter(database: () => Pick<PrismaClient, "$transaction">, audit = false) {
  return async (userId: string, input: CreateSavedItemInput, attribution: ApplicationAttribution = {}) => {
    if(productionSandboxInventory(input))throw new Error("Sandbox inventory cannot be saved.");
    return database().$transaction(async tx => {
    const retryIdentity = input.type === "car"
      ? "car:" + userId + ":" + carSavedSignature(input) : savedRetryKey(userId, input);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('saved-item-retry'), hashtext(${retryIdentity}))`;
    if (input.type === "flight") {
      const existing = await tx.savedFlight.findFirst({ where: { userId, provider: input.provider, airlineName: input.airlineName, flightNumber: input.flightNumber ?? null, originAirport: input.originAirport, destinationAirport: input.destinationAirport, departureTime: new Date(input.departureTime), arrivalTime: new Date(input.arrivalTime), payload: { equals: input.payload as Prisma.InputJsonValue } } });
      if (existing) return existing;
    } else if (input.type === "hotel") {
      const existing = await tx.savedHotel.findFirst({ where: { userId, provider: input.provider, hotelName: input.hotelName, destination: input.destination, checkIn: new Date(input.checkIn), checkOut: new Date(input.checkOut), payload: { equals: input.payload as Prisma.InputJsonValue } } });
      if (existing) return existing;
    } else if (input.type === "search") {
      const existing = await tx.savedSearch.findFirst({ where: { userId, type: input.searchType.toUpperCase() as "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE", origin: input.origin ?? null, destination: input.destination ?? null, checkIn: input.checkIn ? new Date(input.checkIn) : null, checkOut: input.checkOut ? new Date(input.checkOut) : null, query: { equals: input.query as Prisma.InputJsonValue } } });
      if (existing) return existing;
    } else {
      const existing = await tx.savedCar.findFirst({ where: { userId, signature: carSavedSignature(input) } });
      if (existing) return existing;
    }
    const item = await createSavedItemInTransaction(tx, userId, input);
    if (audit) await writeOperationalAccountAudit(tx, {
      userId, type: "SAVE", name: "saved_item_confirmed",
      metadata: savedActivityEventMetadata(input, item.id, attribution),
    });
    return item;
  });
  };
}
const writeUserSavedItem = createSavedItemWriter(getPrisma, true);
export async function createUserSavedItem(
  userId: string, input: CreateSavedItemInput, attribution: ApplicationAttribution = {},
) {
  return writeUserSavedItem(userId, input, attribution);
}
async function createSavedItemInTransaction(tx: Prisma.TransactionClient, userId: string, input: CreateSavedItemInput) {
  try {
    if (input.type === "flight") return tx.savedFlight.create({ data: { userId, provider: input.provider, airlineName: input.airlineName, flightNumber: input.flightNumber, originAirport: input.originAirport, destinationAirport: input.destinationAirport, departureTime: new Date(input.departureTime), arrivalTime: new Date(input.arrivalTime), price: input.price, currency: input.currency, payload: input.payload as never } });
    if (input.type === "hotel") return tx.savedHotel.create({ data: { userId, provider: input.provider, hotelName: input.hotelName, destination: input.destination, checkIn: new Date(input.checkIn), checkOut: new Date(input.checkOut), totalPrice: input.totalPrice, currency: input.currency, payload: input.payload as never } });
    if (input.type === "car") {
      const signature = carSavedSignature(input);
      return tx.savedCar.upsert({ where: { userId_signature: { userId, signature } }, update: {}, create: { userId, signature, provider: input.provider, modelName: input.modelName, categoryLabel: input.categoryLabel, pickupLocation: input.pickupLocation, dropoffLocation: input.dropoffLocation, pickupDate: input.pickupDate, pickupTime: input.pickupTime, dropoffDate: input.dropoffDate, dropoffTime: input.dropoffTime, driverAge: input.driverAge, totalPrice: input.totalPrice, currency: input.currency, payload: input.payload as never } });
    }
    return tx.savedSearch.create({ data: { userId, type: input.searchType.toUpperCase() as "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE", label: input.label, origin: input.origin, destination: input.destination, checkIn: input.checkIn ? new Date(input.checkIn) : null, checkOut: input.checkOut ? new Date(input.checkOut) : null, query: input.query as never } });
  } catch (error) { if ((error as { code?: string }).code === "P2002") throw new DuplicateSavedItemError("Saved item already exists."); throw error; }
}
export function createSavedItemRemover(database: () => Pick<PrismaClient, "$transaction">) {
  return async (userId: string, input: DeleteSavedItemInput, attribution: ApplicationAttribution = {}) =>
    database().$transaction(async tx => {
      // Lock the item before the mutation so the deleted record supplies
      // trustworthy product and result references. No client-supplied product
      // override, no cross-account delete, and no audit for missing items.
      const where = { id: input.id, userId };
      // Avoid unioning distinct Prisma delegates: each query retains its
      // model-specific generated types, while the public input remains scoped.
      const existing = input.type === "flight" ? await tx.savedFlight.findFirst({ where })
        : input.type === "hotel" ? await tx.savedHotel.findFirst({ where })
          : input.type === "car" ? await tx.savedCar.findFirst({ where })
            : await tx.savedSearch.findFirst({ where });
      if (!existing) throw new SavedItemNotFoundError("Saved item was not found.");
      const deleted = input.type === "flight" ? await tx.savedFlight.deleteMany({ where })
        : input.type === "hotel" ? await tx.savedHotel.deleteMany({ where })
          : input.type === "car" ? await tx.savedCar.deleteMany({ where })
            : await tx.savedSearch.deleteMany({ where });
      if (deleted.count !== 1) throw new SavedItemNotFoundError("Saved item was not found.");
      const product = input.type === "search" ? (existing as { type: string }).type as "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE"
        : input.type.toUpperCase() as "FLIGHT" | "HOTEL" | "CAR";
      await writeOperationalAccountAudit(tx, {
        userId, type: "SAVE", name: "saved_item_removed",
        metadata: confirmedSavedActivityMetadata({
          savedType: input.type,
          savedItemId: input.id,
          product,
          payload: input.type === "search" ? undefined : (existing as { payload: unknown }).payload,
        }, attribution),
      });
    });
}
const removeUserSavedItem = createSavedItemRemover(getPrisma);
export async function deleteUserSavedItem(
  userId: string, input: DeleteSavedItemInput, attribution: ApplicationAttribution = {},
) {
  await removeUserSavedItem(userId, input, attribution);
}
