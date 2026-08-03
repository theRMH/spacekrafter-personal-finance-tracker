import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard", { timeout: 60000 });

await page.goto(BASE + "/insurance");
await page.waitForLoadState("networkidle");
const dueDateText = await page.locator("tbody tr td").nth(5).textContent();
console.log("Real policy due date:", dueDateText);

// Wide range that should include it
await page.fill('input[name="from"]', "2020-01-01");
await page.fill('input[name="to"]', "2030-01-01");
await page.click('button:has-text("Apply")');
await page.waitForLoadState("networkidle");
const rowsInRange = await page.locator("tbody tr").count();
const hasRealRow = (await page.locator("tbody").textContent()).includes("LIC");
console.log("Wide date range still shows the real policy:", hasRealRow, "| row count:", rowsInRange);

await browser.close();
