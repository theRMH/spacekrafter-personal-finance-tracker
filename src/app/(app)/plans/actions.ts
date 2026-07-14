"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePlans(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const financialYear = Number(formData.get("financial_year"));
  const month = Number(formData.get("month"));
  const planTypes = ["personal_income", "business_income", "home_expense", "office_expense", "investment"];

  for (const planType of planTypes) {
    const amount = Number(formData.get(planType) || 0);
    const { error } = await supabase.from("plans").upsert(
      { owner_id: user.id, financial_year: financialYear, month, plan_type: planType, projected_amount: amount },
      { onConflict: "owner_id,financial_year,month,plan_type" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/plans");
}
