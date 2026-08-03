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

await page.goto(BASE + "/add-entry");
await page.waitForLoadState("networkidle");

const typeOptions = await page.locator('select[name="type"] option').allTextContents();
console.log("Type options:", typeOptions);
console.log("Transfer removed:", !typeOptions.includes("Transfer"));

const usageOptions = await page.locator('select[name="personal_or_office"] option').allTextContents();
console.log("Usage options:", usageOptions);
console.log("Shared removed:", !usageOptions.includes("Shared"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
