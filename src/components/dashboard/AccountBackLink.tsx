import Link from "next/link";

type AccountBackLinkProps = {
  variant?: "default" | "hero";
};

export function AccountBackLink({ variant = "default" }: AccountBackLinkProps) {
  const className =
    variant === "hero"
      ? "mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      : "mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <Link href="/dashboard/account" className={className}>
      <span aria-hidden="true">‹</span>
      <span>My Account</span>
    </Link>
  );
}
