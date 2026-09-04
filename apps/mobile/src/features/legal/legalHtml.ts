import type { MobileLegalDocument } from "../../api/legalApi";

export const escapeLegalText = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

type LegalHtmlOptions = {
  dark: boolean;
  lang: string;
  direction: "ltr" | "rtl";
};

const INTER_FONT_URL = "https://kurioticket.com/brand/fonts/inter/Inter-VariableFont.ttf";

export function buildLegalHtml(document: MobileLegalDocument, options: LegalHtmlOptions): string {
  const { dark, lang, direction } = options;
  const colors = dark
    ? { background: "#091224", text: "#F4F7FF", muted: "#AAB5CD", border: "#2B3952" }
    : { background: "#FAFBFF", text: "#071A48", muted: "#56658E", border: "#E7ECF5" };
  const sections = document.sections.map((section) => `<section id="${escapeLegalText(section.id)}"><h2>${escapeLegalText(section.title)}</h2><div class="section-body">${section.paragraphs.map((paragraph) => `<p>${escapeLegalText(paragraph)}</p>`).join("")}</div></section>`).join("");
  const contents = document.sections.map((section) => `<li><a href="#${escapeLegalText(section.id)}">${escapeLegalText(section.title)}</a></li>`).join("");
  return `<!doctype html><html lang="${escapeLegalText(lang)}" dir="${direction}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@font-face{font-family:Inter;src:url("${INTER_FONT_URL}") format("truetype");font-style:normal;font-weight:100 900;font-display:swap}*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}html,body{margin:0;background:${colors.background};color:${colors.text};font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;direction:${direction}}body{text-align:${direction === "rtl" ? "right" : "left"}}main{max-width:720px;margin:0 auto;padding:20px 20px 38px}.summary{font-size:16px;line-height:25px;color:${colors.muted};margin:0 0 12px}.updated{font-size:13px;line-height:19px;font-weight:600;color:${colors.muted};padding-bottom:20px;border-bottom:1px solid ${colors.border};margin:0}.contents{padding:20px 0 6px;border-bottom:1px solid ${colors.border};margin-bottom:26px}.contents-label{font-size:12px;line-height:18px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${colors.muted};margin:0 0 8px}.contents ol{margin:0;padding-inline-start:22px}.contents li{padding:3px 0}.contents a,a{color:#0754F7;font-size:14px;line-height:22px;font-weight:650;text-underline-offset:3px;min-height:44px}section{margin:0 0 30px;scroll-margin-top:18px}h2{font-size:20px;line-height:27px;font-weight:750;margin:0 0 12px}.section-body{display:grid;gap:13px}p{font-size:16px;line-height:26px;margin:0}ul,ol{font-size:16px;line-height:26px;padding-inline-start:24px}li+li{margin-top:8px}.table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}table{border-collapse:collapse;min-width:520px;font-size:14px;line-height:21px}th,td{border:1px solid ${colors.border};padding:10px;text-align:start}blockquote,.notice{border-inline-start:4px solid #0754F7;background:${dark ? "#111D33" : "#F0F5FF"};padding:14px 16px;margin:16px 0;border-radius:8px}@media(max-width:360px){main{padding-inline:16px}h2{font-size:19px}}</style></head><body><main>${document.summary ? `<p class="summary">${escapeLegalText(document.summary)}</p>` : ""}<p class="updated">${escapeLegalText(document.lastUpdatedLabel)}: ${escapeLegalText(document.lastUpdated)}</p><nav class="contents" aria-label="${escapeLegalText(document.tableOfContentsLabel)}"><p class="contents-label">${escapeLegalText(document.tableOfContentsLabel)}</p><ol>${contents}</ol></nav>${sections}</main></body></html>`;
}
