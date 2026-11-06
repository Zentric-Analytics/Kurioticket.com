"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";

import { CmsExpandingTextField } from "@/components/admin/CmsExpandingTextField";
import { CMS_IMAGE_MAX_BYTES } from "@/lib/cmsImageUploadRules";

export function CmsImageUploadField({
  value,
  onChange,
  disabled = false,
  optional = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  optional?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setError(null);
    setSuccess(false);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > CMS_IMAGE_MAX_BYTES) {
      setError("Choose an image up to 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/admin/content/image-upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== "string") {
        setError(typeof result.error === "string" ? result.error : "Could not upload the image.");
        return;
      }
      onChange(result.url);
      setSuccess(true);
    } catch {
      setError("Image upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            // Allow choosing the same file again after an error.
            if (inputRef.current) inputRef.current.value = "";
            void upload(file);
          }}
        />
        <label
          htmlFor={inputId}
          aria-disabled={disabled || uploading}
          className={
            "inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors " +
            (disabled || uploading ? "cursor-not-allowed opacity-50" :
              "cursor-pointer hover:border-[#6D28D9] hover:bg-[#F8FAFC] focus-within:ring-2 focus-within:ring-[#6D28D9]/30")
          }
        >
          {uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> :
            <ImagePlus size={16} aria-hidden="true" />}
          {uploading ? "Uploading image…" : value ? "Replace with upload" : "Upload image"}
        </label>
        <span className="text-[12px] text-[#64748B]">JPG, PNG or WebP · Max 5 MB</span>
      </div>
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
      {success ? <p role="status" className="text-[12px] text-emerald-700">Image uploaded. Save your draft, then publish when ready.</p> : null}
      <CmsExpandingTextField
        label={optional ? "Image URL (optional)" : "Image URL"}
        value={value}
        onChange={(next) => { setError(null); setSuccess(false); onChange(next); }}
        disabled={disabled || uploading}
      />
    </div>
  );
}
