import { Suspense, type ReactNode } from "react";
import { AdminUsersLiveRefresh } from "@/components/admin/AdminUsersLiveRefresh";

export default function AdminUsersLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={children}><AdminUsersLiveRefresh>{children}</AdminUsersLiveRefresh></Suspense>;
}
