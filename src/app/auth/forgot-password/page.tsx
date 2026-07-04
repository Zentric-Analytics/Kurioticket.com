import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.forgotPasswordMetadataTitle };
}

export default function ForgotPasswordPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
