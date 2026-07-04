import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AboutPageContent } from "@/components/about/AboutPageContent";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.aboutPageEyebrow };
}

export default function AboutPage() {
  return (
    <>
      <AppHeader />
      <AboutPageContent />
      <Footer />
    </>
  );
}
