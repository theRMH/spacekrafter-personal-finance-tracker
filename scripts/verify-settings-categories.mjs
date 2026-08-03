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

await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");

const panel = page.locator("section", { has: page.locator("h3", { hasText: "Categories" }) }).first();

console.log("Category count summary shown:", (await page.locator("text=/categories ·/").count()) > 0);
console.log("Subcategories collapsed by default (not visible in panel):", (await panel.locator("text=Meat / Non-Veg").count()) === 0);

// Expand a category
await panel.locator('button:has-text("Home - Groceries and Food")').click();
await page.waitForTimeout(300);
console.log("Subcategory visible in panel after expanding its category:", (await panel.locator("text=Meat / Non-Veg").count()) > 0);

// Search filters and auto-expands
await page.goto(BASE + "/settings");
await page.waitForLoadState("networkidle");
await page.fill('input[type="search"]', "Meat");
await page.waitForTimeout(300);
const panel2 = page.locator("section", { has: page.locator("h3", { hasText: "Categories" }) }).first();
console.log("Search auto-shows matching subcategory in panel:", (await panel2.locator("text=Meat / Non-Veg").count()) > 0);
console.log("Search hides non-matching categories in panel:", (await panel2.locator("text=Home - Housing").count()) === 0);

console.log("Console errors:", errors.length ? errors : "none");
await browser.close();
