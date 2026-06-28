import { redirect } from "next/navigation";

export const metadata = {
  title: "Legal Center | Kurioticket",
};

export default function LegalCenterPage() {
  redirect("/legal");
}
