import { Suspense } from "react";
import { TwoFactorChallengeForm } from "@/components/auth/TwoFactorChallengeForm";

export const metadata = { title: "Two-factor authentication" };

export default function TwoFactorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7fc] px-4 py-10">
      <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow">Loading two-factor challenge…</div>}>
        <TwoFactorChallengeForm />
      </Suspense>
    </main>
  );
}
