import type { ReactNode } from "react";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";

export function AccountDetailShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`page-shell min-w-0 ${className}`}>
      <AccountBackLink />
      {children}
    </div>
  );
}
