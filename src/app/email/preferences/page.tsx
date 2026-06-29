import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { NewsletterPreferencesClient } from "@/components/newsletter/NewsletterPreferencesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email preferences",
};

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
