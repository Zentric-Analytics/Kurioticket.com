import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

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
