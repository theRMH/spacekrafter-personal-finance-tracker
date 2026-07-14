import { createClient } from "@/lib/supabase/server";

export default async function UsersAccessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, role, created_at").eq("id", user.id).single()
    : { data: null };

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
              <td className="p-3">{user?.email}</td>
              <td className="p-3 capitalize">{profile?.role ?? "owner"}</td>
              <td className="p-3">
                <span className="rounded-full bg-[#e5f4eb] text-success px-2 py-1 font-bold text-[10px]">Active</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-[#f0f3f8] border border-[#d9e0ec] rounded-2xl p-5 max-w-2xl">
        <h3 className="text-sm font-bold text-navy mb-2">Invite Accountant — coming soon</h3>
        <p className="text-xs text-[#394a68] mb-4">
          Per-user tab visibility, action permissions and selected-account scoping (enforced via Row Level
          Security, not just hidden menus) is a dedicated future milestone. Inviting an Accountant before that
          system exists would let them see all Owner data, which violates the access-privacy rule — so this
          action is disabled until the permission matrix is built.
        </p>
        <button disabled className="bg-navy text-white font-semibold rounded-xl px-4 py-2.5 text-sm opacity-50 cursor-not-allowed">
          + Invite Accountant
        </button>
      </div>
    </div>
  );
}
