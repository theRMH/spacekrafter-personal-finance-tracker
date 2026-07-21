import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

await page.goto(BASE + "/subscriptions");
await page.waitForLoadState("networkidle");

const row = page.locator("tr", { hasText: "Netflix" });
console.log("Edit button present:", (await row.locator("text=Edit").count()) > 0);
console.log("Cancel button present (status=paid, not cancelled):", (await row.locator("text=Cancel").count()) > 0);
console.log("Mark paid NOT present (already paid):", (await row.locator("text=Mark paid").count()) === 0);

await browser.close();
