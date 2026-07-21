import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/login");
await page.fill('input[type="email"]', "owner@spacekrafters.com");
await page.fill('input[type="password"]', "0123456");
await page.click('button:has-text("Sign in")');
await page.waitForURL("**/dashboard");

console.log("Personal Finance items visible initially:", (await page.locator('nav a:has-text("Insurance")').count()) > 0);

// Collapse "Personal Finance"
await page.click('nav button:has-text("Personal Finance")');
await page.waitForTimeout(300);
console.log("Personal Finance items hidden after collapse:", (await page.locator('nav a:has-text("Insurance")').count()) === 0);
console.log("Overview items still visible (other group unaffected):", (await page.locator('nav a:has-text("Dashboard")').count()) > 0);

// Reload — collapsed state should persist via localStorage
await page.reload();
await page.waitForLoadState("networkidle");
console.log("Collapsed state persists after reload:", (await page.locator('nav a:has-text("Insurance")').count()) === 0);

// Expand again
await page.click('nav button:has-text("Personal Finance")');
await page.waitForTimeout(300);
console.log("Personal Finance items visible again after expand:", (await page.locator('nav a:has-text("Insurance")').count()) > 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
