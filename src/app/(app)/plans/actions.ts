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

export async function saveCategoryPlans(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const financialYear = Number(formData.get("financial_year"));
  const month = Number(formData.get("month"));

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("category_")) continue;
    const categoryId = key.slice("category_".length);
    const amount = Number(value || 0);

    const { data: existing } = await supabase
      .from("plans")
      .select("id")
      .eq("owner_id", user.id)
      .eq("financial_year", financialYear)
      .eq("month", month)
      .eq("category_id", categoryId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("plans").update({ projected_amount: amount }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("plans").insert({
        owner_id: user.id,
        financial_year: financialYear,
        month,
        plan_type: null,
        category_id: categoryId,
        projected_amount: amount,
      });
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/plans");
}
