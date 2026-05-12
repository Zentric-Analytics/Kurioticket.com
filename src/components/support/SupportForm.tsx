"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";

export function SupportForm() {
  const [status, setStatus] = useState("");

  async function submit(formData: FormData) {
    setStatus("Sending...");
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
    setStatus(response.ok ? `Ticket ${data.ticket.id} opened.` : data.error || "Unable to open ticket.");
  }

  return (
    <Card className="p-5">
      <h2 className="text-xl font-bold text-navy">Create a support ticket</h2>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Subject">
          <Input name="subject" required />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue="price-alerts">
            <option value="search-help">Search help</option>
            <option value="price-alerts">Price alerts</option>
            <option value="premium">Premium tools</option>
            <option value="redirect">Partner redirect</option>
            <option value="billing">Subscription billing</option>
          </Select>
        </Field>
        <Field label="How can we help?">
          <Textarea name="body" required placeholder="Share the route, hotel, alert, or account context." />
        </Field>
        {status ? <p className="text-sm font-semibold text-teal-dark">{status}</p> : null}
        <Button variant="accent">Send Request</Button>
      </form>
    </Card>
  );
}
