import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset password",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  const token =
    typeof params?.token === "string"
      ? params.token
      : "";

  return (
    <>
      <AppHeader />

      <main className="page-shell flex flex-1 items-center py-10">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="mx-auto w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-slate-900">
              Invalid reset link
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              This password reset link is invalid
              or incomplete.
            </p>

            <Link
              href="/auth/forgot-password"
              className="mt-5 inline-flex font-semibold text-cyan-700"
            >
              Request a new link
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}