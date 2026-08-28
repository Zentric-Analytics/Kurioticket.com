import { personalDetailsCountryOptions } from "@/lib/region/supportedRegions";

const allowedGenders = new Set([
  "Male",
  "Female",
  "I prefer not to say",
]);

const allowedNationalities = new Set(
  personalDetailsCountryOptions.map((option) => option.country),
);

type PersonalDetailsFields = {
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
};

function changed(next: string | null | undefined, previous: string | null | undefined) {
  return next !== undefined && (next ?? null) !== (previous ?? null);
}

export function isValidPersonalDetailsDateOfBirth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() <= Date.now()
  );
}

export function validateMobilePersonalDetailsChange({
  next,
  previous,
}: {
  next: PersonalDetailsFields;
  previous?: PersonalDetailsFields | null;
}) {
  if (
    changed(next.dateOfBirth, previous?.dateOfBirth) &&
    next.dateOfBirth !== null &&
    next.dateOfBirth !== undefined &&
    !isValidPersonalDetailsDateOfBirth(next.dateOfBirth)
  ) {
    return false;
  }

  if (
    changed(next.gender, previous?.gender) &&
    next.gender !== null &&
    next.gender !== undefined &&
    !allowedGenders.has(next.gender)
  ) {
    return false;
  }

  if (
    changed(next.nationality, previous?.nationality) &&
    next.nationality !== null &&
    next.nationality !== undefined &&
    !allowedNationalities.has(next.nationality)
  ) {
    return false;
  }

  return true;
}
