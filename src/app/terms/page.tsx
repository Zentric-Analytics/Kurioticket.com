import { redirect } from "next/navigation";

export const metadata = {
  title: "Kurioticket",
};

export default function TermsPage() {
  redirect("/legal/terms-of-service");
}
