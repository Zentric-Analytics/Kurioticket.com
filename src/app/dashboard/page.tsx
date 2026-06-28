import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import { DashboardOverview } from "@/components/dashboard/DashboardGrid";
import { authOptions } from "@/lib/auth";
import { getOptionalPrisma } from "@/lib/prisma";
import { serializeUserProfile } from "@/lib/userProfile";

export const metadata = {
  title: "Personal details",
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
  const db = getOptionalPrisma();
  const storedProfile =
    session?.user?.id && db
      ? await db.userProfile.findUnique({
          where: { userId: session.user.id },
          select: {
            fullName: true,
            phoneNumber: true,
            dateOfBirth: true,
            gender: true,
            nationality: true,
            address: true,
          },
        })
      : null;
  const userProfile = serializeUserProfile(storedProfile);

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
        <AccountDetailShell>
          <DashboardOverview
            initials={initials}
            displayName={displayName}
            userEmail={userEmail}
            userName={userName}
            userProfile={userProfile}
          />
        </AccountDetailShell>
      </main>
      <Footer />
    </>
  );
}
