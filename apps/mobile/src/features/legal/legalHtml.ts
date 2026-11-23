import type { MobileLegalDocument } from "../../api/legalApi";

export const escapeLegalText = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

type LegalHtmlOptions = {
  dark: boolean;
  lang: string;
  direction: "ltr" | "rtl";
  tableOfContentsFallback: string;
};

const INTER_FONT_URL = "https://kurioticket.com/brand/fonts/inter/Inter-VariableFont.ttf";

export function buildLegalHtml(document: MobileLegalDocument, options: LegalHtmlOptions): string {
  const { dark, lang, direction, tableOfContentsFallback } = options;
  const colors = dark
    ? {
        page: "#091224",
        paper: "#0F1A2D",
        text: "#F4F7FF",
        body: "#D7DEED",
        muted: "#AAB5CD",
        border: "#2B3952",
        teal: "#48C8C2",
        shadow: "rgba(0,0,0,.22)",
      }
    : {
        page: "#F7F9FC",
        paper: "#FFFFFF",
        text: "#071A48",
        body: "#334155",
        muted: "#64748B",
        border: "#E2E8F0",
        teal: "#0F9F9A",
        shadow: "rgba(15,23,42,.08)",
      };
  const tableOfContentsLabel = document.tableOfContentsLabel || tableOfContentsFallback;
  const legalCenterLabel = document.legalCenterLabel || "Legal Center";
  const sections = document.sections.map((section) => `<section id="${escapeLegalText(section.id)}"><h2>${escapeLegalText(section.title)}</h2><div class="section-body">${section.paragraphs.map((paragraph) => `<p>${escapeLegalText(paragraph)}</p>`).join("")}</div></section>`).join("");
  const contents = document.sections.map((section) => `<a href="#${escapeLegalText(section.id)}">${escapeLegalText(section.title)}</a>`).join("");
  return `<!doctype html><html lang="${escapeLegalText(lang)}" dir="${direction}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@font-face{font-family:Inter;src:url("${INTER_FONT_URL}") format("truetype");font-style:normal;font-weight:100 900;font-display:swap}*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}html,body{margin:0;background:${colors.page};color:${colors.text};font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;direction:${direction}}body{text-align:${direction === "rtl" ? "right" : "left"};padding:16px 14px 30px}.legal-paper{max-width:720px;margin:0 auto;background:linear-gradient(${colors.paper},${colors.paper}) padding-box,linear-gradient(180deg,rgba(15,159,154,.42),rgba(37,99,235,.18)) border-box;border:1px solid transparent;border-radius:12px;box-shadow:0 2px 10px ${colors.shadow};overflow:hidden}.document-head{padding:20px 18px 22px;border-bottom:1px solid ${colors.border}}.legal-center{display:inline-block;color:${colors.teal};font-size:14px;line-height:20px;font-weight:650;text-decoration:none}.document-title{font-size:28px;line-height:34px;font-weight:750;letter-spacing:-.02em;margin:10px 0 0;color:${colors.text}}.summary{max-width:680px;font-size:16px;line-height:25px;color:${colors.muted};margin:8px 0 0}.updated{font-size:13px;line-height:19px;font-weight:650;color:${colors.muted};margin:12px 0 0}.document-grid{display:grid;grid-template-columns:1fr;gap:28px;padding:22px 18px 28px}.contents{min-width:0}.contents-label{font-size:13px;line-height:18px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${colors.muted};margin:0 0 10px}.contents-nav{display:grid;gap:2px}.contents-nav a{display:flex;align-items:center;min-height:44px;padding:7px 0;color:${colors.text};font-size:14px;line-height:20px;font-weight:650;text-decoration:none}.article{min-width:0;display:grid;gap:30px}section{scroll-margin-top:18px}h2{font-size:20px;line-height:27px;font-weight:750;margin:0;color:${colors.text}}.section-body{display:grid;gap:12px;margin-top:12px}p{font-size:16px;line-height:28px;margin:0;color:${colors.body}}ul,ol{font-size:16px;line-height:28px;padding-inline-start:24px;color:${colors.body}}li+li{margin-top:8px}.table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}table{border-collapse:collapse;min-width:520px;font-size:14px;line-height:21px;color:${colors.body}}th,td{border:1px solid ${colors.border};padding:10px;text-align:start}blockquote,.notice{border-inline-start:4px solid ${colors.teal};background:${dark ? "#111D33" : "#F0F7F7"};padding:14px 16px;margin:16px 0;border-radius:8px}@media(max-width:360px){body{padding-inline:10px}.document-head,.document-grid{padding-inline:15px}.document-title{font-size:26px;line-height:32px}h2{font-size:19px}}@media(min-width:700px){.document-grid{grid-template-columns:220px minmax(0,1fr);gap:32px;padding:24px 24px 32px}.document-head{padding:24px}.document-title{font-size:30px;line-height:36px}}</style></head><body><main class="legal-paper"><header class="document-head"><span class="legal-center">${escapeLegalText(legalCenterLabel)}</span><h1 class="document-title">${escapeLegalText(document.title)}</h1>${document.summary ? `<p class="summary">${escapeLegalText(document.summary)}</p>` : ""}<p class="updated">${escapeLegalText(document.lastUpdatedLabel)}: ${escapeLegalText(document.lastUpdated)}</p></header><div class="document-grid"><aside class="contents"><h2 class="contents-label">${escapeLegalText(tableOfContentsLabel)}</h2><nav class="contents-nav" aria-label="${escapeLegalText(tableOfContentsLabel)}">${contents}</nav></aside><article class="article">${sections}</article></div></main></body></html>`;
}
