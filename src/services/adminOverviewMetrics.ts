/**
 * Database count aggregation for the canonical admin Overview. Never replace
 * unavailable counts with sample data or guessed values.
 */
export type AccountStatusGroup = {
  status: string;
  role: string;
  _count: { _all: number };
};

function checked(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid admin Overview count.");
  }
  return value;
}

export function summarizeAccountStatusRows(rows: readonly AccountStatusGroup[]) {
  const users = {
    total: 0,
    active: 0,
    activeCustomers: 0,
    activeAdmins: 0,
    activeSupport: 0,
    suspended: 0,
    pendingDeletion: 0,
    deleted: 0,
  };

  for (const row of rows) {
    const n = checked(row._count._all);
    users.total += n;
    if (row.status === "ACTIVE") {
      users.active += n;
      if (row.role === "USER") users.activeCustomers += n;
      else if (row.role === "ADMIN") users.activeAdmins += n;
      else if (row.role === "SUPPORT") users.activeSupport += n;
      else throw new Error("Unknown admin Overview account role.");
    } else if (row.status === "SUSPENDED") {
      users.suspended += n;
    } else if (row.status === "PENDING_DELETION") {
      users.pendingDeletion += n;
    } else if (row.status === "DELETED") {
      users.deleted += n;
    } else {
      throw new Error("Unknown admin Overview account status.");
    }
  }

  if (
    !Number.isSafeInteger(users.total) ||
    users.total !== users.active + users.suspended + users.pendingDeletion + users.deleted ||
    users.active !== users.activeCustomers + users.activeAdmins + users.activeSupport
  ) {
    throw new Error("Inconsistent admin Overview account totals.");
  }
  return users;
}

export function summarizeAuditEvents(total: number, human: number) {
  const checkedTotal = checked(total);
  const checkedHuman = checked(human);
  if (checkedHuman > checkedTotal) {
    throw new Error("Inconsistent admin Overview audit event totals.");
  }
  return { total: checkedTotal, human: checkedHuman, automated: checkedTotal - checkedHuman };
}
