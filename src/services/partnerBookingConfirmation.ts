import { createHmac, timingSafeEqual } from "node:crypto";

import type { MyTripStatus, MyTripType } from "@/generated/prisma/enums";
import { validateProviderUrl } from "@/lib/provider-url";
import type { PartnerConfirmedMyTripInput } from "@/services/myTripService";

const maximumPayloadBytes = 64 * 1024;
const permittedClockSkewSeconds = 5 * 60;
const signaturePattern = /^sha256=([a-f0-9]{64})$/i;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;

type ConfirmationObject = Record<string, unknown>;

export class PartnerConfirmationPayloadError extends Error {
  constructor() {
    super("The partner confirmation payload is invalid.");
    this.name = "PartnerConfirmationPayloadError";
  }
}

function invalidPayload(): never {
  throw new PartnerConfirmationPayloadError();
}

function readObject(value: unknown): ConfirmationObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidPayload();
  return value as ConfirmationObject;
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") invalidPayload();
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength || /[\u0000-\u001f\u007f]/.test(normalized)) invalidPayload();
  return normalized;
}

function readNullableString(value: unknown, maximumLength: number) {
  if (value === undefined || value === null) return null;
  return readString(value, maximumLength);
}

function readDate(value: unknown) {
  const text = readString(value, 40);
  if (!isoDatePattern.test(text)) invalidPayload();
  const date = new Date(text);
  const normalized = text.includes(".") ? text : text.replace("Z", ".000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString() !== normalized) invalidPayload();
  return date;
}

function readOptionalDate(value: unknown) {
  if (value === undefined || value === null) return null;
  return readDate(value);
}

function readInteger(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) invalidPayload();
  return value;
}

function readAmount(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) invalidPayload();
  return value;
}

function readTripType(value: unknown): MyTripType {
  const tripTypes = { flight: "FLIGHT", hotel: "HOTEL", car: "CAR", package: "PACKAGE" } as const;
  if (typeof value !== "string" || !(value in tripTypes)) invalidPayload();
  return tripTypes[value as keyof typeof tripTypes];
}

function readTripStatus(value: unknown): MyTripStatus {
  const statuses = { upcoming: "UPCOMING", past: "PAST", cancelled: "CANCELLED" } as const;
  if (typeof value !== "string" || !(value in statuses)) invalidPayload();
  return statuses[value as keyof typeof statuses];
}

/**
 * Translates the signed partner contract into the existing trusted My Trips
 * ingestion input. This is intentionally not a customer-facing import format.
 */
export function parsePartnerBookingConfirmation(value: unknown): PartnerConfirmedMyTripInput {
  const payload = readObject(value);
  const customer = readObject(payload.customer);
  const confirmationOccurredAt = readDate(payload.occurredAt);
  const departureDate = readDate(payload.departureAt);
  const returnDate = readOptionalDate(payload.returnAt);
  if (returnDate && returnDate < departureDate) invalidPayload();

  const currency = readString(payload.currency, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) invalidPayload();
  const providerManageUrl = readString(payload.providerManageUrl, 2_000);
  if (!validateProviderUrl(providerManageUrl)) invalidPayload();

  return {
    userId: readString(customer.userId, 191),
    partnerConversionId: readString(payload.partnerConversionId, 191),
    providerName: readString(payload.providerName, 100),
    providerConfirmationCode: readString(payload.providerConfirmationCode, 100),
    providerTripId: readNullableString(payload.providerTripId, 191),
    providerManageUrl,
    tripType: readTripType(payload.tripType),
    status: readTripStatus(payload.status),
    source: "PARTNER_CONFIRMATION",
    origin: readNullableString(payload.origin, 200),
    destination: readString(payload.destination, 200),
    departureDate,
    returnDate,
    travelerCount: readInteger(payload.travelerCount, 1, 99),
    currency,
    totalAmount: readAmount(payload.totalAmount),
    confirmationOccurredAt,
  };
}

export function isConfiguredPartnerConfirmationSecret(value: string | undefined): value is string {
  return Boolean(value && value.trim().length >= 32);
}

/**
 * Verifies the raw request before JSON parsing. Providers sign the exact
 * `${timestamp}.${body}` bytes using HMAC-SHA256, which prevents the browser
 * from manufacturing a confirmation or changing an accepted payload.
 */
export function hasFreshPartnerConfirmationEnvelope({
  timestamp,
  signature,
  now = Date.now(),
}: {
  timestamp: string | null;
  signature: string | null;
  now?: number;
}) {
  if (!/^[0-9]{10}$/.test(timestamp || "") || !signaturePattern.test(signature || "")) return false;
  const timestampMilliseconds = Number(timestamp) * 1_000;
  return Number.isSafeInteger(timestampMilliseconds) && Math.abs(now - timestampMilliseconds) <= permittedClockSkewSeconds * 1_000;
}

export function verifiesPartnerConfirmationSignature({
  rawBody,
  timestamp,
  signature,
  secret,
  now = Date.now(),
}: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: number;
}) {
  if (Buffer.byteLength(rawBody) > maximumPayloadBytes || !hasFreshPartnerConfirmationEnvelope({ timestamp, signature, now })) return false;

  const match = signature?.match(signaturePattern);
  const receivedHex = match?.[1];
  if (!receivedHex) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = Buffer.from(receivedHex, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export const partnerConfirmationLimits = {
  maximumPayloadBytes,
  permittedClockSkewSeconds,
};
