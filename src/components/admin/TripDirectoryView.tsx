import { ConfirmedTripRecordsTable } from "@/components/admin/ConfirmedTripRecordsTable";
import type { AdminConfirmedTripRow } from "@/services/adminConfirmedTripsDirectoryService";

type Props = { rows: AdminConfirmedTripRow[]; subtle?: boolean };

/** List-only presentation for verified trip rows. */
export function TripDirectoryView({ rows }: Props) {
  return <ConfirmedTripRecordsTable rows={rows} />;
}
