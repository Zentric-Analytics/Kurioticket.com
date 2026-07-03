import { Suspense } from "react";
import { cookies } from "next/headers";
import { TwoFactorChallengeFallback, TwoFactorChallengeForm } from "@/components/auth/TwoFactorChallengeForm";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return { title: t.twoFactorEyebrow };
}

export default function TwoFactorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7fc] px-4 py-10">
      <Suspense fallback={<TwoFactorChallengeFallback />}>
        <TwoFactorChallengeForm />
      </Suspense>
    </main>
  );
}
