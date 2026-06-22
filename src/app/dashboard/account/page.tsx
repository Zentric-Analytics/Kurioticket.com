import { getServerSession } from "next-auth";
import { AccountMenuPage } from "@/components/dashboard/DashboardGrid";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "My Account",
};

function getInitials(name?: string | null, email?: string | null) {
  const label = name?.trim() || email?.split("@")[0] || "Kurioticket traveler";
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.trim();
  const userEmail = session?.user?.email?.trim();
  const firstName = userName?.split(/\s+/).filter(Boolean)[0];
  const displayName = firstName || userEmail?.split("@")[0] || "traveler";
  const initials = getInitials(userName, userEmail);
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-16 lg:pb-20">
        <AccountMenuPage
          initials={initials}
          displayName={displayName}
          userEmail={userEmail}
        />
      </main>
      <Footer />
    </>
  );
}
