import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify email",
};

type VerifyEmailPageProps = {
  searchParams?: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <VerifyEmailForm email={email} />
      </main>
      <Footer />
    </>
  );
}
