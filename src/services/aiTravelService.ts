import OpenAI from "openai";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { trackAnalyticsEvent } from "@/services/analyticsService";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export async function explainTravelOptions(input: {
  userId?: string | null;
  question: string;
  flights?: PublicFlightResult[];
  hotels?: PublicHotelResult[];
}) {
  const client = getOpenAI();
  await trackAnalyticsEvent({
    userId: input.userId,
    type: "AI_USAGE",
    name: "travel_concierge_explanation",
    metadata: { hasFlights: Boolean(input.flights?.length), hasHotels: Boolean(input.hotels?.length) },
  });

  if (!client) {
    return {
      text:
        "AI Travel Concierge is ready to analyze provider data once OPENAI_API_KEY is configured. I can only use verified search results as truth and will not invent prices, availability, baggage rules, or policies.",
      usedFallback: true,
    };
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    instructions:
      "You are Curioticket's AI Travel Concierge. Use only the provided flight and hotel data as truth. Do not invent prices, availability, baggage rules, airline policies, hotel policies, or guaranteed savings. If data is missing, say it is unavailable or uncertain. Focus on reducing travel stress, clarifying tradeoffs, and helping the traveler save money safely.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              question: input.question,
              flights: input.flights?.slice(0, 6) || [],
              hotels: input.hotels?.slice(0, 6) || [],
            }),
          },
        ],
      },
    ],
    max_output_tokens: 700,
  });

  return { text: response.output_text || "No AI analysis was returned.", usedFallback: false };
}
