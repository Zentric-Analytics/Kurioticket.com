import { requireUserSession } from "@/lib/auth-guards";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUserSession("/dashboard");
  return children;
}
