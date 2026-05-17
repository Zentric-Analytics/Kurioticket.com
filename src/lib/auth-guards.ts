import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export function getLoginRedirect(pathname = "/dashboard") {
  return `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`;
}

export async function requireUserSession(pathname = "/dashboard") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(getLoginRedirect(pathname));
  }
  return session;
}

export async function requireAdminSession(pathname = "/admin") {
  const session = await requireUserSession(pathname);
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}
