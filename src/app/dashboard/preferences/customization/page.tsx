import { cookies } from "next/headers";
import { AccountPreferencesHeader } from "../AccountPreferencesHeader";
import { Footer } from "@/components/layout/Footer";
import { CustomizationPreferencesContent } from "./CustomizationPreferencesContent";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t["accountDashboard.preferences.customization.title"] };
}

export default function CustomizationPreferencesPage() {
  return (
    <>
      <AccountPreferencesHeader />
      <CustomizationPreferencesContent />
      <Footer />
    </>
  );
}
