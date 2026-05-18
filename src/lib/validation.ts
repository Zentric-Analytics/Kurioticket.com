export const priceAlertSchema =
  z.object({
    type: z.enum([
      "FLIGHT",
      "HOTEL",
    ]),

    origin: z
      .string()
      .trim()
      .max(80)
      .optional(),

    destination: z
      .string()
      .trim()
      .min(2)
      .max(120),

    targetPrice:
      z.coerce
        .number()
        .positive()
        .optional(),

    currency: z
      .string()
      .trim()
      .length(3)
      .default("USD"),

    query: z.record(
      z.string(),
      z.unknown(),
    ),
  });