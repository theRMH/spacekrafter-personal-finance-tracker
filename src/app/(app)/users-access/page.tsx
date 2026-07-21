import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { inviteAccountant } from "./actions";

export default async function UsersAccessPage() {
  const supabase = createClient();
  const userId = headers().get("x-user-id");
  const userEmail = headers().get("x-user-email");
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, role, created_at").eq("id", userId).single()
    : { data: null };

  const isOwner = profile?.role === "owner" || !profile;

  const { data: accountants } = isOwner && userId
    ? await supabase.from("profiles").select("id, full_name, created_at").eq("managed_owner_id", userId).order("created_at")
    : { data: null };

  let accountantEmails: Record<string, string> = {};
  if (accountants && accountants.length > 0) {
    const admin = createAdminClient();
    const { data: userList } = await admin.auth.admin.listUsers();
    accountantEmails = Object.fromEntries(
      (userList?.users || []).filter((u) => accountants.some((a) => a.id === u.id)).map((u) => [u.id, u.email || "-"])
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Users &amp; Access</h1>
      <p className="text-sm text-muted mt-1 mb-6">User directory, invitations, permissions, selected accounts and password resets</p>

      <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm overflow-auto mb-6">
        <table className="w-full text-xs">
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
              <td className="p-3 font-semibold">{profile?.full_name ?? "Owner"}</td>
              <td className="p-3">{userEmail}</td>
              <td className="p-3 capitalize">{profile?.role ?? "owner"}</td>
              <td className="p-3">
                <span className="rounded-full bg-[#e5f4eb] text-success px-2 py-1 font-bold text-[10px]">Active</span>
              </td>
            </tr>
            {(accountants || []).map((a) => (
              <tr key={a.id} className="border-t border-[#edf0ee]">
                <td className="p-3 font-semibold">{a.full_name}</td>
                <td className="p-3">{accountantEmails[a.id] ?? "-"}</td>
                <td className="p-3 capitalize">Accountant</td>
                <td className="p-3">
                  <span className="rounded-full bg-[#e5f4eb] text-success px-2 py-1 font-bold text-[10px]">Active</span>
                  <span className="text-[10px] text-muted ml-2">since {formatDate(a.created_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner ? (
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 max-w-xl">
          <h3 className="text-sm font-bold text-navy mb-2">+ Invite Accountant</h3>
          <p className="text-xs text-muted mb-4">
            The Accountant sees only Accounts, Import Statements, Add Entry and their Profile — everything else
            (Investments, Reports, Plans, Insurance/Utilities/Subscriptions, Income Sources) stays hidden and is
            blocked at the database level, not just the menu. They can view and add records but cannot edit or
            delete anything.
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
          <p className="text-xs text-[#394a68]">Only the Owner can invite or manage Accountant access.</p>
        </div>
      )}
    </div>
  );
}
