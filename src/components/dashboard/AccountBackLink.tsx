import Link from "next/link";

export function AccountBackLink() {
  return (
    <Link
      href="/dashboard/account"
      className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span aria-hidden="true">‹</span>
      <span>My Account</span>
    </Link>
  );
}
