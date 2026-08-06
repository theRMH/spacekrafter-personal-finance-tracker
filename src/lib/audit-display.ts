// Best-effort human label for an audit entry's subject — falls back through
// the field most likely to identify the record for each entity_table, since
// audit_log only stores raw JSON snapshots, not a dedicated label column.
const LABEL_FIELDS: Record<string, string[]> = {
  accounts: ["name"],
  investments: ["name"],
  commitments: ["name"],
  transactions: ["payee_payer", "narration"],
  import_batches: ["file_name"],
  profiles: ["full_name", "email"],
};

export function entityLabel(entityTable: string, before: any, after: any): string | null {
  const fields = LABEL_FIELDS[entityTable] || ["name"];
  const source = after || before;
  if (!source) return null;
  for (const f of fields) {
    if (source[f]) return String(source[f]);
  }
  return null;
}

// Only the keys that actually changed between before/after, so a diff view
// isn't cluttered with every untouched column on the row.
export function diffFields(before: any, after: any): { key: string; from: unknown; to: unknown }[] {
  if (!before && !after) return [];
  const keys = new Set([...(before ? Object.keys(before) : []), ...(after ? Object.keys(after) : [])]);
  const skip = new Set(["id", "created_at", "owner_id"]);
  const rows: { key: string; from: unknown; to: unknown }[] = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const from = before?.[key];
    const to = after?.[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      rows.push({ key, from, to });
    }
  }
  return rows;
}

export const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  edit_transaction: "Edited",
  undo_edit_transaction: "Undid edit",
  redo_edit_transaction: "Redid edit",
  categorize_confirm: "Categorised & confirmed",
  confirm: "Confirmed",
  soft_delete: "Deleted",
  mark_paid: "Marked paid",
  mark_received: "Marked received",
  cancel: "Cancelled",
  restart: "Restarted",
  update_value: "Updated value",
  import_statement: "Imported statement",
  undo_import: "Undid import",
  password_change: "Changed password",
  invite_accountant: "Invited accountant",
  bulk_categorize: "Bulk categorised",
  bulk_delete: "Bulk deleted",
};

export const ENTITY_TABLE_LABELS: Record<string, string> = {
  accounts: "Account",
  investments: "Investment",
  commitments: "Commitment",
  transactions: "Transaction",
  import_batches: "Import batch",
  profiles: "Profile",
};
