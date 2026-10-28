import { redirect } from "next/navigation";
import { searchWorkspaceHref, type SearchWorkspaceParams } from "@/lib/adminSearchWorkspace";

export const metadata = { title: "Admin Search Activity" };

export default async function AdminSearchesPage({ searchParams }: {
  searchParams: Promise<SearchWorkspaceParams>;
}) {
  // Keep the former Search workspace URL working while opening the
  // consolidated activity workspace directly. Preserve only known filters.
  const raw = await searchParams;
  redirect(searchWorkspaceHref("searches", raw));
}
