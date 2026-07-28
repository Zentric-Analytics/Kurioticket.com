import Link from "next/link";

export function DealsResultsBreadcrumbs({ t }: { t: (key: string) => string }) {
  return <nav aria-label={t("deals.results.breadcrumb.label")} className="page-shell hidden pt-12 sm:block lg:pt-14">
    <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      <li><Link href="/" className="rounded-sm transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">{t("home")}</Link></li>
      <li className="text-slate-300 rtl:rotate-180" aria-hidden="true">&gt;</li>
      <li><Link href="/deals" className="rounded-sm transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">{t("deals")}</Link></li>
      <li className="text-slate-300 rtl:rotate-180" aria-hidden="true">&gt;</li>
      <li className="text-slate-700" aria-current="page">{t("deals.results.breadcrumb.current")}</li>
    </ol>
  </nav>;
}
