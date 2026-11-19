import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SearchWorkspaceBackLink({
  href = "/admin/searches",
  label = "Searches",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex w-fit items-center gap-2 text-[14px] font-semibold leading-5 text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
