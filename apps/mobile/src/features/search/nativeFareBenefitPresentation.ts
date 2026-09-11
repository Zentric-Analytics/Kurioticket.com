import type { FlightFareTerm } from "../../../../../src/lib/types";

export type NativeFareBenefitPresentation = { title: string; detail: string };

const withScope = (scope: string | undefined, title: string) => scope ? `${scope}: ${title}` : title;
const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Turns authoritative provider prose into a short disclosure heading and detail. */
export function nativeFareBenefitPresentation(category: FlightFareTerm["category"], text: string): NativeFareBenefitPresentation {
  const scoped = text.match(/^(Outbound|Return|Flight \d+):\s*(.+)$/i);
  const scope = scoped?.[1];
  const body = (scoped?.[2] ?? text).replace(/\.$/, "");

  if (/^change and refund rules not supplied by the provider$/i.test(body)) {
    return { title: withScope(scope, "Change/refund rules"), detail: "Not supplied by provider" };
  }
  if (/^baggage details not supplied by the provider$/i.test(body)) {
    return { title: withScope(scope, "Baggage details"), detail: "Not supplied by provider" };
  }
  if (/^baggage allowance not supplied for one or more passengers$/i.test(body)) {
    return { title: withScope(scope, "Baggage allowance"), detail: "Not supplied for one or more passengers" };
  }
  if (/^no additional comparable fare benefits were supplied by the provider$/i.test(body)) {
    return { title: withScope(scope, "Fare benefits"), detail: "No additional comparable benefits supplied by provider" };
  }

  if (category === "baggage") {
    const baggage = body.match(/^(\d+)\s+(carry-ons?|checked bags?)\s+included(?:\s+(each way))?$/i);
    if (baggage) {
      const title = baggage[2].toLowerCase().startsWith("carry") ? "Carry-on baggage" : "Checked baggage";
      return { title: withScope(scope, title), detail: `${baggage[1]} included${baggage[3] ? ` ${baggage[3]}` : ""}` };
    }
    return { title: withScope(scope, "Baggage details"), detail: body };
  }

  if (category === "change") {
    const penalty = body.match(/^changes allowed with (.+\s+penalty)(.*)$/i);
    if (penalty) return { title: withScope(scope, "Changes"), detail: `Allowed${penalty[2]} · ${penalty[1]}` };
    const state = body.match(/^changes\s+(.+)$/i);
    return { title: withScope(scope, "Changes"), detail: state ? sentenceCase(state[1]) : body };
  }

  if (category === "refund") {
    const penalty = body.match(/^(refundable.*?)\s+with\s+(.+\s+penalty)$/i);
    if (penalty) return { title: withScope(scope, "Refunds"), detail: `${sentenceCase(penalty[1])} · ${penalty[2]}` };
    return { title: withScope(scope, "Refunds"), detail: sentenceCase(body) };
  }

  return { title: withScope(scope, "Fare benefits"), detail: body };
}
