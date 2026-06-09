import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDashboardFrame, DashboardOverview } from "@/components/dashboard/DashboardGrid";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Dashboard",
};

function getInitials(name?: string | null, email?: string | null) {
  const label = name?.trim() || email?.split("@")[0] || "Kurioticket traveler";
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.trim();
  const userEmail = session?.user?.email?.trim();
  const firstName = userName?.split(/\s+/).filter(Boolean)[0];
  const displayName = firstName || "traveler";
  const initials = getInitials(userName, userEmail);

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_30%),linear-gradient(180deg,#fbfaff_0%,#ffffff_48%,#f8fafc_100%)] pb-10 pt-5 sm:pt-6 lg:pt-6">
        <div className="page-shell min-w-0">
          <AccountDashboardFrame>
            <DashboardOverview initials={initials} displayName={displayName} userEmail={userEmail} />
          </AccountDashboardFrame>
        </div>
      </main>
      <Footer />
    </>
  );
}
