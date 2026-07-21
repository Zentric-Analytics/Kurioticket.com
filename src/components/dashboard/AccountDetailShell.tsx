import type { ReactNode } from "react";

import { AccountBackLinkRow } from "@/components/dashboard/AccountBackLinkRow";

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
      {showAccountLink ? <AccountBackLinkRow /> : null}
      {children}
    </div>
  );
}
