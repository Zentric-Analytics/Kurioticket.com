import { cookies } from "next/headers";
import { AccountPreferencesHeader } from "../AccountPreferencesHeader";
import { Footer } from "@/components/layout/Footer";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { EmailPreferencesContent } from "./EmailPreferencesContent";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t["accountDashboard.preferences.email.title"] };
}

export default function EmailPreferencesPage() {
  return (
    <>
      <AccountPreferencesHeader />
      <EmailPreferencesContent />
      <Footer />
    </>
  );
}
