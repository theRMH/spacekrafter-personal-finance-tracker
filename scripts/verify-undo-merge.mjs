import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import path from "node:path";

const BASE = "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

// 1. Create a manual provisional entry on HDFC Personal (a bank account -> stays provisional)
await page.goto(BASE + "/add-entry");
await page.waitForLoadState("networkidle");
await page.fill('input[name="transaction_date"]', "2026-08-15");
await page.fill('input[name="amount"]', "777");
await page.selectOption('select[name="account_id"]', { label: "HDFC Personal" });
await page.fill('input[name="payee_payer"]', "Merge Test Original Entry");
await page.click('button:has-text("Save entry")');
await page.waitForTimeout(1500);

const { data: manualTx } = await admin.from("transactions").select("id, status").eq("payee_payer", "Merge Test Original Entry").single();
console.log("Manual entry created, status:", manualTx?.status, "(expect provisional)");

// 2. Import a matching row — should MERGE into it (same amount, same date, within 3 days)
await page.goto(BASE + "/import");
await page.waitForLoadState("networkidle");
await page.selectOption("select", { label: "HDFC Personal" });
const filePath = path.resolve("C:/Users/Khanna/AppData/Local/Temp/claude/e--RMH-2-Nirmal-Claude-Build-Finance-App-Build-Pack-v1-1/cbdcba5e-c13c-47f1-a52d-ad4e3dc96720/scratchpad/test-merge-import.csv");
await page.setInputFiles('input[type="file"]', filePath);
await page.waitForTimeout(500);
const selects = page.locator("select");
await selects.nth(1).selectOption("Date");
await selects.nth(2).selectOption("Narration");
await selects.nth(3).selectOption("Debit");
await selects.nth(4).selectOption("Credit");
await selects.nth(5).selectOption("");
await selects.nth(6).selectOption("Reference");
await page.click('button:has-text("Upload and process")');
await page.waitForTimeout(15000);

const { data: afterImport } = await admin.from("transactions").select("id, status, import_batch_id, source").eq("id", manualTx.id).single();
console.log("After import — status:", afterImport.status, "(expect confirmed), import_batch_id set:", !!afterImport.import_batch_id, ", source:", afterImport.source, "(expect manual)");

// 3. Undo the import
const { data: batch } = await admin.from("import_batches").select("id").eq("file_name", "test-merge-import.csv").single();
await page.goto(BASE + "/import");
await page.waitForLoadState("networkidle");
const row = page.locator("tr", { hasText: "test-merge-import.csv" }).first();
await row.locator('button:has-text("Undo import")').click();
await page.waitForTimeout(2000);

// 4. Confirm the ORIGINAL manual entry was REVERTED, not deleted
const { data: afterUndo } = await admin.from("transactions").select("id, status, import_batch_id").eq("id", manualTx.id).maybeSingle();
console.log("After undo — row still exists (not deleted):", !!afterUndo);
console.log("After undo — status reverted to provisional:", afterUndo?.status === "provisional");
console.log("After undo — import_batch_id cleared:", afterUndo?.import_batch_id === null);

// Cleanup
await admin.from("transactions").delete().eq("id", manualTx.id);
console.log("Cleaned up test transaction");

await browser.close();
