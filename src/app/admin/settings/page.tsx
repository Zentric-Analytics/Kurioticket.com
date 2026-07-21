import { redirect } from "next/navigation";

export const metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  redirect("/admin/system");
}
