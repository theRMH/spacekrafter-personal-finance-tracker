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

// ---- Nav entry present ----
console.log("Nav has 'Income Sources' link:", (await page.locator('a:has-text("Income Sources")').count()) > 0);

// ---- Page loads, empty state ----
await page.goto(BASE + "/income-sources");
await page.waitForLoadState("networkidle");
console.log("Empty state shown initially:", (await page.locator("text=No income sources yet").count()) > 0);
console.log("Add form starts collapsed:", (await page.locator('input[name="name"]').count()) === 0);

// ---- Create an income source ----
await page.click('button:has-text("+ Add income source")');
await page.fill('input[name="name"]', "Test Kodambakkam Rent");
await page.selectOption('select[name="income_type"]', "Rental");
await page.fill('input[name="payer_or_property"]', "Tenant Test");
await page.fill('input[name="expected_amount"]', "25000");
await page.fill('input[name="due_date"]', "2026-08-05");
await page.click('button[type="submit"]:has-text("+ Add income source")');
await page.waitForTimeout(1200);

console.log("Income source created:", (await page.locator("text=Test Kodambakkam Rent").count()) > 0);
console.log("Form collapsed after submit:", (await page.locator('input[name="name"]').count()) === 0);

// ---- Mark received, status shows "Received" not "Paid" ----
const row = page.locator("tr", { hasText: "Test Kodambakkam Rent" });
await row.locator('button:has-text("Mark received")').click();
await page.waitForTimeout(1000);
const statusText = await page.locator("tr", { hasText: "Test Kodambakkam Rent" }).locator("span.capitalize").textContent();
console.log("Status shows 'Received':", statusText.trim() === "Received");

// ---- Reports Commitments tab picks it up (read-path already generic) ----
await page.goto(BASE + "/reports?tab=commitments");
await page.waitForLoadState("networkidle");
const reportsBody = await page.locator("body").textContent();
console.log("Reports Commitments tab shows expected income group:", reportsBody.toLowerCase().includes("expected income"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
