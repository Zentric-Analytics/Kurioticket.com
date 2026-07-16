import { redirect } from "next/navigation";

export const metadata = { title: "Admin Providers" };

export default function AdminCarsRedirectPage() {
  redirect("/admin/providers?product=cars");
}
