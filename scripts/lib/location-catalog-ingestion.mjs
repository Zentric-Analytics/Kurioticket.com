import { createHash } from "node:crypto";

export const OURAIRPORTS_ALLOWED_TYPES = new Set(["large_airport", "medium_airport", "small_airport"]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(field); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (quoted) throw new Error("Malformed CSV: unclosed quoted field.");
  if (rows.length < 2) throw new Error("Malformed CSV: header and at least one data row are required.");
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export function validateManifest(manifest) {
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (manifest?.dataset !== "ourairports-airports") errors.push("dataset must be ourairports-airports.");
  if (!/^https:\/\/ourairports\.com\/data\/airports\.csv$/.test(manifest?.sourceUrl ?? "")) errors.push("sourceUrl must be the approved OurAirports HTTPS CSV URL.");
  if (manifest?.license !== "Public Domain") errors.push("license must record OurAirports as Public Domain.");
  if (manifest?.status === "snapshot" && !/^[a-f0-9]{64}$/.test(manifest?.sha256 ?? "")) errors.push("snapshot manifests require a lowercase SHA-256 checksum.");
  if (manifest?.status === "snapshot" && !/^\d{4}-\d{2}-\d{2}T/.test(manifest?.retrievedAt ?? "")) errors.push("snapshot manifests require an ISO retrievedAt timestamp.");
  return errors;
}

const validCode = (value, size) => new RegExp(`^[A-Z0-9]{${size}}$`).test(value);
const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export function normalizeOurAirports(records) {
  const rejected = [];
  const provisional = [];
  for (const record of records) {
    const iata = clean(record.iata_code).toUpperCase();
    const icao = clean(record.ident).toUpperCase();
    const type = clean(record.type);
    const latitude = Number(record.latitude_deg);
    const longitude = Number(record.longitude_deg);
    const reasons = [];
    if (!OURAIRPORTS_ALLOWED_TYPES.has(type)) reasons.push("unsupported-type");
    if (clean(record.scheduled_service).toLowerCase() !== "yes") reasons.push("no-scheduled-service");
    if (!validCode(iata, 3)) reasons.push("invalid-iata");
    if (icao && !validCode(icao, 4)) reasons.push("invalid-icao");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) reasons.push("invalid-coordinates");
    if (!/^[A-Z]{2}$/.test(clean(record.iso_country).toUpperCase())) reasons.push("invalid-country");
    if (!clean(record.name) || !clean(record.municipality)) reasons.push("missing-name-or-city");
    if (reasons.length) { rejected.push({ sourceId: clean(record.id), iata: iata || null, reasons }); continue; }
    provisional.push({
      id: `airport:${iata}`, code: iata, icao: icao || undefined,
      city: clean(record.municipality), airport: clean(record.name), countryCode: clean(record.iso_country).toUpperCase(),
      latitude, longitude, aliases: [clean(record.local_code), clean(record.gps_code)].filter((value) => value && value !== icao),
      sourceId: clean(record.id), sourceType: type, staticCoverage: { flights: "reference-only", hotels: "none", cars: "reference-only", packages: "reference-only" },
    });
  }
  const byIata = new Map();
  for (const candidate of provisional) byIata.set(candidate.code, [...(byIata.get(candidate.code) ?? []), candidate]);
  const ambiguous = [...byIata.entries()].filter(([, values]) => values.length > 1).map(([code, values]) => ({ code, sourceIds: values.map((value) => value.sourceId).sort() }));
  const ambiguousCodes = new Set(ambiguous.map((entry) => entry.code));
  const candidates = provisional.filter((candidate) => !ambiguousCodes.has(candidate.code)).sort((left, right) => left.code.localeCompare(right.code));
  return { candidates, rejected, ambiguous: ambiguous.sort((left, right) => left.code.localeCompare(right.code)) };
}

export function buildCoverageReport(current, normalized) {
  const currentByCode = new Map(current.map((airport) => [airport.code, airport]));
  const inputByCode = new Map(normalized.candidates.map((airport) => [airport.code, airport]));
  const missingFromCurrent = normalized.candidates.filter((airport) => !currentByCode.has(airport.code)).map((airport) => airport.code);
  const missingFromInput = current.filter((airport) => !inputByCode.has(airport.code)).map((airport) => airport.code).sort();
  const changed = normalized.candidates.flatMap((airport) => {
    const existing = currentByCode.get(airport.code);
    if (!existing) return [];
    const fields = [];
    if (clean(existing.city) !== airport.city) fields.push("city");
    if (clean(existing.airport) !== airport.airport) fields.push("airport");
    if (clean(existing.countryCode).toUpperCase() !== airport.countryCode) fields.push("countryCode");
    const oldLat = existing.latitude ?? existing.lat, oldLon = existing.longitude ?? existing.lon;
    if (Number(oldLat) !== airport.latitude || Number(oldLon) !== airport.longitude) fields.push("coordinates");
    return fields.length ? [{ code: airport.code, fields }] : [];
  });
  return { currentCount: current.length, inputCandidateCount: normalized.candidates.length, missingFromCurrent, missingFromInput, changed, ambiguous: normalized.ambiguous, rejectedCount: normalized.rejected.length, availabilityClaimed: false };
}

export function verifySnapshot(csv, manifest) {
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join("\n"));
  const actual = sha256(csv);
  if (actual !== manifest.sha256) throw new Error(`Checksum mismatch: expected ${manifest.sha256}, received ${actual}.`);
  return actual;
}

export function selectRollbackSnapshot(manifests, activeVersion, retain = 3) {
  const snapshots = manifests.filter((item) => item.status === "snapshot" && item.version !== activeVersion)
    .sort((left, right) => String(right.retrievedAt).localeCompare(String(left.retrievedAt)));
  return { rollback: snapshots[0] ?? null, retained: snapshots.slice(0, Math.max(1, retain)) };
}
