import type { SupabaseClient } from "@supabase/supabase-js";

// Single place every mutating action logs through, so audit_log coverage
// and shape stay consistent instead of each action hand-rolling its own
// insert (some of which only captured `after`, making undo impossible).
export async function logAudit(
  supabase: SupabaseClient,
  params: {
    ownerId: string;
    actorId: string;
    action: string;
    entityTable: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }
) {
  await supabase.from("audit_log").insert({
    owner_id: params.ownerId,
    actor_id: params.actorId,
    action: params.action,
    entity_table: params.entityTable,
    entity_id: params.entityId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
