"use client";

import Link from "next/link";
import { useLocale } from "@/components/layout/LocaleProvider";

type AccountBackLinkProps = {
  variant?: "default" | "hero";
};

export function AccountBackLink({ variant = "default" }: AccountBackLinkProps) {
  const { t } = useLocale();
  const className =
    variant === "hero"
      ? "mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      : "mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#004BB8] hover:text-[#021C2B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]";

  return (
    <Link href="/dashboard/account" className={className}>
      <span aria-hidden="true">‹</span>
      <span>{t["accountDashboard.hub.title"]}</span>
    </Link>
  );
}
