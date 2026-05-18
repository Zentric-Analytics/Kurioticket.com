import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password",
};

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