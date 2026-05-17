import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SigninForm } from "@/components/auth/SigninForm";

export const metadata = {
  title: "Login",
};

type SigninPageProps = {
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function SigninPage({ searchParams }: SigninPageProps) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//") ? params.callbackUrl : "/dashboard";
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <SigninForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
      </main>
      <Footer />
    </>
  );
}
