import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { OnboardingSecurityForm } from "@/components/auth/OnboardingSecurityForm";
import { authOptions } from "@/lib/auth";

export default async function OnboardingSecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Fonboarding%2Fsecurity");
  return <OnboardingSecurityForm />;
}
