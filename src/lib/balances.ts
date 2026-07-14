import type { SupabaseClient } from "@supabase/supabase-js";

// Calculated balance = opening balance + confirmed income - confirmed
// expense/transfer/investment outflow (ACC-03, BR-14: only confirmed,
// non-deleted logical transactions feed calculated totals).
export async function getAccountMovements(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("transactions")
    .select("account_id, amount, type")
    .eq("status", "confirmed")
    .is("deleted_at", null);

  const movementByAccount = new Map<string, number>();
  for (const tx of data || []) {
    const signed = tx.type === "income" ? Number(tx.amount) : -Number(tx.amount);
    movementByAccount.set(tx.account_id, (movementByAccount.get(tx.account_id) || 0) + signed);
  }
  return movementByAccount;
}
