import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SigninForm } from "@/components/auth/SigninForm";

export const metadata = {
  title: "Login",
};

export default function SigninPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <SigninForm />
      </main>
      <Footer />
    </>
  );
}
