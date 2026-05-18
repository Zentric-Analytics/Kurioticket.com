import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAdminEmails } from "@/lib/env";
import { getEmailVerificationRedirect } from "@/services/emailVerificationService";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export function getLoginRedirect(pathname = "/dashboard") {
  return `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`;
}

export async function requireUserSession(pathname = "/dashboard") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(getLoginRedirect(pathname));
  }
  if (session.user.status && session.user.status !== "ACTIVE") {
    redirect("/auth/signin?error=AccountUnavailable");
  }
  if (isDatabaseConfigured()) {
    const user = await getPrisma().user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });
    if (user?.email && !user.emailVerified) {
      redirect(getEmailVerificationRedirect(user.email));
    }
  } else if (!session.user.emailVerified) {
    redirect(getEmailVerificationRedirect(session.user.email || ""));
  }
  return session;
}

export async function requireAdminSession(pathname = "/admin") {
  const session = await requireUserSession(pathname);
  if (session.user.role !== "ADMIN" || !isConfiguredAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }
  return session;
}

function isConfiguredAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase().trim()));
}
