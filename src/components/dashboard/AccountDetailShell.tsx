import type { ReactNode } from "react";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";

export function AccountDetailShell({
  children,
  className = "",
  showAccountLink = true,
}: {
  children: ReactNode;
  className?: string;
  showAccountLink?: boolean;
}) {
  return (
    <div className={`page-shell min-w-0 ${className}`}>
      {showAccountLink ? <AccountBackLink /> : null}
      {children}
    </div>
  );
}
