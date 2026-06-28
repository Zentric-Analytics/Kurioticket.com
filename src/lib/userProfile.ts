import { z } from "zod";

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value ? value : null))
    .nullable()
    .optional();

export const userProfileSchema = z.object({
  fullName: nullableTrimmedString(120),
  phoneNumber: nullableTrimmedString(40),
  dateOfBirth: nullableTrimmedString(40),
  gender: nullableTrimmedString(40),
  nationality: nullableTrimmedString(120),
  address: nullableTrimmedString(2000),
});

export type UserProfilePayload = z.infer<typeof userProfileSchema>;

export type UserProfileResponse = {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
};

export function serializeUserProfile(profile?: Partial<UserProfilePayload> | null): UserProfileResponse {
  return {
    fullName: profile?.fullName ?? "",
    phoneNumber: profile?.phoneNumber ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    gender: profile?.gender ?? "",
    nationality: profile?.nationality ?? "",
    address: profile?.address ?? "",
  };
}
