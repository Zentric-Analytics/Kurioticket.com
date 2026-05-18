import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SignupForm } from "@/components/auth/SignupForm";
import { isGoogleAuthConfigured } from "@/lib/auth-diagnostics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center py-10">
        <SignupForm googleEnabled={googleEnabled} />
      </main>

      <Footer />
    </>
  );
}