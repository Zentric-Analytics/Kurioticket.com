import { redirect } from "next/navigation";

export const metadata = { title: "Admin Providers" };

export default function AdminHotelsRedirectPage() {
  redirect("/admin/providers?product=hotels");
}
