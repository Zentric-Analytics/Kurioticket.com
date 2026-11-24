import { cookies } from "next/headers";
import { ADMIN_TIME_ZONE_COOKIE, safeAdminTimeZone } from "./adminTimeZone";

/** The browser syncs this cookie inside /admin; validate untrusted input.
 * Explicit UTC fallback only for the first request before browser detection. */
export async function getAdminTimeZone() {
  const jar = await cookies();
  return safeAdminTimeZone(jar.get(ADMIN_TIME_ZONE_COOKIE)?.value);
}
