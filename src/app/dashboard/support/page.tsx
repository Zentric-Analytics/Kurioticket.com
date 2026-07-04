import { cookies } from "next/headers";
import { SupportContent } from "@/app/support/SupportContent";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t["accountDashboard.support.title"] };
}

export default function SupportPage() {
  return <SupportContent dashboardFlow showFaq={false} />;
}
