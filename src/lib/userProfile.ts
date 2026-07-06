import { z } from "zod";
import { getSupportedPhoneCountryCode } from "@/lib/phoneProfile";

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value ? value : null))
    .nullable()
    .optional();

const nullablePhoneCountryCode = z
  .string()
  .max(2)
  .transform((value) => value.trim().toUpperCase())
  .transform((value) => (value ? value : null))
  .nullable()
  .optional()
  .refine(
    (value) => value === null || value === undefined || getSupportedPhoneCountryCode(value) === value,
    "Unsupported phone country code.",
  );

export const userProfileSchema = z.object({
  fullName: nullableTrimmedString(120),
  phoneNumber: nullableTrimmedString(40),
  phoneCountryCode: nullablePhoneCountryCode,
  dateOfBirth: nullableTrimmedString(40),
  gender: nullableTrimmedString(40),
  nationality: nullableTrimmedString(120),
  address: nullableTrimmedString(2000),
});

export type UserProfilePayload = z.infer<typeof userProfileSchema>;

export type UserProfileResponse = {
  fullName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
};

export function serializeUserProfile(profile?: Partial<UserProfilePayload> | null): UserProfileResponse {
  return {
    fullName: profile?.fullName ?? "",
    phoneNumber: profile?.phoneNumber ?? "",
    phoneCountryCode: profile?.phoneCountryCode ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    gender: profile?.gender ?? "",
    nationality: profile?.nationality ?? "",
    address: profile?.address ?? "",
  };
}
