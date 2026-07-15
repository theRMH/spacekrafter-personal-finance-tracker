import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { updateProfileName, changePassword } from "./actions";

export default async function ProfilePage() {
  const supabase = createClient();
  // Middleware already verified this user and forwards the id/email — skip a second
  // round trip to Supabase Auth just to re-derive it on every page load.
  const userId = headers().get("x-user-id");
  const userEmail = headers().get("x-user-email");
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, role, created_at").eq("id", userId).single()
    : { data: null };

  const initials = (profile?.full_name || "Owner")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Profile</h1>
      <p className="text-sm text-muted mt-1 mb-6">Your account details — loaded from the currently authenticated user</p>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6 text-center h-fit">
          <div className="w-20 h-20 rounded-full bg-success grid place-items-center font-bold text-2xl mx-auto mb-3">{initials}</div>
          <h3 className="font-bold text-navy">{profile?.full_name}</h3>
          <p className="text-xs text-muted mt-1">{userEmail}</p>
          <span className="inline-block mt-3 rounded-full bg-[#edf1f7] text-info px-3 py-1 text-[11px] font-bold capitalize">
            {profile?.role ?? "owner"}
          </span>
        </div>

        <div className="grid gap-6">
          <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
            <h3 className="text-sm font-bold text-navy mb-4">Edit profile</h3>
            <form action={updateProfileName} className="grid gap-4 max-w-sm">
              <div>
                <label className="block text-xs text-muted mb-1.5">Full name</label>
                <input name="full_name" defaultValue={profile?.full_name} required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Email</label>
                <input value={userEmail ?? ""} disabled className="w-full border border-[#e3ddd7] rounded-xl p-2.5 bg-[#faf9f7] text-muted" />
              </div>
              <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">Save</button>
            </form>
          </div>

          <div className="bg-white border border-[#e3ddd7] rounded-card shadow-sm p-6">
            <h3 className="text-sm font-bold text-navy mb-4">Change password</h3>
            <form action={changePassword} className="grid gap-4 max-w-sm">
              <div>
                <label className="block text-xs text-muted mb-1.5">Current password</label>
                <input name="current_password" type="password" required className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">New password</label>
                <input name="new_password" type="password" required minLength={6} className="w-full border border-[#e3ddd7] rounded-xl p-2.5" />
              </div>
              <button type="submit" className="bg-navy text-white font-semibold rounded-xl py-2.5 text-sm">Change password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
