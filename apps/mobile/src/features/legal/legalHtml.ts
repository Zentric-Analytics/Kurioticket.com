import type { MobileLegalDocument } from "../../api/legalApi";

export const escapeLegalText = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

type LegalHtmlOptions = {
  dark: boolean;
  lang: string;
  direction: "ltr" | "rtl";
};

export function buildLegalHtml(document: MobileLegalDocument, options: LegalHtmlOptions): string {
  const { dark, lang, direction } = options;
  const colors = dark
    ? { background: "#091224", text: "#F4F7FF", muted: "#AAB5CD", border: "#2B3952" }
    : { background: "#FAFBFF", text: "#071A48", muted: "#56658E", border: "#E7ECF5" };
  const sections = document.sections.map((section) => `<section><h2>${escapeLegalText(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeLegalText(paragraph)}</p>`).join("")}</section>`).join("");
  return `<!doctype html><html lang="${escapeLegalText(lang)}" dir="${direction}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:${colors.background};color:${colors.text};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;direction:${direction}}main{padding:22px 20px 40px;text-align:${direction === "rtl" ? "right" : "left"}}.summary{font-size:16px;line-height:25px;color:${colors.muted};margin:0 0 12px}.updated{font-size:13px;line-height:19px;font-weight:600;color:${colors.muted};padding-bottom:20px;border-bottom:1px solid ${colors.border};margin:0 0 26px}section{margin:0 0 28px}h2{font-size:20px;line-height:27px;margin:0 0 12px}p{font-size:16px;line-height:26px;margin:0 0 14px}</style></head><body><main>${document.summary ? `<p class="summary">${escapeLegalText(document.summary)}</p>` : ""}<p class="updated">${escapeLegalText(document.lastUpdatedLabel)}: ${escapeLegalText(document.lastUpdated)}</p>${sections}</main></body></html>`;
}
