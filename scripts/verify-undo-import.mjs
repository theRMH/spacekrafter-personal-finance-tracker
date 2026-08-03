import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

await page.goto(BASE + "/import");
await page.waitForLoadState("networkidle");
await page.selectOption("select", { label: "HDFC Personal" });

const filePath = path.resolve("C:/Users/Khanna/AppData/Local/Temp/claude/e--RMH-2-Nirmal-Claude-Build-Finance-App-Build-Pack-v1-1/cbdcba5e-c13c-47f1-a52d-ad4e3dc96720/scratchpad/test-undo-import.csv");
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

await page.goto(BASE + "/import");
await page.waitForLoadState("networkidle");
const row = page.locator("tr", { hasText: "test-undo-import.csv" }).first();
console.log("Import batch row visible:", (await row.count()) > 0);

await row.locator('button:has-text("Undo import")').click();
await page.waitForTimeout(2000);

await page.goto(BASE + "/import");
await page.waitForLoadState("networkidle");
console.log("Import batch gone from history after undo:", (await page.locator("text=test-undo-import.csv").count()) === 0);

await browser.close();
