import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const TEST_EMAIL = "test-accountant@spacekrafters.com";
const TEST_PASSWORD = "TestAccountant123!";

// Look up the real owner
const { data: profiles } = await adminClient.from("profiles").select("id").eq("role", "owner").limit(1);
const ownerId = profiles[0].id;
console.log("Owner id:", ownerId);

// Clean up any prior test run
const { data: existingUsers } = await adminClient.auth.admin.listUsers();
const existing = existingUsers.users.find((u) => u.email === TEST_EMAIL);
if (existing) {
  await adminClient.from("profiles").delete().eq("id", existing.id);
  await adminClient.auth.admin.deleteUser(existing.id);
  console.log("Cleaned up prior test accountant");
}

// Create test accountant
const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true,
});
if (createErr) throw createErr;
const accountantId = created.user.id;
console.log("Created test accountant:", accountantId);

const { error: profileErr } = await adminClient.from("profiles").insert({
  id: accountantId,
  full_name: "Test Accountant",
  role: "accountant",
  managed_owner_id: ownerId,
});
if (profileErr) throw profileErr;
console.log("Created accountant profile linked to owner");

// Sign in AS the accountant with the anon key — this is what real RLS enforcement looks like.
const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  realtime: { transport: ws },
});
const { error: signInErr } = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
if (signInErr) throw signInErr;
console.log("Signed in as test accountant");

// 1. Can SELECT owner's accounts
const { data: accounts, error: accErr } = await anonClient.from("accounts").select("id, name");
console.log("Accountant can see accounts:", accounts?.length > 0, accErr?.message || "");

// 2. Can SELECT owner's categories
const { data: cats } = await anonClient.from("categories").select("id, group_name").limit(3);
console.log("Accountant can see categories:", cats?.length > 0);

// 3. Can INSERT a transaction with owner_id = real owner
const { data: newTx, error: insErr } = await anonClient
  .from("transactions")
  .insert({
    owner_id: ownerId,
    transaction_date: "2026-07-21",
    amount: 111,
    type: "expense",
    personal_or_office: "personal",
    account_id: accounts[0].id,
    payee_payer: "RLS Test Insert",
    status: "provisional",
    source: "manual",
  })
  .select()
  .single();
console.log("Accountant can INSERT a transaction:", !insErr, insErr?.message || "");

// 4. Cannot UPDATE that same transaction
if (newTx) {
  const { error: updErr } = await anonClient.from("transactions").update({ amount: 999 }).eq("id", newTx.id);
  console.log("Accountant CANNOT update (expected error/no-op):", !!updErr || "check row unchanged");
  const { data: recheck } = await adminClient.from("transactions").select("amount").eq("id", newTx.id).single();
  console.log("Amount unchanged after blocked update attempt:", Number(recheck.amount) === 111);
}

// 5. Cannot DELETE
if (newTx) {
  const { error: delErr } = await anonClient.from("transactions").delete().eq("id", newTx.id);
  const { data: stillThere } = await adminClient.from("transactions").select("id").eq("id", newTx.id).maybeSingle();
  console.log("Accountant CANNOT delete (row still exists):", !!stillThere);
}

// 6. Cannot see investments (should be empty, not an error)
const { data: investments, error: invErr } = await anonClient.from("investments").select("id");
console.log("Accountant sees ZERO investments (blocked by RLS):", (investments?.length ?? 0) === 0, invErr?.message || "");

// 7. Cannot see plans
const { data: plans } = await anonClient.from("plans").select("id");
console.log("Accountant sees ZERO plans (blocked by RLS):", (plans?.length ?? 0) === 0);

// 8. Cannot see commitments (insurance/utilities/subscriptions/income sources)
const { data: commitments } = await anonClient.from("commitments").select("id");
console.log("Accountant sees ZERO commitments (blocked by RLS):", (commitments?.length ?? 0) === 0);

// 9. Owner (service role) can see this accountant in their profile list
const { data: managedProfiles } = await adminClient.from("profiles").select("id, full_name, role").eq("managed_owner_id", ownerId);
console.log("Owner's managed accountants list includes test accountant:", managedProfiles.some((p) => p.id === accountantId));

// Cleanup
if (newTx) await adminClient.from("transactions").delete().eq("id", newTx.id);
await adminClient.from("profiles").delete().eq("id", accountantId);
await adminClient.auth.admin.deleteUser(accountantId);
console.log("Cleaned up test accountant");
