"use client";

import { useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";

export function SupportForm() {
  const { t } = useLocale();
  const [status, setStatus] = useState("");

  async function submit(formData: FormData) {
    setStatus(t.supportSending);
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
    const errorMessage =
      data.error === "Please add a little more support detail."
        ? t.supportValidationDetail
        : t.supportUnableOpenTicket;

    setStatus(
      response.ok
        ? t.supportTicketOpened.replace("{{id}}", String(data.ticket.id))
        : errorMessage,
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-xl font-bold text-navy">{t.supportCreateTicketTitle}</h2>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.supportEmailLabel}>
          <Input name="email" type="email" required />
        </Field>
        <Field label={t.supportSubjectLabel}>
          <Input name="subject" required />
        </Field>
        <Field label={t.supportCategoryLabel}>
          <Select name="category" defaultValue="price-alerts">
            <option value="search-help">{t.supportCategorySearchHelp}</option>
            <option value="price-alerts">{t.supportCategoryPriceAlerts}</option>
            <option value="redirect">{t.supportCategoryPartnerRedirect}</option>
            <option value="account">{t.supportCategoryAccountHelp}</option>
          </Select>
        </Field>
        <Field label={t.supportMessageLabel}>
          <Textarea name="body" required placeholder={t.supportMessagePlaceholder} />
        </Field>
        {status ? <p className="text-sm font-semibold text-teal-dark">{status}</p> : null}
        <Button variant="accent">{t.supportSendRequest}</Button>
      </form>
    </Card>
  );
}
