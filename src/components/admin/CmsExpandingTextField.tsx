"use client";

import { CmsFieldError } from "@/components/admin/CmsEditorFeedback";
import { useEffect, useId, useLayoutEffect, useRef } from "react";

/**
 * A CMS image URL / alt-text field remains a single stored string, but renders
 * as a wrapping textarea. Its height follows the text, rather than hiding long
 * values horizontally inside a short input.
 */
export function CmsExpandingTextField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function fitHeight() {
    const element = textareaRef.current;
    if (!element) return;
    // Reset before measuring so deleting text shrinks the field naturally.
    element.style.height = "0px";
    const contentHeight = element.scrollHeight;
    element.style.height = Math.max(36, Math.min(contentHeight, 240)) + "px";
    element.style.overflowY = contentHeight > 240 ? "auto" : "hidden";
  }

  useLayoutEffect(() => {
    fitHeight();
  }, [value]);

  useEffect(() => {
    const parent = textareaRef.current?.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;
    let previousWidth = 0;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width !== previousWidth) {
        previousWidth = width;
        fitHeight();
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full min-w-0">
      <label htmlFor={id} className="block min-h-5 text-[13px] font-medium leading-5 text-[#475569]">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        maxLength={label.startsWith("Image alt") ? 240 : 2000}
        rows={1}
        wrap="soft"
        value={value}
        disabled={disabled}
        spellCheck={false}
        onKeyDown={(event) => {
          // URLs and image descriptions stay a single CMS value, not paragraphs.
          if (event.key === "Enter") event.preventDefault();
        }}
        onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, " "))}
        className="mt-1.5 block min-h-9 w-full min-w-0 resize-none rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-normal leading-5 text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.04)] [overflow-wrap:anywhere] outline-none transition-colors hover:border-slate-400 focus:border-[#004BB8]/40 focus:ring-2 focus:ring-[#004BB8]/15 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700"
      />
      <CmsFieldError name={label.startsWith("Image alt") ? "imageAlt" : "image"} />
    </div>
  );
}
