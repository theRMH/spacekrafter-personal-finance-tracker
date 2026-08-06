import type { SupabaseClient } from "@supabase/supabase-js";
import { isInflow } from "./transaction-types";

// Calculated balance = opening balance + confirmed inflows - confirmed
// outflows (ACC-03, BR-14: only confirmed, non-deleted logical transactions
// feed calculated totals). Inflow/outflow direction covers every type
// (income/expense plus advances, loans, transfers, investments) — the bank
// balance has to reflect every rupee that actually moved, regardless of
// which accounting bucket a transaction is tagged with.
export async function getAccountMovements(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("transactions")
    .select("account_id, amount, type")
    .eq("status", "confirmed")
    .is("deleted_at", null);

  const movementByAccount = new Map<string, number>();
  for (const tx of data || []) {
    const signed = isInflow(tx.type) ? Number(tx.amount) : -Number(tx.amount);
    movementByAccount.set(tx.account_id, (movementByAccount.get(tx.account_id) || 0) + signed);
  }
  return movementByAccount;
}
