import { FaqContent } from "./FaqContent";

type FaqPageProps = {
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function FaqPage({ searchParams }: FaqPageProps) {
  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams?.from;
  const showAccountLink = Array.isArray(fromParam)
    ? fromParam.includes("account")
    : fromParam === "account";

  return <FaqContent showAccountLink={showAccountLink} />;
}
