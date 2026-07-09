export type AirlineOption = {
  code: string;
  name: string;
  logoUrl?: string;
};

export const airlines: AirlineOption[] = [
  { code: "AA", name: "American Airlines" },
  { code: "AC", name: "Air Canada" },
  { code: "AF", name: "Air France" },
  { code: "AI", name: "Air India" },
  { code: "AS", name: "Alaska Airlines" },
  { code: "AT", name: "Royal Air Maroc" },
  { code: "BA", name: "British Airways" },
  { code: "B6", name: "JetBlue" },
  { code: "CX", name: "Cathay Pacific" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "EK", name: "Emirates" },
  { code: "ET", name: "Ethiopian Airlines" },
  { code: "EY", name: "Etihad Airways" },
  { code: "IB", name: "Iberia" },
  { code: "KL", name: "KLM" },
  { code: "KQ", name: "Kenya Airways" },
  { code: "LH", name: "Lufthansa" },
  { code: "MS", name: "EgyptAir" },
  { code: "NK", name: "Spirit Airlines" },
  { code: "P4", name: "Air Peace" },
  { code: "QF", name: "Qantas" },
  { code: "QR", name: "Qatar Airways" },
  { code: "SA", name: "South African Airways" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "UA", name: "United Airlines" },
  { code: "VS", name: "Virgin Atlantic" },
  { code: "WB", name: "RwandAir" },
  { code: "WN", name: "Southwest Airlines" },
];

export const airlineAliases: Record<string, string> = {
  delta: "DL",
  "delta airlines": "DL",
  "delta air lines": "DL",
  united: "UA",
  "united airlines": "UA",
  emirates: "EK",
  jetblue: "B6",
  "jet blue": "B6",
  klm: "KL",
  egyptair: "MS",
  qantas: "QF",
  lufthansa: "LH",
};
