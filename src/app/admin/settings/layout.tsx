import type { ReactNode } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSettingsNavigation } from "@/components/admin/AdminSettingsNavigation";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <AdminPageShell title="Settings" hideHeader>
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 bg-white text-[#020617] md:grid-cols-[232px_minmax(0,1fr)] md:gap-6">
        <AdminSettingsNavigation />
        <div id="settings-section-content" className="min-w-0 pb-3 md:pl-1">
          {children}
        </div>
      </div>
    </AdminPageShell>
  );
}
