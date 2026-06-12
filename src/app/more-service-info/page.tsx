import { translations as enTranslations } from "@/lib/i18n/en";

import { MoreServiceInfoContent } from "./MoreServiceInfoContent";

export const metadata = {
  title: enTranslations.moreServiceInfoTitle,
};

export default function MoreServiceInfoPage() {
  return <MoreServiceInfoContent />;
}
