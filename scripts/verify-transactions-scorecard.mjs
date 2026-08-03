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

await page.goto(BASE + "/transactions");
await page.waitForLoadState("networkidle");

const scoreLabels = await page.locator(".text-\\[11px\\].uppercase.tracking-wide.text-muted").allTextContents();
console.log("Scorecard labels:", scoreLabels);

console.log("Home/Office pill row present:", (await page.locator("text=Home / Office").count()) > 0);
const usagePills = await page.locator("a:has-text('Personal'), a:has-text('Office'), a:has-text('Shared')").allTextContents();
console.log("Usage pill options:", usagePills);

console.log("Old buried Usage <select> removed:", (await page.locator('select[name="usage"]').count()) === 0);

// Click "Office" pill and confirm URL + active state + table filters
await page.click('a:has-text("Office")');
await page.waitForURL("**/transactions?usage=office", { timeout: 15000 });
await page.waitForLoadState("networkidle");
console.log("URL after clicking Office:", page.url());
const officeRows = await page.locator("tbody tr td:nth-child(6)").allTextContents();
console.log("All visible rows are office usage:", officeRows.every((t) => t.trim() === "office"), officeRows);

const officeScorecard = await page.locator(".text-lg.font-extrabold").first().textContent();
console.log("Income (filtered) value with Office pill active:", officeScorecard?.trim());

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
