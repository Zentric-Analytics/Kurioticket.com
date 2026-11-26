/** The current KAYAK car sandbox contract has no driver-age parameter.
 * Admit generic, age-unverified previews only in explicit staging (or local
 * development in staging mode). This does not grant provider access.
 */
export function allowsGenericStagingCarInventory(env: Record<string, string | undefined> = process.env): boolean {
  if (env.TRAVEL_PROVIDER_MODE?.trim().toLowerCase() !== "staging") return false;
  try {
    const url = new URL(env.NEXT_PUBLIC_APP_URL || "");
    if (url.username || url.password) return false;
    if (url.origin === "https://staging.kurioticket.com") return true;
    return env.NODE_ENV === "development" &&
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

/** Keep the existing omitted-age/25 behavior outside staging. Do not change
 * the customer's age or invent a supplier parameter.
 */
export function sandboxCarDriverAgeAllowed(age: string | undefined, env: Record<string, string | undefined> = process.env): boolean {
  if (age === undefined || age === "" || age === "25") return true;
  const valid = age === "18-70" || /^(?:1[89]|[2-6][0-9]|70)$/.test(age);
  return valid && allowsGenericStagingCarInventory(env);
}
