import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SigninForm } from "@/components/auth/SigninForm";
import { isGoogleAuthConfigured } from "@/lib/auth-diagnostics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login",
};

type SigninPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    error?: string;
    reset?: string;
  }>;
};

export default async function SigninPage({
  searchParams,
}: SigninPageProps) {
  const params = await searchParams;

  const callbackUrl =
    params?.callbackUrl?.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/dashboard";

  const initialError =
    params?.error === "AccountUnavailable"
      ? "This account is not available. Please contact support."
      : "";

  const initialMessage =
    params?.reset === "success"
      ? "Your password was reset. Log in with your new password."
      : "";

  const googleEnabled =
    isGoogleAuthConfigured();

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center py-10">
        <SigninForm
          callbackUrl={callbackUrl}
          googleEnabled={googleEnabled}
          initialError={initialError}
          initialMessage={initialMessage}
        />
      </main>

      <Footer />
    </>
  );
}