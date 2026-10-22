import { AdminLinkButton, AdminPageShell } from "@/components/admin/AdminPageShell";
import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";

export const metadata = { title: "New Admin FAQ" };

export default function NewAdminFaqPage() {
  return (
    <AdminPageShell
      title="New FAQ"
      description="Create an English FAQ draft. Publishing remains a separate explicit action."
      actions={<AdminLinkButton href="/admin/content/faqs">Back to FAQs</AdminLinkButton>}
    >
      <FaqCmsEditor />
    </AdminPageShell>
  );
}
