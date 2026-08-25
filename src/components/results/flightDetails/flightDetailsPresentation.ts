import type { FlightFareTerm, FlightSegment, TripType } from "@/lib/types";

export function resolveSegmentCarrierName(
  segment: FlightSegment,
  offerAirlineName: string,
) {
  return (
    segment.airlineName?.trim() ||
    segment.marketingCarrier?.name.trim() ||
    offerAirlineName.trim()
  );
}

export function canUseOfferAirlineLogo(
  segment: FlightSegment,
  offerAirlineName: string,
  offerAirlineLogo?: string | null,
) {
  if (!offerAirlineLogo) return false;
  return (
    normalizeCarrierIdentity(
      resolveSegmentCarrierName(segment, offerAirlineName),
    ) === normalizeCarrierIdentity(offerAirlineName)
  );
}

export function compactFareTerms(terms: FlightFareTerm[], tripType: TripType) {
  return terms
    .flatMap((term, index) =>
      buildFareDisplayRows(term, tripType).map((text, rowIndex) => ({
        term,
        index,
        rowIndex,
        text,
      })),
    )
    .sort((left, right) => {
      const priorityDifference =
        fareDisplayRowPriority(left.term, left.text) -
        fareDisplayRowPriority(right.term, right.text);
      return (
        priorityDifference ||
        left.index - right.index ||
        left.rowIndex - right.rowIndex
      );
    })
    .slice(0, 3);
}

export function buildFareDisplayRows(
  term: FlightFareTerm,
  tripType: TripType,
) {
  const text =
    tripType === "one-way"
      ? term.text.replace(/^Outbound:\s*/i, "")
      : term.text;

  if (term.category !== "baggage") return [text];

  const scopeMatch = text.match(/^(Outbound|Return|Flight \d+):\s*(.+)$/i);
  const scope = scopeMatch?.[1];
  const baggageText = scopeMatch?.[2] ?? text;
  const clauses = baggageText.split(/,\s*/);
  if (clauses.length !== 2) return [text];

  const recognized = clauses.map((clause) => {
    const match = clause.match(
      /^(\d+)\s+(carry-ons?|checked bags?)\s+included$/i,
    );
    if (!match) return null;
    return {
      kind: match[2].toLowerCase().startsWith("carry")
        ? "carry-on"
        : "checked-bag",
      text: clause,
    } as const;
  });
  if (
    recognized.some((clause) => clause === null) ||
    new Set(recognized.map((clause) => clause?.kind)).size !== 2
  ) {
    return [text];
  }

  return recognized
    .filter((clause): clause is NonNullable<typeof clause> => clause !== null)
    .sort((left, right) =>
      left.kind === right.kind ? 0 : left.kind === "carry-on" ? -1 : 1,
    )
    .map((clause) => (scope ? `${scope}: ${clause.text}` : clause.text));
}

function normalizeCarrierIdentity(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function fareDisplayRowPriority(term: FlightFareTerm, text: string) {
  if (term.category === "baggage" && /\bcarry-ons?\b/i.test(text)) return 0;
  if (term.category === "baggage" && /\bchecked bags?\b/i.test(text)) return 1;
  if (
    term.semantic === "negative" &&
    (term.category === "change" || term.category === "refund")
  ) {
    return 2;
  }
  if (term.semantic === "negative") return 3;
  if (term.category === "change" || term.category === "refund") return 4;
  if (term.category === "baggage") return 5;
  return 6;
}
