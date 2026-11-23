export const PERSONAL_DETAILS_MINIMUM_AGE = 18;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function personalDetailsLatestDateOfBirth(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear() - PERSONAL_DETAILS_MINIMUM_AGE;
  const monthIndex = referenceDate.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(referenceDate.getUTCDate(), lastDayOfMonth);
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function isCanonicalPersonalDetailsDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isEligiblePersonalDetailsDateOfBirth(
  value: string,
  referenceDate = new Date(),
) {
  return (
    isCanonicalPersonalDetailsDate(value) &&
    value <= personalDetailsLatestDateOfBirth(referenceDate)
  );
}

export function clampPersonalDetailsDateOfBirth(
  value: string,
  referenceDate = new Date(),
) {
  if (!isCanonicalPersonalDetailsDate(value)) return null;
  const latest = personalDetailsLatestDateOfBirth(referenceDate);
  return value > latest ? latest : value;
}
