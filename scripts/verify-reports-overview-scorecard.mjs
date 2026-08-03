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
await page.waitForURL("**/dashboard", { timeout: 60000 });

await page.goto(BASE + "/reports?tab=overview");
await page.waitForLoadState("networkidle");

console.log("Hero Net cash flow card present:", (await page.locator("text=Net cash flow").count()) > 0);
const heroValue = await page.locator("div.bg-\\[\\#181E32\\], div.bg-\\[\\#b64b52\\]").first().textContent();
console.log("Hero card text:", heroValue?.trim());

const labels = await page.locator(".text-\\[11px\\].uppercase.tracking-wide.text-muted").allTextContents();
console.log("Small card labels:", labels);

// With a date range applied, deltas should show
await page.fill('input[name="from"]', "2026-07-01");
await page.fill('input[name="to"]', "2026-07-31");
await page.click('button:has-text("Apply")');
await page.waitForLoadState("networkidle");
const pillCount = await page.locator("span.rounded-full.px-2.py-0\\.5").count();
console.log("Delta pills rendered with a date range applied:", pillCount);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
