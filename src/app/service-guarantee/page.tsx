import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { ServiceGuaranteeContent } from "./ServiceGuaranteeContent";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.serviceGuaranteeTitle };
}

export default function ServiceGuaranteePage() {
  return <ServiceGuaranteeContent />;
}
