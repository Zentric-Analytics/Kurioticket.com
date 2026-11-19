import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getMobileSession } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";
import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import {
  getExistingMobileProfilePhoneCountry,
  resolveMobileProfilePhoneCountry,
} from "@/lib/mobileProfilePhoneCountry";
import { validateMobilePersonalDetailsChange } from "@/lib/mobileProfileValidation";
import { getSupportedPhoneCountryCode } from "@/lib/phoneProfile";
import { serializeUserProfile, userProfileSchema } from "@/lib/userProfile";
import { createNotificationEvent } from "@/services/notificationService";

const select = { fullName: true, phoneNumber: true, phoneCountryCode: true, dateOfBirth: true, gender: true, nationality: true, address: true } as const;
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const profile = await getPrisma().userProfile.findUnique({ where: { userId: session.user.id }, select });
    const serializedProfile = serializeUserProfile(profile);
    if (!serializedProfile.phoneCountryCode) {
      const existingPhoneCountry = getExistingMobileProfilePhoneCountry({
        savedCountryCode: profile?.phoneCountryCode,
        phoneNumber: profile?.phoneNumber,
      });
      if (existingPhoneCountry) {
        serializedProfile.phoneCountryCode = existingPhoneCountry;
      } else {
        const headerCountry =
          getSupportedPhoneCountryCode(request.headers.get("x-vercel-ip-country")) ??
          getSupportedPhoneCountryCode(request.headers.get("cf-ipcountry")) ??
          getSupportedPhoneCountryCode(request.headers.get("x-country")) ??
          getSupportedPhoneCountryCode(request.headers.get("x-kurioticket-detected-region"));
        const visitorIp = headerCountry ? null : extractVisitorIp(request.headers);
        const location = !headerCountry && visitorIp
          ? await resolveIpinfoLiteCountryContext(visitorIp).catch(() => null)
          : null;
        serializedProfile.phoneCountryCode = resolveMobileProfilePhoneCountry({
          savedCountryCode: profile?.phoneCountryCode,
          phoneNumber: profile?.phoneNumber,
          detectedCountryCode: headerCountry ?? location?.countryCode,
        });
      }
    }
    return NextResponse.json({ profile: serializedProfile, user: session.user });
  } catch {
    return NextResponse.json({ error: "Unable to load profile." }, { status: 503 });
  }
}
export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = userProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the profile details." }, { status: 400 });
  try {
    const previous = await getPrisma().userProfile.findUnique({ where: { userId: session.user.id }, select });
    if (!validateMobilePersonalDetailsChange({ next: parsed.data, previous })) {
      return NextResponse.json({ error: "Please check the profile details." }, { status: 400 });
    }
    const profile = await getPrisma().userProfile.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, ...parsed.data }, update: parsed.data, select });
    const phoneChanged = previous && `${previous.phoneCountryCode || ""}${previous.phoneNumber || ""}` !== `${profile.phoneCountryCode || ""}${profile.phoneNumber || ""}`;
    if (phoneChanged) {
      const transition = createHash("sha256").update(`${previous.phoneCountryCode || ""}:${previous.phoneNumber || ""}->${profile.phoneCountryCode || ""}:${profile.phoneNumber || ""}`).digest("hex").slice(0, 24);
      await createNotificationEvent({ userId: session.user.id, eventKey: `account:phone-changed:${session.user.id}:${transition}`, type: "ACCOUNT_UPDATE", title: "Phone number changed", body: "The phone number on your Kurioticket profile was updated. If you did not make this change, secure your account and contact Support.", actionPath: "/personal-information", email: session.user.email ? { kind: "transactional", to: session.user.email } : { kind: "none" } }).catch((error) => console.error("[profile:phone-notification-failed]", { userId: session.user.id, message: error instanceof Error ? error.message : "notification_failed" }));
    }
    return NextResponse.json({ profile: serializeUserProfile(profile) });
  } catch {
    return NextResponse.json({ error: "Unable to save profile." }, { status: 503 });
  }
}
