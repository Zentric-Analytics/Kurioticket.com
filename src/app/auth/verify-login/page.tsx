import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { VerifyLoginForm } from "@/components/auth/VerifyLoginForm";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.verifyLoginSubmit };
}

type VerifyLoginPageProps = {
  searchParams?: Promise<{
    email?: string;
    callbackUrl?: string;
  }>;
};

export default async function VerifyLoginPage({ searchParams }: VerifyLoginPageProps) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";
  const callbackUrl =
    params?.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <VerifyLoginForm email={email} callbackUrl={callbackUrl} />
      </main>
      <Footer />
    </>
  );
}
