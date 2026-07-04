import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { NewsletterPreferencesClient } from "@/components/newsletter/NewsletterPreferencesClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.emailPreferencesMetadataTitle };
}

type EmailPreferencesPageProps = {
  searchParams?: Promise<{ email?: string; token?: string }>;
};

export default async function EmailPreferencesPage({ searchParams }: EmailPreferencesPageProps) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <NewsletterPreferencesClient email={email} token={token} />
      </main>
      <Footer />
    </>
  );
}
