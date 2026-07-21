import { cookies } from "next/headers";
import { SettingsContent } from "./SettingsContent";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t["accountDashboard.settings.metadataTitle"] };
}

export default function SettingsPage() {
  return <SettingsContent />;
}
