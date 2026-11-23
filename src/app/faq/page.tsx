import { cookies } from "next/headers";

import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { normalizeLanguage } from "@/lib/language";
import { getPublishedFaqs } from "@/services/publicCmsContentService";
import { FaqContent } from "./FaqContent";

type FaqPageProps = {
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function FaqPage({ searchParams }: FaqPageProps) {
  const [resolvedSearchParams, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const fromParam = resolvedSearchParams?.from;
  const showAccountLink = Array.isArray(fromParam)
    ? fromParam.includes("account")
    : fromParam === "account";
  const initialLocale = normalizeLanguage(
    cookieStore.get(LOCALE_COOKIE_KEY)?.value,
  );
  const initialFaqs = await getPublishedFaqs(initialLocale);

  return (
    <FaqContent
      showAccountLink={showAccountLink}
      initialFaqItems={initialFaqs.items}
      initialFaqLocale={initialLocale}
    />
  );
}
