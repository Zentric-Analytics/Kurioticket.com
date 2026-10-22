"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyIdentityId({
  id,
  kind,
}: {
  id: string;
  kind: "user" | "guest";
}) {
  const [message, setMessage] = useState("");
  return (
    <span className="inline-flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`Copy ${kind} ID: ${id}`}
        title={`${kind === "user" ? "User" : "Guest"} ID: ${id}`}
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setMessage("ID copied.");
          } catch {
            setMessage(
              `Could not copy. ${kind === "user" ? "User" : "Guest"} ID: ${id}`,
            );
          }
        }}
      >
        {message === "ID copied." ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </span>
  );
}
