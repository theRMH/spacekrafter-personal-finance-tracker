import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

await page.goto(BASE + "/transactions");
await page.waitForLoadState("networkidle");
console.log("Mode column header present:", (await page.locator("th", { hasText: "Mode" }).count()) > 0);
console.log("UPI shown in a row:", (await page.locator("td", { hasText: "UPI" }).count()) > 0);
console.log("NEFT shown in a row:", (await page.locator("td", { hasText: "NEFT" }).count()) > 0);

await browser.close();
