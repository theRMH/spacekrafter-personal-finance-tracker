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

await page.goto(BASE + "/income-sources");
await page.waitForLoadState("networkidle");

console.log("Edit link present:", (await page.locator("text=Edit").count()) > 0);

const row = page.locator("tr", { hasText: "Kodambakkam Flat Rent" });
await row.locator("text=Edit").click();
await page.waitForTimeout(300);

console.log("Edit form opened with name pre-filled:", await page.locator('input[name="name"]').inputValue() === "Kodambakkam Flat Rent");

await page.fill('input[name="expected_amount"]', "25000");
await page.click('button:has-text("Save changes")');
await page.waitForTimeout(1200);

const updatedRow = page.locator("tr", { hasText: "Kodambakkam Flat Rent" });
const bodyText = await updatedRow.textContent();
console.log("Updated amount shows in table (25,000):", bodyText.includes("25,000"));

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
