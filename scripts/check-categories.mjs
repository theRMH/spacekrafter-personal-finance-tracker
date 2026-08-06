import { createClient } from "@supabase/supabase-js";
import ws from "ws";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});
const { data, count } = await admin.from("categories").select("id, group_name, default_personal_or_office", { count: "exact" }).order("group_name");
console.log("Total categories:", count);
console.log(JSON.stringify(data, null, 2));
