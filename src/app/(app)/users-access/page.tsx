import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { GRANTABLE_PAGES } from "@/lib/nav";
import { inviteAccountant, removeAccountant } from "./actions";
import PermissionChecklist from "./permission-checklist";

export default async function UsersAccessPage() {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  const userEmail = headers().get("x-user-email");
  const { data: caller } = userId
    ? await supabase.from("profiles").select("full_name, role, created_at, managed_owner_id, allowed_pages").eq("id", userId).single()
    : { data: null };

  const isOwner = caller?.role === "owner" || !caller;
  const canInvite = isOwner || (caller?.allowed_pages || []).includes("/users-access");
  const effectiveOwnerId = isOwner ? userId : caller?.managed_owner_id;

  const { data: accountants } = effectiveOwnerId
    ? await supabase.from("profiles").select("id, full_name, created_at, allowed_pages").eq("managed_owner_id", effectiveOwnerId).order("created_at")
    : { data: null };

  // listUsers() scans every auth user in the project, so it's fetched at
  // most once per render and reused below — both the delegate's owner-email
  // lookup and the accountant roster's emails need it, and calling it twice
  // was a redundant full user-list round trip on the same page load.
  const needsUserList = !isOwner || (accountants && accountants.length > 0);
  const userList = needsUserList ? (await createAdminClient().auth.admin.listUsers()).data : null;

  // The Owner's own row, for display in the roster — self if we ARE the
  // owner, otherwise fetched separately since it's a different id than ours.
  const ownerRow = isOwner
    ? { full_name: caller?.full_name ?? "Owner", email: userEmail ?? "-" }
    : await (async () => {
        const { data } = effectiveOwnerId ? await supabase.from("profiles").select("full_name").eq("id", effectiveOwnerId).single() : { data: null };
        const email = userList?.users.find((u) => u.id === effectiveOwnerId)?.email || "-";
        return { full_name: data?.full_name ?? "Owner", email };
      })();

  let accountantEmails: Record<string, string> = {};
  if (accountants && accountants.length > 0 && userList) {
    accountantEmails = Object.fromEntries(
      (userList.users || []).filter((u) => accountants.some((a) => a.id === u.id)).map((u) => [u.id, u.email || "-"])
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Users &amp; Access</h1>
      <p className="text-sm text-muted mt-1 mb-6">User directory, invitations, permissions, selected accounts and password resets</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-6">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="bg-[#faf9f7] text-muted uppercase text-[10px]">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#edf0ee]">
              <td className="p-3 font-semibold">{ownerRow.full_name}</td>
              <td className="p-3">{ownerRow.email}</td>
              <td className="p-3 capitalize">Owner</td>
              <td className="p-3">
                <span className="rounded-full bg-[#e5f4eb] text-success px-2 py-1 font-bold text-[10px]">Active</span>
              </td>
            </tr>
            {(accountants || []).map((a) => (
              <tr key={a.id} className="border-t border-[#edf0ee] align-top">
                <td className="p-3 font-semibold">{a.full_name}</td>
                <td className="p-3">{accountantEmails[a.id] ?? "-"}</td>
                <td className="p-3 capitalize">Accountant</td>
                <td className="p-3">
                  <div>
                    <span className="rounded-full bg-[#e5f4eb] text-success px-2 py-1 font-bold text-[10px]">Active</span>
                    <span className="text-[10px] text-muted ml-2">since {formatDate(a.created_at)}</span>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-3 mt-1">
                      <PermissionChecklist
                        accountantId={a.id}
                        accountantName={a.full_name}
                        grantablePages={GRANTABLE_PAGES}
                        currentAllowed={a.allowed_pages || []}
                      />
                      <form action={removeAccountant}>
                        <input type="hidden" name="accountant_id" value={a.id} />
                        <button type="submit" className="text-[#b64b52] text-[11px] font-semibold">
                          Remove access
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canInvite ? (
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-xl">
          <h3 className="text-sm font-bold text-navy mb-2">+ Invite Accountant</h3>
          <p className="text-xs text-muted mb-4">
            A new Accountant starts with zero page access — grant pages individually from the checklist next to their
            name above. Whatever's granted, they can always view and add records but never edit or delete anything,
            on any page.
          </p>
          <form action={inviteAccountant} className="grid gap-3">
            <div>
              <label className="block text-xs text-muted mb-1.5">Full name</label>
              <input name="full_name" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Email</label>
              <input name="email" type="email" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Temporary password</label>
              <input name="password" type="text" required minLength={6} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
              <p className="text-[11px] text-muted mt-1">Share this with the Accountant directly — there is no email invite yet.</p>
            </div>
            <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">
              + Invite Accountant
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-[#f0f3f8] border border-[#d9e0ec] rounded-2xl p-5 max-w-2xl">
          <p className="text-xs text-[#394a68]">You don&apos;t have access to invite or manage Accountants.</p>
        </div>
      )}
    </div>
  );
}
