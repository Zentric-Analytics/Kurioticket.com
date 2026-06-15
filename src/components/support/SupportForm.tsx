"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

export function SupportForm() {
  const [status, setStatus] = useState("");
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  async function submit(formData: FormData) {
    setStatus(t("supportFormSending"));
    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") || ""),
        subject: String(formData.get("subject") || ""),
        category: String(formData.get("category") || ""),
        body: String(formData.get("body") || ""),
        sourceContext: { page: "support_center" },
      }),
    });
    const data = await response.json();
    setStatus(
      response.ok
        ? `${t("supportFormSuccessPrefix")} ${data.ticket.id} ${t("supportFormSuccessSuffix")}`
        : data.error || t("supportFormErrorFallback"),
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-xl font-bold text-navy">{t("supportTicketHeading")}</h2>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t("supportFormEmailLabel")}>
          <Input name="email" type="email" required />
        </Field>
        <Field label={t("supportFormSubjectLabel")}>
          <Input name="subject" required />
        </Field>
        <Field label={t("supportFormCategoryLabel")}>
          <Select name="category" defaultValue="price-alerts">
            <option value="search-help">{t("supportCategorySearchHelp")}</option>
            <option value="price-alerts">{t("supportCategoryPriceAlerts")}</option>
            <option value="redirect">{t("supportCategoryPartnerRedirect")}</option>
            <option value="account">{t("supportCategoryAccountHelp")}</option>
          </Select>
        </Field>
        <Field label={t("supportFormMessageLabel")}>
          <Textarea name="body" required placeholder={t("supportFormMessagePlaceholder")} />
        </Field>
        {status ? <p className="text-sm font-semibold text-teal-dark">{status}</p> : null}
        <Button variant="accent">{t("supportFormSubmit")}</Button>
      </form>
    </Card>
  );
}
