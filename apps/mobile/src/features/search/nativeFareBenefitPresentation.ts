import { compactFareTerms } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm, TripType } from "../../../../../src/lib/types";

export type NativeFareBenefitPresentation = { title: string; detail: string };
export type NativeFareBenefitRow = NativeFareBenefitPresentation & { key: string; semantic: FlightFareTerm["semantic"] };

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
    const excludedBaggage = body.match(/^(?:1|first)\s+(carry-on|checked bag)\s+not included(?:\s*[·:]\s*(.+))?$/i);
    if (excludedBaggage) return {
      title: withScope(scope, excludedBaggage[1].toLowerCase().startsWith("carry") ? "Carry-on baggage" : "Checked baggage"),
      detail: `Not included${excludedBaggage[2] ? ` · ${excludedBaggage[2]}` : ""}`,
    };
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

const unscopedTitle = (title: string) => title.replace(/^(Outbound|Return|Flight \d+):\s*/i, "");
const scopeFromTitle = (title: string) => title.match(/^(Outbound|Return|Flight \d+):/i)?.[1];
const groupedSemantic = (semantics: FlightFareTerm["semantic"][]): FlightFareTerm["semantic"] =>
  semantics.length > 0 && semantics.every((semantic) => semantic === semantics[0]) ? semantics[0] : "informational";

/** Builds the native card's three decision-oriented disclosures without changing shared web compaction. */
export function nativeFareBenefitRows(terms: FlightFareTerm[], tripType: TripType, maxRows = 3): NativeFareBenefitRow[] {
  const sourceRows = compactFareTerms(terms, tripType, Number.MAX_SAFE_INTEGER, true).map((row, position) => ({
    ...nativeFareBenefitPresentation(row.term.category, row.text), category: row.term.category,
    semantic: row.term.semantic, key: `${row.index}-${row.rowIndex}-${position}`,
  }));
  const consumed = new Set<number>();
  const grouped: Array<NativeFareBenefitRow & { category?: FlightFareTerm["category"]; priority: number; position: number }> = [];
  const partialBaggageWarnings = sourceRows.map((row, position) => ({ row, position })).filter(({ row }) =>
    row.category === "baggage" && unscopedTitle(row.title) === "Baggage allowance" && /one or more passengers/i.test(row.detail),
  );
  const addGroup = (kind: "Carry-on baggage" | "Checked baggage" | "Change/refund rules", priority: number) => {
    const matches = sourceRows.map((row, position) => ({ row, position })).filter(({ row }) => {
      const title = unscopedTitle(row.title);
      return kind === "Change/refund rules" ? row.category === "change" || row.category === "refund" || title === kind : title === kind;
    });
    if (!matches.length) return;
    matches.forEach(({ position }) => consumed.add(position));
    const baggageWarnings = kind === "Change/refund rules" ? [] : partialBaggageWarnings;
    baggageWarnings.forEach(({ position }) => consumed.add(position));
    const details = matches.map(({ row }) => {
      const scope = scopeFromTitle(row.title);
      if (kind !== "Change/refund rules") return scope ? `${scope}: ${row.detail}` : row.detail;
      if (unscopedTitle(row.title) === kind) return scope ? `${scope}: ${row.detail}` : row.detail;
      const rule = row.category === "change" ? "changes" : "refunds";
      return `${scope ? `${scope} ${rule}` : sentenceCase(rule)}: ${row.detail}`;
    });
    if (baggageWarnings.length) {
      details.push(...baggageWarnings.map(({ row }) => {
        const scope = scopeFromTitle(row.title);
        return `${scope ? `${scope} allowance` : "Allowance"}: ${row.detail}`;
      }));
    }
    const semanticRows = [...matches, ...baggageWarnings];
    grouped.push({
      title: kind,
      detail: details.join("\n"),
      semantic: groupedSemantic(semanticRows.map(({ row }) => row.semantic)),
      key: `${kind}:${semanticRows.map(({ row }) => row.key).join("+")}`,
      priority,
      position: matches[0].position,
    });
  };
  addGroup("Carry-on baggage", 0);
  addGroup("Checked baggage", 1);
  addGroup("Change/refund rules", 2);
  sourceRows.forEach((row, position) => { if (!consumed.has(position)) grouped.push({ ...row, priority: 3, position }); });
  return grouped.sort((left, right) => left.priority - right.priority || left.position - right.position).slice(0, maxRows)
    .map(({ priority: _priority, position: _position, category: _category, ...row }) => row);
}
