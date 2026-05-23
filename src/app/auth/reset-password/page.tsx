import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset password",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex flex-1 items-center py-10">
        <ResetPasswordForm token={token} />
      </main>
      <Footer />
    </>
  );
}
