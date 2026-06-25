import { SupportContent } from "@/app/support/SupportContent";

export const metadata = {
  title: "Support",
};

export default function SupportPage() {
  return <SupportContent dashboardFlow showFaq={false} />;
}
