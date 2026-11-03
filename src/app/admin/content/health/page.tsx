import { redirect } from "next/navigation";

/** Existing bookmarks and CMS alert links now open the System-owned health workspace. */
export default function LegacyCmsHealthRedirect() {
  redirect("/admin/system/cms-health");
}
