import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SignupForm } from "@/components/auth/SignupForm";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = {
  title: enTranslations.signupPageTitle,
};

export default function SignupPage() {
  const googleEnabled = Boolean(
    getGoogleClientId().trim() &&
      getGoogleClientSecret().trim()
  );

  console.error(
    `Google OAuth enabled: ${googleEnabled}`
  );

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center pt-24 pb-10 sm:pt-28 lg:pt-28">
        <SignupForm googleEnabled={googleEnabled} />
      </main>

      <Footer />
    </>
  );
}
