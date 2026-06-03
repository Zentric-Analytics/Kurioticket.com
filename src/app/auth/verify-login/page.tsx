import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { VerifyLoginForm } from "@/components/auth/VerifyLoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify login",
};

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
